"""
app/routes/fairness.py

Fairness scoring route.

POST /api/fairness/score/{contract_id}
    Compute (or recompute) the fairness score for a contract using the
    intent-driven fairness engine and return a detailed breakdown.

This route does NOT call MarketCheck — use POST /api/market/enrich/{id} for
the full pipeline. Here we score based purely on contract terms vs benchmarks.

Fix: _sla_to_negotiation_dict now maps ALL ContractSLA schema fields
     (was missing moneyFactor, msrp, dispositionFee, capCostReduction etc.)
     so fairness scores match exactly what /market/enrich produces.
"""

from __future__ import annotations

import json
import logging
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.database import get_db
from app.core.fairness import calculate_fairness_score
from app.core.negotiation_rules import NegotiationRules

logger = logging.getLogger(__name__)
router = APIRouter()


# ── response schema ─────────────────────────────────────────────────────────────

class FairnessScoreResponse(BaseModel):
    contract_id:         str
    final_score:         float
    rating:              str
    price_score:         float
    apr_score:           float
    fees_score:          float
    term_score:          float
    red_flags:           list
    warnings:            list
    recommendations:     list
    negotiation_intents: list


# ── helpers ─────────────────────────────────────────────────────────────────────

def _to_float(value) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _sla_to_negotiation_dict(sla) -> dict:
    """
    Map Prisma ContractSLA → NegotiationRules input dict.
    Maps ALL schema fields — identical to market.py so scores never drift.
    """
    if not sla:
        return {}

    def pct_str(v) -> Optional[str]:
        f = _to_float(v)
        return f"{f}%" if f is not None else None

    return {
        # ── financial terms ────────────────────────────────────────────────────
        "interest_rate":          pct_str(sla.aprPercent),
        "money_factor":           _to_float(sla.moneyFactor),
        "monthly_payment":        _to_float(sla.monthlyPayment),
        "down_payment":           _to_float(sla.downPayment),
        "fees_total":             _to_float(sla.feesTotal),
        "lease_term_months":      sla.termMonths,

        # ── vehicle pricing ────────────────────────────────────────────────────
        "msrp":                   _to_float(sla.msrp),
        "dealer_price":           _to_float(sla.capCost) or _to_float(sla.dealerPrice),
        "cap_cost_reduction":     _to_float(sla.capCostReduction),

        # ── residual ──────────────────────────────────────────────────────────
        "residual_value":         _to_float(sla.residualValue),
        "residual_percent_msrp":  _to_float(sla.residualPercentMsrp),

        # ── mileage ───────────────────────────────────────────────────────────
        "mileage_allowance":      sla.mileageAllowanceYr,
        "overage_charge":         _to_float(sla.mileageOverageFee),

        # ── fees ──────────────────────────────────────────────────────────────
        "early_termination_fee":  _to_float(sla.earlyTerminationFee),
        "disposition_fee":        _to_float(sla.dispositionFee),
        "purchase_option_price":  _to_float(sla.purchaseOptionPrice),

        # ── policies (text fields) ────────────────────────────────────────────
        "late_fee":               sla.lateFeePolicy,
        "insurance_requirements": sla.insuranceRequirements,
        "maintenance_resp":       sla.maintenanceResp,
        "warranty_summary":       sla.warrantySummary,
    }


def _rating_from_score(score: float) -> str:
    """
    Convert numeric score to human-readable rating label.

    Thresholds:
      85–100 → Excellent
      70–84  → Good
      55–69  → Fair
      40–54  → Poor
      0–39   → Very Poor
    """
    if score >= 85:
        return "Excellent"
    elif score >= 70:
        return "Good"
    elif score >= 55:
        return "Fair"
    elif score >= 40:
        return "Poor"
    return "Very Poor"


# ── route ───────────────────────────────────────────────────────────────────────

@router.post(
    "/score/{contract_id}",
    response_model=FairnessScoreResponse,
    summary="Calculate intent-driven fairness score for a contract",
)
async def score_contract_fairness(
    contract_id: str,
    db=Depends(get_db),
):
    """
    Calculate fairness score using:
    1. NegotiationRules intent engine → score + red flags + recommendations
    2. calculate_fairness_score()     → weighted sub-scores (spec-aligned)

    Blended final = intent_score × 0.60 + breakdown_score × 0.40

    Saves fairnessScore + redFlagLevel + negotiationIntents to Contract row.
    """
    # ── 1. Load contract + SLA ───────────────────────────────────────────────────
    contract = await db.contract.find_unique(
        where={"id": contract_id},
        include={"sla": True, "vehicle": True},
    )

    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    if not contract.sla:
        raise HTTPException(
            status_code=400,
            detail="No SLA data. Run /extract-sla/{contract_id} first.",
        )

    sla_dict = _sla_to_negotiation_dict(contract.sla)   # ✅ now full schema

    vehicle_dict = (
        {
            "vin":   contract.vehicle.vin,
            "year":  contract.vehicle.year,
            "make":  contract.vehicle.make,
            "model": contract.vehicle.model,
            "trim":  contract.vehicle.trim,
        }
        if contract.vehicle
        else None
    )

    # ── 2. Pull stored market price (set by /market/enrich if run previously) ────
    predicted_price: Optional[float] = None
    if contract.sla.otherTerms:
        try:
            raw    = contract.sla.otherTerms
            parsed = raw if isinstance(raw, dict) else json.loads(raw)
            market_blob     = parsed.get("__market__", {})
            predicted_price = market_blob.get("market_price")
            logger.info(
                "💰 [score_contract_fairness] Loaded stored market price: %s",
                predicted_price,
            )
        except Exception as exc:
            logger.warning("score_contract_fairness: failed to parse otherTerms — %s", exc)

    # ── 3. NegotiationRules intent analysis ──────────────────────────────────────
    analysis = NegotiationRules.analyze_contract(
        sla_data=sla_dict,
        vehicle_data=vehicle_dict,
        user_income=None,
    )

    logger.info(
        "🔍 [score_contract_fairness] Intent analysis → fairness_score=%.1f | rating=%s | intents=%d",
        analysis.get("fairness_score", 50.0),
        analysis.get("rating", "N/A"),
        len(analysis.get("negotiation_intents", [])),
    )

    # ── 4. Weighted sub-score breakdown (spec-aligned) ───────────────────────────
    breakdown = calculate_fairness_score(
        dealer_price=sla_dict.get("dealer_price"),
        market_price=predicted_price,
        apr=_to_float(contract.sla.aprPercent),
        fees=sla_dict.get("fees_total"),
        term=contract.sla.termMonths,
    )

    logger.info(
        "📊 [score_contract_fairness] Breakdown → price=%.1f | apr=%.1f | fees=%.1f | term=%.1f | weighted=%.1f",
        breakdown["price_score"],
        breakdown["apr_score"],
        breakdown["fees_score"],
        breakdown["term_score"],
        breakdown["final_score"],
    )

    # ── 5. Blend intent score (60%) + weighted breakdown (40%) ───────────────────
    intent_score  = analysis.get("fairness_score", 50.0)
    blended_score = round(intent_score * 0.60 + breakdown["final_score"] * 0.40, 2)
    rating        = _rating_from_score(blended_score)

    logger.info(
        "✅ [score_contract_fairness] Blended → intent=%.1f × 0.6 + breakdown=%.1f × 0.4 = %.2f | rating=%s",
        intent_score, breakdown["final_score"], blended_score, rating,
    )

    # ── 6. Persist to DB ─────────────────────────────────────────────────────────
    await db.contract.update(
        where={"id": contract_id},
        data={
            "fairnessScore":      Decimal(str(blended_score)),
            "redFlagLevel":       rating,
            "negotiationIntents": json.dumps(analysis["negotiation_intents"]),
        },
    )

    # ── 7. Return response ───────────────────────────────────────────────────────
    return FairnessScoreResponse(
        contract_id=contract_id,
        final_score=blended_score,
        rating=rating,
        price_score=breakdown["price_score"],
        apr_score=breakdown["apr_score"],
        fees_score=breakdown["fees_score"],
        term_score=breakdown["term_score"],
        red_flags=analysis.get("red_flags", []),
        warnings=analysis.get("warnings", []),
        recommendations=analysis.get("recommendations", []),
        negotiation_intents=analysis.get("negotiation_intents", []),
    )