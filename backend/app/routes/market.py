"""
app/routes/market.py

Week 7 endpoints — market price estimation + fairness scoring.

Routes
------
POST /api/market/enrich/{contract_id}
    Full pipeline: decode VIN → fetch real market average → calculate fairness → save → return.

GET  /api/market/result/{contract_id}
    Return already-stored market + fairness data for a contract.
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
    predicted_price:  Optional[float] = None
    price_range:      Optional[PriceRangeSchema] = None
    listings_sampled: Optional[int]   = None   # ✅ NEW: how many real listings used
    listings_found:   Optional[int]   = None   # ✅ NEW: total found on MarketCheck
    source:           Optional[str]   = None   # ✅ NEW: "active_listings" | None


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
    id:             str
    contract_type:  Optional[str]   = None
    fairness_score: Optional[float] = None
    red_flag_level: Optional[str]   = None


class EnrichContractResponse(BaseModel):
    contract_data:       ContractDataSchema
    vehicle_data:        Optional[VehicleDataSchema]      = None
    market_data:         Optional[MarketDataSchema]       = None
    fairness_breakdown:  Optional[FairnessBreakdownSchema] = None
    negotiation_intents: Optional[list]                   = None


# ── helpers ────────────────────────────────────────────────────────────────────

def _to_float(value) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _sla_to_dict(sla) -> dict:
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
        # ✅ odometer reading from SLA — used to find comparable listings
        "odometer":              _to_float(sla.odometerReading) if hasattr(sla, "odometerReading") else None,
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
    summary="Decode VIN → fetch real market listings → calculate fairness → save",
)
async def enrich_contract(
    contract_id: str,
    db=Depends(get_db),
):
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

    sla_dict     = _sla_to_dict(contract.sla)
    vehicle_dict = _vehicle_to_dict(contract.vehicle)

    # ── 2. VIN decode ───────────────────────────────────────────────────────────
    vin = contract.vehicle.vin if contract.vehicle else None
    decoded_vehicle: Optional[dict] = None

    if vin:
        decoded_vehicle = await market_service.decode_vin(vin)
        if decoded_vehicle and contract.vehicleId:
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

    effective_vehicle = {
        "vin":   vin,
        "year":  (decoded_vehicle or {}).get("year")  or (vehicle_dict or {}).get("year"),
        "make":  (decoded_vehicle or {}).get("make")  or (vehicle_dict or {}).get("make"),
        "model": (decoded_vehicle or {}).get("model") or (vehicle_dict or {}).get("model"),
        "trim":  (decoded_vehicle or {}).get("trim")  or (vehicle_dict or {}).get("trim"),
    }

    # ── 3. Fetch REAL market average from active listings ───────────────────────
    #
    # ✅ Use contract odometer as the miles reference so MarketCheck returns
    #    comparable listings (same mileage band). Fallback to 50k if unknown.
    #
    contract_miles = int(sla_dict.get("odometer") or 50_000)

    price_data: Optional[dict] = None

    if effective_vehicle.get("make") and effective_vehicle.get("model"):
        logger.info(
            "🚗 [enrich_contract] Fetching market average for %s %s %s | miles: %s",
            effective_vehicle.get("year"),
            effective_vehicle.get("make"),
            effective_vehicle.get("model"),
            contract_miles,
        )
        price_data = await market_service.get_market_average(   # ✅ real listings
            make=effective_vehicle["make"],
            model=effective_vehicle["model"],
            year=effective_vehicle.get("year"),
            trim=effective_vehicle.get("trim"),
            miles=contract_miles,
        )

    predicted_price: Optional[float] = price_data["predicted_price"] if price_data else None
    price_low:       Optional[float] = price_data["price_range"]["low"]  if price_data else None
    price_high:      Optional[float] = price_data["price_range"]["high"] if price_data else None

    logger.info(
        "💰 [enrich_contract] Market result → avg: %s | low: %s | high: %s | listings: %s",
        predicted_price, price_low, price_high,
        price_data.get("listings_sampled") if price_data else 0,
    )

    # ── 4. NegotiationRules ─────────────────────────────────────────────────────
    analysis = NegotiationRules.analyze_contract(
        sla_data=sla_dict,
        vehicle_data=effective_vehicle,
        user_income=None,
    )

    # ── 5. Fairness score ───────────────────────────────────────────────────────
    dealer_price = sla_dict.get("dealer_price")
    apr          = _to_float(contract.sla.aprPercent)
    fees         = sla_dict.get("fees_total")
    term         = contract.sla.termMonths

    fairness_breakdown = calculate_fairness_score(
        dealer_price=dealer_price,
        market_price=predicted_price,
        apr=apr,
        fees=fees,
        term=term,
    )

    intent_score    = analysis.get("fairness_score", 50.0)
    breakdown_score = fairness_breakdown["final_score"]
    blended_score   = round(intent_score * 0.60 + breakdown_score * 0.40, 2)
    fairness_breakdown["final_score"] = blended_score

    # ── 6. Persist ──────────────────────────────────────────────────────────────
    contract_update: dict = {
        "fairnessScore":      Decimal(str(blended_score)),
        "redFlagLevel":       analysis["rating"],
        "negotiationIntents": json.dumps(analysis["negotiation_intents"]),
    }

    existing_notes = contract.notes or ""
    contract_update["notes"] = existing_notes

    await db.contract.update(
        where={"id": contract_id},
        data=contract_update,
    )

    # Store market blob in SLA.otherTerms
    market_blob = {
        "market_price":      predicted_price,
        "price_range_low":   price_low,
        "price_range_high":  price_high,
        "listings_sampled":  price_data.get("listings_sampled") if price_data else None,  # ✅
        "listings_found":    price_data.get("listings_found")   if price_data else None,  # ✅
        "source":            price_data.get("source")           if price_data else None,  # ✅
    }

    existing_other: dict = {}
    if contract.sla.otherTerms:
        try:
            raw = contract.sla.otherTerms
            existing_other = raw if isinstance(raw, dict) else json.loads(raw)
        except Exception:
            existing_other = {}

    existing_other["__market__"] = market_blob

    await db.contractsla.update(
        where={"id": contract.sla.id},
        data={"otherTerms": json.dumps(existing_other)},
    )

    # ── 7. Response ─────────────────────────────────────────────────────────────
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
            listings_sampled=price_data.get("listings_sampled") if price_data else None,
            listings_found=price_data.get("listings_found")     if price_data else None,
            source=price_data.get("source")                     if price_data else None,
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
    contract = await db.contract.find_unique(
        where={"id": contract_id},
        include={"sla": True, "vehicle": True},
    )

    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    market_blob: dict = {}
    if contract.sla and contract.sla.otherTerms:
        try:
            raw = contract.sla.otherTerms
            parsed = raw if isinstance(raw, dict) else json.loads(raw)
            market_blob = parsed.get("__market__", {})
        except Exception:
            market_blob = {}

    predicted_price  = market_blob.get("market_price")
    price_low        = market_blob.get("price_range_low")
    price_high       = market_blob.get("price_range_high")
    listings_sampled = market_blob.get("listings_sampled")   # ✅
    listings_found   = market_blob.get("listings_found")     # ✅
    source           = market_blob.get("source")             # ✅

    intents = None
    if contract.negotiationIntents:
        try:
            raw = contract.negotiationIntents
            intents = raw if isinstance(raw, list) else json.loads(raw)
        except Exception:
            intents = None

    sla_dict = _sla_to_dict(contract.sla) if contract.sla else {}
    fairness_breakdown = calculate_fairness_score(
        dealer_price=sla_dict.get("dealer_price"),
        market_price=predicted_price,
        apr=_to_float(contract.sla.aprPercent) if contract.sla else None,
        fees=sla_dict.get("fees_total"),
        term=contract.sla.termMonths if contract.sla else None,
    )
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
            price_range=PriceRangeSchema(low=price_low, high=price_high) if predicted_price else None,
            listings_sampled=listings_sampled,
            listings_found=listings_found,
            source=source,
        ) if predicted_price else None,
        fairness_breakdown=FairnessBreakdownSchema(**fairness_breakdown),
        negotiation_intents=intents,
    )