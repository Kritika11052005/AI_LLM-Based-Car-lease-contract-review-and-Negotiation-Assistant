"""
app/routes/fairness.py

Fairness scoring route.

POST /api/fairness/score/{contract_id}
    Compute (or recompute) the fairness score for a contract using the
    intent-driven fairness engine and return a detailed breakdown.

This route does NOT call MarketCheck — use POST /api/market/enrich/{id} for
the full pipeline.  Here we score based purely on contract terms vs benchmarks.
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
    contract_id:    str
    final_score:    float
    rating:         str
    price_score:    float
    apr_score:      float
    fees_score:     float
    term_score:     float
    red_flags:      list
    warnings:       list
    recommendations: list
    negotiation_intents: list


# ── helpers (duplicated minimally from market.py to keep route self-contained) ──

def _to_float(value) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _sla_to_negotiation_dict(sla) -> dict:
    """Map Prisma ContractSLA → NegotiationRules input dict."""
    if not sla:
        return {}

    def pct_str(v) -> Optional[str]:
        f = _to_float(v)
        return f"{f}%" if f is not None else None

    return {
        "interest_rate":         pct_str(sla.aprPercent),
        "lease_term_months":     sla.termMonths,
        "monthly_payment":       _to_float(sla.monthlyPayment),
        "down_payment":          _to_float(sla.downPayment),
        "residual_value":        _to_float(sla.residualValue),
        "mileage_allowance":     sla.mileageAllowanceYr,
        "overage_charge":        _to_float(sla.mileageOverageFee),
        "early_termination_fee": _to_float(sla.earlyTerminationFee),
        "late_fee":              sla.lateFeePolicy,
        "fees_total":            _to_float(sla.feesTotal),
        "dealer_price":          _to_float(sla.capCost) or _to_float(sla.msrp),
    }


def _rating_from_score(score: float) -> str:
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
    2. calculate_fairness_score()     → weighted sub-scores

    Saves fairnessScore + redFlagLevel + negotiationIntents to Contract row.
    """
    # Load contract + SLA
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

    sla_dict = _sla_to_negotiation_dict(contract.sla)
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

    # ── NegotiationRules intent analysis ────────────────────────────────────────
    analysis = NegotiationRules.analyze_contract(
        sla_data=sla_dict,
        vehicle_data=vehicle_dict,
        user_income=None,
    )

    # ── Weighted sub-score breakdown ─────────────────────────────────────────────
    # Pull market price from SLA.otherTerms if a previous /enrich call stored it
    predicted_price: Optional[float] = None
    if contract.sla.otherTerms:
        try:
            raw = contract.sla.otherTerms
            parsed = raw if isinstance(raw, dict) else json.loads(raw)
            market_blob = parsed.get("__market__", {})
            predicted_price = market_blob.get("market_price")
        except Exception:
            pass

    breakdown = calculate_fairness_score(
        dealer_price=sla_dict.get("dealer_price"),
        market_price=predicted_price,
        apr=_to_float(contract.sla.aprPercent),
        fees=sla_dict.get("fees_total"),
        term=contract.sla.termMonths,
    )

    # Blend intent score (60 %) with weighted breakdown (40 %)
    intent_score    = analysis.get("fairness_score", 50.0)
    blended_score   = round(intent_score * 0.60 + breakdown["final_score"] * 0.40, 2)
    rating          = _rating_from_score(blended_score)

    # ── Persist ──────────────────────────────────────────────────────────────────
    await db.contract.update(
        where={"id": contract_id},
        data={
            "fairnessScore":      Decimal(str(blended_score)),
            "redFlagLevel":       rating,
            "negotiationIntents": json.dumps(analysis["negotiation_intents"]),
        },
    )

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