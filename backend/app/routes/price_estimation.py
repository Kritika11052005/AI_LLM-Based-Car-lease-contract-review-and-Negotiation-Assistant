# backend/app/routes/price_estimation.py
"""
Price Estimation API Routes
Provides fair market value and lease term analysis
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.core.price_estimation import PriceEstimationService
from app.generated.prisma import Prisma
from app.database import get_db

router = APIRouter()


class PriceEstimateRequest(BaseModel):
    year: int
    make: str
    model: str
    trim: Optional[str] = None


class LeaseAnalysisRequest(BaseModel):
    vehicle_price: float
    down_payment: float
    term_months: int
    apr_percent: float
    residual_value: float


@router.post("/estimate-price")
async def estimate_vehicle_price(request: PriceEstimateRequest):
    """
    Get fair market value estimate for a vehicle
    
    Uses:
    - NHTSA API for vehicle specs (free)
    - Market data analysis for pricing
    - Depreciation calculations
    
    Example:
        POST /api/price/estimate-price
        {
            "year": 2023,
            "make": "Honda",
            "model": "Accord",
            "trim": "EX"
        }
    """
    try:
        price_data = PriceEstimationService.get_vehicle_msrp_range(
            year=request.year,
            make=request.make,
            model=request.model,
            trim=request.trim
        )
        
        return {
            "success": True,
            "vehicle": {
                "year": request.year,
                "make": request.make,
                "model": request.model,
                "trim": request.trim
            },
            "price_estimate": price_data
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Price estimation failed: {str(e)}"
        )


@router.post("/analyze-lease-terms")
async def analyze_lease_terms(request: LeaseAnalysisRequest):
    """
    Analyze if lease terms are fair compared to market standards
    
    Checks:
    - APR fairness (3-7% is typical)
    - Down payment percentage (< 20% is good)
    - Residual value (45-60% is typical)
    - Monthly payment calculation
    
    Example:
        POST /api/price/analyze-lease-terms
        {
            "vehicle_price": 35000,
            "down_payment": 5000,
            "term_months": 36,
            "apr_percent": 5.5,
            "residual_value": 19250
        }
    """
    try:
        analysis = PriceEstimationService.calculate_fair_lease_terms(
            vehicle_price=request.vehicle_price,
            down_payment=request.down_payment,
            term_months=request.term_months,
            apr_percent=request.apr_percent,
            residual_value=request.residual_value
        )
        
        return {
            "success": True,
            "lease_analysis": analysis
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Lease analysis failed: {str(e)}"
        )


@router.get("/contract-price-analysis/{contract_id}")
async def analyze_contract_pricing(contract_id: str, db: Prisma = Depends(get_db)):
    """
    Analyze pricing for an existing contract
    
    Combines:
    - Vehicle price estimation
    - Lease term fairness analysis
    - Contract SLA data
    
    Returns comprehensive pricing report
    """
    try:
        # Fetch contract with vehicle and SLA
        contract = await db.contract.find_unique(
            where={"id": contract_id},
            include={"vehicle": True, "sla": True}
        )
        
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")
        
        # ✅ ALLOW MISSING VEHICLE DATA (use defaults)
        has_vehicle_data = contract.vehicle and contract.vehicle.make and contract.vehicle.model
        
        if not contract.sla:
            raise HTTPException(status_code=400, detail="No SLA data available")
        
        # Get price estimate (will use defaults if vehicle data missing)
        price_estimate = PriceEstimationService.get_vehicle_msrp_range(
            year=contract.vehicle.year if contract.vehicle else None,
            make=contract.vehicle.make if contract.vehicle else None,
            model=contract.vehicle.model if contract.vehicle else None,
            trim=contract.vehicle.trim if contract.vehicle else None
        )
        
        # Analyze lease terms
        vehicle_price = price_estimate["fair_market_value"]
        
        lease_analysis = PriceEstimationService.calculate_fair_lease_terms(
            vehicle_price=vehicle_price,
            down_payment=float(contract.sla.downPayment) if contract.sla.downPayment else 0,
            term_months=contract.sla.termMonths or 36,
            apr_percent=float(contract.sla.aprPercent) if contract.sla.aprPercent else 5.0,
            residual_value=float(contract.sla.residualValue) if contract.sla.residualValue else vehicle_price * 0.5
        )
        
        # Compare actual vs expected monthly payment
        actual_payment = float(contract.sla.monthlyPayment) if contract.sla.monthlyPayment else 0
        expected_payment = lease_analysis["calculated_monthly_payment"]
        payment_difference = actual_payment - expected_payment
        payment_difference_pct = (payment_difference / expected_payment * 100) if expected_payment > 0 else 0
        
        return {
            "success": True,
            "contract_id": contract_id,
            "vehicle": {
                "year": contract.vehicle.year,
                "make": contract.vehicle.make,
                "model": contract.vehicle.model,
                "vin": contract.vehicle.vin
            },
            "price_estimate": price_estimate,
            "lease_analysis": lease_analysis,
            "comparison": {
                "actual_monthly_payment": actual_payment,
                "expected_monthly_payment": expected_payment,
                "difference": round(payment_difference, 2),
                "difference_percentage": round(payment_difference_pct, 2),
                "verdict": "Fair" if abs(payment_difference_pct) < 10 else "Review Needed"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Contract price analysis error: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )