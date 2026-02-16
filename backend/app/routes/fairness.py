# backend/app/routes/fairness.py
"""
Contract Fairness Score Routes
Separate from negotiation - focused only on scoring
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.core.fairness_scorer import FairnessScorer
from app.core.price_estimation import PriceEstimationService
from app.generated.prisma import Prisma
from app.database import get_db

router = APIRouter()


class FairnessScoreResponse(BaseModel):
    """Response for fairness score calculation"""
    contract_id: str
    fairness_score: float
    rating: str
    summary: str
    breakdown: dict
    red_flags: list
    warnings: list
    recommendations: list


def convert_sla_to_dict(sla) -> dict:
    """Convert Prisma SLA model to dict"""
    if not sla:
        return {}
    
    def to_float(value):
        return float(value) if value is not None else None
    
    return {
        "interest_rate": f"{float(sla.aprPercent)}%" if sla.aprPercent else None,
        "monthly_payment": to_float(sla.monthlyPayment),
        "down_payment": to_float(sla.downPayment),
        "lease_term_months": sla.termMonths,
        "mileage_allowance": sla.mileageAllowanceYr,
        "overage_charge": to_float(sla.mileageOverageFee),
        "early_termination_fee": to_float(sla.earlyTerminationFee),
        "residual_value": to_float(sla.residualValue),
        "purchase_option": to_float(sla.purchaseOptionPrice),
    }


@router.post("/calculate-fairness/{contract_id}", response_model=FairnessScoreResponse)
async def calculate_fairness_score(
    contract_id: str,
    db: Prisma = Depends(get_db)
):
    """
    Calculate comprehensive fairness score (0-100) for a contract
    
    Analyzes:
    - APR fairness (25 points)
    - Monthly payment vs market (20 points)
    - Down payment (15 points)
    - Mileage terms (15 points)
    - Fees & penalties (15 points)
    - Residual value (10 points)
    
    Stores result in database: fairnessScore, redFlagLevel
    """
    
    try:
        # Fetch contract with SLA and vehicle
        contract = await db.contract.find_unique(
            where={"id": contract_id},
            include={"sla": True, "vehicle": True}
        )
        
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")
        
        if not contract.sla:
            raise HTTPException(
                status_code=400,
                detail="No SLA data available. Run /extract-sla first."
            )
        
        # Convert SLA to dict
        sla_data = convert_sla_to_dict(contract.sla)
        
        # Get vehicle price estimate
        vehicle_price = 35000.0  # Default
        
        if contract.vehicle:
            try:
                price_estimate = PriceEstimationService.get_vehicle_msrp_range(
                    year=contract.vehicle.year,
                    make=contract.vehicle.make,
                    model=contract.vehicle.model,
                    trim=contract.vehicle.trim
                )
                vehicle_price = price_estimate["fair_market_value"]
                
                print(f"✅ Vehicle price estimated: ${vehicle_price:,.2f}")
            except Exception as e:
                print(f"⚠️  Using default vehicle price: {e}")
        
        # Calculate comprehensive fairness score
        fairness_result = FairnessScorer.calculate_comprehensive_score(
            sla_data=sla_data,
            vehicle_price=vehicle_price,
            vehicle_data={
                "year": contract.vehicle.year if contract.vehicle else None,
                "make": contract.vehicle.make if contract.vehicle else None,
                "model": contract.vehicle.model if contract.vehicle else None,
            }
        )
        
        # ✅ SAVE TO DATABASE
        await db.contract.update(
            where={"id": contract_id},
            data={
                "fairnessScore": fairness_result["total_score"],
                "redFlagLevel": fairness_result["rating"]
            }
        )
        
        print(f"✅ Saved fairness score: {fairness_result['total_score']}/100 ({fairness_result['rating']})")
        
        return {
            "contract_id": contract_id,
            "fairness_score": fairness_result["total_score"],
            "rating": fairness_result["rating"],
            "summary": fairness_result["summary"],
            "breakdown": fairness_result["breakdown"],
            "red_flags": fairness_result["red_flags"],
            "warnings": fairness_result["warnings"],
            "recommendations": fairness_result["recommendations"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Fairness calculation error: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Fairness calculation failed: {str(e)}"
        )


@router.get("/fairness-score/{contract_id}")
async def get_fairness_score(
    contract_id: str,
    db: Prisma = Depends(get_db)
):
    """
    Get stored fairness score from database
    
    Returns cached score if available, otherwise calculates new one
    """
    
    try:
        contract = await db.contract.find_unique(
            where={"id": contract_id}
        )
        
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")
        
        # If score exists, return it
        if contract.fairnessScore is not None:
            return {
                "contract_id": contract_id,
                "fairness_score": float(contract.fairnessScore),
                "rating": contract.redFlagLevel or "Unknown",
                "cached": True
            }
        
        # Otherwise, calculate it
        # (This will call the calculate endpoint internally)
        return {
            "contract_id": contract_id,
            "message": "No cached score. Call POST /calculate-fairness/{contract_id} first.",
            "cached": False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch fairness score: {str(e)}"
        )