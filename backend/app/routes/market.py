"""
app/routes/market.py

Week 7 endpoints — market price estimation + fairness scoring.

Routes
------
POST /api/market/enrich/{contract_id}
    Full pipeline: decode VIN → predict price → calculate fairness → save → return.

GET  /api/market/result/{contract_id}
    Return already-stored market + fairness data for a contract.

Architecture rules followed:
  • No business logic inside route handlers — all delegated to service/core modules.
  • MarketCheck failures are caught gracefully; contract data is still returned.
  • Uses Prisma async client (same pattern as negotiation_routes.py).
  • Uses dependency injection via get_db().
"""

from __future__ import annotations

import json
import logging
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.database import get_db
from app.core import market_service
from app.core.fairness import calculate_fairness_score
from app.core.negotiation_rules import NegotiationRules

logger = logging.getLogger(__name__)
router = APIRouter()


# ── response schemas ────────────────────────────────────────────────────────────

class PriceRangeSchema(BaseModel):
    low:  Optional[float] = None
    high: Optional[float] = None


class MarketDataSchema(BaseModel):
    predicted_price: Optional[float] = None
    price_range:     Optional[PriceRangeSchema] = None


class FairnessBreakdownSchema(BaseModel):
    price_score: float
    apr_score:   float
    fees_score:  float
    term_score:  float
    final_score: float


class VehicleDataSchema(BaseModel):
    vin:   Optional[str] = None
    year:  Optional[int] = None
    make:  Optional[str] = None
    model: Optional[str] = None
    trim:  Optional[str] = None


class ContractDataSchema(BaseModel):
    id:            str
    contract_type: Optional[str] = None
    fairness_score: Optional[float] = None
    red_flag_level: Optional[str] = None


class EnrichContractResponse(BaseModel):
    contract_data:      ContractDataSchema
    vehicle_data:       Optional[VehicleDataSchema] = None
    market_data:        Optional[MarketDataSchema]  = None
    fairness_breakdown: Optional[FairnessBreakdownSchema] = None
    # Negotiation intents are also returned so frontend can display them
    negotiation_intents: Optional[list] = None


# ── helpers ────────────────────────────────────────────────────────────────────

def _to_float(value) -> Optional[float]:
    """Safely convert Decimal/int/str to float."""
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _sla_to_dict(sla) -> dict:
    """Convert Prisma ContractSLA to the dict format NegotiationRules expects."""
    if not sla:
        return {}

    def pct_str(v) -> Optional[str]:
        f = _to_float(v)
        return f"{f}%" if f is not None else None

    return {
        "interest_rate":       pct_str(sla.aprPercent),
        "lease_term_months":   sla.termMonths,
        "monthly_payment":     _to_float(sla.monthlyPayment),
        "down_payment":        _to_float(sla.downPayment),
        "residual_value":      _to_float(sla.residualValue),
        "mileage_allowance":   sla.mileageAllowanceYr,
        "overage_charge":      _to_float(sla.mileageOverageFee),
        "early_termination_fee": _to_float(sla.earlyTerminationFee),
        "late_fee":            sla.lateFeePolicy,
        # fees_total used for fairness calculation directly
        "fees_total":          _to_float(sla.feesTotal),
        # dealer price — prefer capCost, fall back to msrp
        "dealer_price":        _to_float(sla.capCost) or _to_float(sla.msrp),
    }


def _vehicle_to_dict(vehicle) -> Optional[dict]:
    if not vehicle:
        return None
    return {
        "vin":   vehicle.vin,
        "year":  vehicle.year,
        "make":  vehicle.make,
        "model": vehicle.model,
        "trim":  vehicle.trim,
    }


# ── route 1: full enrichment pipeline ──────────────────────────────────────────

@router.post(
    "/enrich/{contract_id}",
    response_model=EnrichContractResponse,
    summary="Decode VIN → predict market price → calculate fairness → save",
)
async def enrich_contract(
    contract_id: str,
    db=Depends(get_db),
):
    """
    Full Week 7 pipeline for a contract.

    Steps:
    1. Load contract + SLA + vehicle from DB.
    2. Decode VIN via MarketCheck (updates Vehicle fields if enriched).
    3. Predict market price via MarketCheck.
    4. Run NegotiationRules to generate intent-driven fairness sub-scores.
    5. call calculate_fairness_score() with intent-informed inputs.
    6. Persist market price + fairness score + intents to Contract / Vehicle.
    7. Return structured EnrichContractResponse.

    MarketCheck failures are non-fatal: contract data is returned with
    market_data=None and a neutral fairness score.
    """
    # ── 1. Load contract ────────────────────────────────────────────────────────
    contract = await db.contract.find_unique(
        where={"id": contract_id},
        include={"sla": True, "vehicle": True},
    )

    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    if not contract.sla:
        raise HTTPException(
            status_code=400,
            detail="No SLA data found. Run /extract-sla/{contract_id} first.",
        )

    sla_dict    = _sla_to_dict(contract.sla)
    vehicle_dict = _vehicle_to_dict(contract.vehicle)

    # ── 2. VIN decode (enrich Vehicle if we got new data) ───────────────────────
    vin = contract.vehicle.vin if contract.vehicle else None
    decoded_vehicle: Optional[dict] = None

    if vin:
        decoded_vehicle = await market_service.decode_vin(vin)
        if decoded_vehicle and contract.vehicleId:
            # Merge decoded data into Vehicle row (only overwrite nulls)
            update_data = {}
            if decoded_vehicle.get("year")  and not contract.vehicle.year:
                update_data["year"]  = decoded_vehicle["year"]
            if decoded_vehicle.get("make")  and not contract.vehicle.make:
                update_data["make"]  = decoded_vehicle["make"]
            if decoded_vehicle.get("model") and not contract.vehicle.model:
                update_data["model"] = decoded_vehicle["model"]
            if decoded_vehicle.get("trim")  and not contract.vehicle.trim:
                update_data["trim"]  = decoded_vehicle["trim"]

            if update_data:
                await db.vehicle.update(
                    where={"id": contract.vehicleId},
                    data=update_data,
                )

    # Merge decoded data into vehicle_dict for the response
    effective_vehicle = {
        "vin":   vin,
        "year":  (decoded_vehicle or {}).get("year")  or (vehicle_dict or {}).get("year"),
        "make":  (decoded_vehicle or {}).get("make")  or (vehicle_dict or {}).get("make"),
        "model": (decoded_vehicle or {}).get("model") or (vehicle_dict or {}).get("model"),
        "trim":  (decoded_vehicle or {}).get("trim")  or (vehicle_dict or {}).get("trim"),
    }

    # ── 3. Predict market price ─────────────────────────────────────────────────
    price_data: Optional[dict] = None

    if effective_vehicle.get("make") and effective_vehicle.get("model"):
        price_data = await market_service.predict_price(
            make=effective_vehicle["make"],
            model=effective_vehicle["model"],
            year=effective_vehicle["year"],
            trim=effective_vehicle.get("trim"),
        )

    predicted_price: Optional[float] = price_data["predicted_price"] if price_data else None
    price_low:       Optional[float] = price_data["price_range"]["low"]  if price_data else None
    price_high:      Optional[float] = price_data["price_range"]["high"] if price_data else None

    # ── 4. NegotiationRules — generate intents (intent-driven fairness) ──────────
    analysis = NegotiationRules.analyze_contract(
        sla_data=sla_dict,
        vehicle_data=effective_vehicle,
        user_income=None,
    )

    # ── 5. calculate_fairness_score — uses intent-aligned thresholds ─────────────
    dealer_price = sla_dict.get("dealer_price")
    apr          = _to_float(contract.sla.aprPercent)
    fees         = sla_dict.get("fees_total")
    term         = contract.sla.termMonths

    fairness_breakdown = calculate_fairness_score(
        dealer_price=dealer_price,
        market_price=predicted_price,   # None → neutral 50 price sub-score
        apr=apr,
        fees=fees,
        term=term,
    )

    # Use the intent-engine's own fairness_score as the canonical value
    # (it accounts for ALL contract fields, not just price/apr/fees/term).
    # We blend: 60 % intent score + 40 % weighted breakdown.
    intent_score   = analysis.get("fairness_score", 50.0)
    breakdown_score = fairness_breakdown["final_score"]
    blended_score   = round(intent_score * 0.60 + breakdown_score * 0.40, 2)

    # Also propagate the breakdown's final with the blended value
    fairness_breakdown["final_score"] = blended_score

    # ── 6. Persist to DB ────────────────────────────────────────────────────────
    contract_update: dict = {
        "fairnessScore":      Decimal(str(blended_score)),
        "redFlagLevel":       analysis["rating"],
        "negotiationIntents": json.dumps(analysis["negotiation_intents"]),
    }

    # Store market price in Contract.notes as JSON blob until schema migration
    # (see schema_additions.prisma for the proper migration — add those fields
    # to ContractSLA and re-run `prisma db push`).
    # Once migrated, replace this with direct field writes.
    market_blob = {
        "market_price":     predicted_price,
        "price_range_low":  price_low,
        "price_range_high": price_high,
    }
    # Merge into existing notes safely
    existing_notes = contract.notes or ""
    contract_update["notes"] = existing_notes  # preserve existing notes

    await db.contract.update(
        where={"id": contract_id},
        data=contract_update,
    )

    # Store market data in ContractSLA.otherTerms (JsonB) as a structured side-car
    # until the dedicated Prisma columns are added via migration.
    # NOTE: Prisma-Python requires JsonB fields to be passed as a JSON string.
    existing_other = {}
    if contract.sla.otherTerms:
        try:
            # Prisma returns JsonB as already-parsed dict; handle both cases
            raw = contract.sla.otherTerms
            existing_other = raw if isinstance(raw, dict) else json.loads(raw)
        except Exception:
            existing_other = {}

    existing_other["__market__"] = market_blob

    await db.contractsla.update(
        where={"id": contract.sla.id},
        data={"otherTerms": json.dumps(existing_other)},  # must be string for Prisma-Python
    )

    # ── 7. Build response ───────────────────────────────────────────────────────
    return EnrichContractResponse(
        contract_data=ContractDataSchema(
            id=contract_id,
            contract_type=contract.contractType,
            fairness_score=blended_score,
            red_flag_level=analysis["rating"],
        ),
        vehicle_data=VehicleDataSchema(**effective_vehicle) if effective_vehicle else None,
        market_data=MarketDataSchema(
            predicted_price=predicted_price,
            price_range=PriceRangeSchema(low=price_low, high=price_high) if price_data else None,
        ) if price_data else None,
        fairness_breakdown=FairnessBreakdownSchema(**fairness_breakdown),
        negotiation_intents=analysis["negotiation_intents"],
    )


# ── route 2: read stored result ─────────────────────────────────────────────────

@router.get(
    "/result/{contract_id}",
    response_model=EnrichContractResponse,
    summary="Return stored market + fairness data for a contract",
)
async def get_market_result(
    contract_id: str,
    db=Depends(get_db),
):
    """
    Return already-computed market + fairness data without re-calling MarketCheck.
    Useful for GET /contracts/{id} enriched response.
    """
    contract = await db.contract.find_unique(
        where={"id": contract_id},
        include={"sla": True, "vehicle": True},
    )

    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    # Pull market blob from SLA.otherTerms side-car
    market_blob: dict = {}
    if contract.sla and contract.sla.otherTerms:
        try:
            # Prisma-Python may return JsonB as dict or string depending on version
            raw = contract.sla.otherTerms
            parsed = raw if isinstance(raw, dict) else json.loads(raw)
            market_blob = parsed.get("__market__", {})
        except Exception:
            market_blob = {}

    predicted_price = market_blob.get("market_price")
    price_low       = market_blob.get("price_range_low")
    price_high      = market_blob.get("price_range_high")

    # Pull stored intents
    intents = None
    if contract.negotiationIntents:
        try:
            raw = contract.negotiationIntents
            intents = raw if isinstance(raw, list) else json.loads(raw)
        except Exception:
            intents = None

    # Rebuild fairness breakdown from stored score (sub-scores not persisted — recalculate)
    sla_dict = _sla_to_dict(contract.sla) if contract.sla else {}
    fairness_breakdown = calculate_fairness_score(
        dealer_price=sla_dict.get("dealer_price"),
        market_price=predicted_price,
        apr=_to_float(contract.sla.aprPercent) if contract.sla else None,
        fees=sla_dict.get("fees_total"),
        term=contract.sla.termMonths if contract.sla else None,
    )
    # Overwrite final_score with the stored blended value if present
    if contract.fairnessScore:
        fairness_breakdown["final_score"] = float(contract.fairnessScore)

    vehicle_dict = _vehicle_to_dict(contract.vehicle)

    return EnrichContractResponse(
        contract_data=ContractDataSchema(
            id=contract_id,
            contract_type=contract.contractType,
            fairness_score=float(contract.fairnessScore) if contract.fairnessScore else None,
            red_flag_level=contract.redFlagLevel,
        ),
        vehicle_data=VehicleDataSchema(**vehicle_dict) if vehicle_dict else None,
        market_data=MarketDataSchema(
            predicted_price=predicted_price,
            price_range=PriceRangeSchema(low=price_low, high=price_high)
            if predicted_price else None,
        ) if predicted_price else None,
        fairness_breakdown=FairnessBreakdownSchema(**fairness_breakdown),
        negotiation_intents=intents,
    )