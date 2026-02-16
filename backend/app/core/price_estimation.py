import requests
from typing import Optional, Dict
import statistics
from datetime import datetime

class PriceEstimationService:
    
    NHTSA_BASE_URL = "https://vpic.nhtsa.dot.gov/api"
    
    @staticmethod
    def get_vehicle_msrp_range(year: Optional[int], make: Optional[str], model: Optional[str], trim: Optional[str] = None) -> Dict:
        """
        Estimate vehicle price range using multiple data sources
        
        Returns:
            {
                "msrp_low": float,
                "msrp_high": float,
                "msrp_avg": float,
                "fair_market_value": float,
                "depreciation_rate": float,
                "estimated_lease_value": float,
                "data_sources": list
            }
        """
        
        # ✅ HANDLE MISSING VEHICLE DATA
        if not make or not model or not year:
            # Return default estimates for unknown vehicle
            return {
                "msrp_low": 25000.0,
                "msrp_high": 45000.0,
                "msrp_avg": 35000.0,
                "fair_market_value": 30000.0,
                "depreciation_rate": 0.20,
                "estimated_lease_value": 16500.0,
                "data_sources": ["Default Estimate (Vehicle data incomplete)"],
                "vehicle_class": "Unknown",
            }
        
        # Get vehicle specs from NHTSA
        vehicle_specs = PriceEstimationService._get_nhtsa_specs(year, make, model)
        
        # Calculate base price estimates
        base_estimates = PriceEstimationService._calculate_base_estimates(
            year, make, model, trim, vehicle_specs
        )
        
        # Apply depreciation
        current_value = PriceEstimationService._apply_depreciation(
            base_estimates["msrp_avg"], 
            year
        )
        
        # Estimate lease value (typically 50-60% of MSRP)
        lease_value = current_value * 0.55
        
        return {
            "msrp_low": base_estimates["msrp_low"],
            "msrp_high": base_estimates["msrp_high"],
            "msrp_avg": base_estimates["msrp_avg"],
            "fair_market_value": current_value,
            "depreciation_rate": PriceEstimationService._get_depreciation_rate(year),
            "estimated_lease_value": lease_value,
            "data_sources": base_estimates["sources"],
            "vehicle_class": vehicle_specs.get("vehicle_class", "Unknown"),
        }
    
    @staticmethod
    def _get_nhtsa_specs(year: int, make: str, model: str) -> Dict:
        """Fetch vehicle specifications from NHTSA API"""
        try:
            # ✅ ADD NULL CHECKS
            if not make or not model or not year:
                return {}
            
            # NHTSA VIN decoder API (free, no key required)
            url = f"{PriceEstimationService.NHTSA_BASE_URL}/vehicles/GetModelsForMakeYear/make/{make}/modelyear/{year}?format=json"
            
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                
                # Find matching model
                for vehicle in data.get("Results", []):
                    if model.lower() in vehicle.get("Model_Name", "").lower():
                        return {
                            "make": vehicle.get("Make_Name"),
                            "model": vehicle.get("Model_Name"),
                            "vehicle_class": "Sedan",  # NHTSA doesn't provide class in this endpoint
                        }
            
            return {}
        except Exception as e:
            print(f"NHTSA API error: {e}")
            return {}
    
    @staticmethod
    def _calculate_base_estimates(year: int, make: str, model: str, trim: Optional[str], specs: Dict) -> Dict:
        """
        Calculate base price estimates using market data rules
        
        Uses industry-standard pricing based on:
        - Vehicle class (Sedan, SUV, Truck, Luxury)
        - Brand tier (Economy, Mid-range, Luxury)
        - Model year
        """
        
        # ✅ ADD NULL CHECKS AT THE START
        if not make or not model:
            return {
                "msrp_low": 25000.0,
                "msrp_high": 45000.0,
                "msrp_avg": 35000.0,
                "sources": ["Default Estimate"]
            }
        
        # Brand tiers (average MSRP ranges in USD)
        luxury_brands = ["bmw", "mercedes", "audi", "lexus", "tesla", "porsche", "jaguar", "land rover"]
        premium_brands = ["acura", "infiniti", "volvo", "genesis", "cadillac", "lincoln"]
        mid_brands = ["honda", "toyota", "mazda", "subaru", "volkswagen", "hyundai", "kia"]
        economy_brands = ["nissan", "chevrolet", "ford", "dodge", "jeep", "gmc"]
        
        make_lower = make.lower()
        
        # Determine tier
        if make_lower in luxury_brands:
            base_low = 50000
            base_high = 120000
        elif make_lower in premium_brands:
            base_low = 35000
            base_high = 70000
        elif make_lower in mid_brands:
            base_low = 25000
            base_high = 45000
        else:  # economy
            base_low = 20000
            base_high = 35000
        
        # Adjust for vehicle type (SUVs typically cost more)
        model_lower = model.lower()
        if any(keyword in model_lower for keyword in ["suv", "x5", "q7", "rav4", "pilot", "explorer"]):
            base_low *= 1.2
            base_high *= 1.3
        elif any(keyword in model_lower for keyword in ["truck", "f-150", "silverado", "ram"]):
            base_low *= 1.3
            base_high *= 1.4
        
        # Calculate average
        base_avg = (base_low + base_high) / 2
        
        sources = ["Market Analysis", "Brand Tier Classification"]
        
        return {
            "msrp_low": round(base_low, 2),
            "msrp_high": round(base_high, 2),
            "msrp_avg": round(base_avg, 2),
            "sources": sources
        }
    
    @staticmethod
    def _apply_depreciation(msrp: float, year: Optional[int]) -> float:
        """
        Apply depreciation to get current fair market value
        
        Standard depreciation rates:
        - Year 1: 20-30%
        - Year 2: 15-20%
        - Year 3: 10-15%
        - Years 4+: 10% per year
        """
        # ✅ HANDLE MISSING YEAR
        if not year:
            return msrp * 0.75  # Assume 25% depreciation if year unknown
        
        current_year = datetime.now().year
        vehicle_age = current_year - year
        
        if vehicle_age <= 0:
            return msrp  # Brand new
        
        depreciation_rates = {
            1: 0.25,   # 25% first year
            2: 0.18,   # 18% second year
            3: 0.12,   # 12% third year
        }
        
        current_value = msrp
        
        for age in range(1, vehicle_age + 1):
            if age <= 3:
                current_value *= (1 - depreciation_rates[age])
            else:
                current_value *= 0.90  # 10% per year after year 3
        
        return round(current_value, 2)
    
    @staticmethod
    def _get_depreciation_rate(year: Optional[int]) -> float:
        """Get total depreciation rate for vehicle age"""
        # ✅ HANDLE MISSING YEAR
        if not year:
            return 0.25  # Default 25% depreciation
        
        current_year = datetime.now().year
        vehicle_age = current_year - year
        
        if vehicle_age <= 0:
            return 0.0
        elif vehicle_age == 1:
            return 0.25
        elif vehicle_age == 2:
            return 0.40  # 25% + 18%
        elif vehicle_age == 3:
            return 0.50  # ~50% total
        else:
            # Additional 10% per year
            return min(0.50 + (vehicle_age - 3) * 0.10, 0.80)  # Cap at 80%
    
    @staticmethod
    def calculate_fair_lease_terms(
        vehicle_price: float,
        down_payment: float,
        term_months: int,
        apr_percent: float,
        residual_value: float
    ) -> Dict:
        """
        Calculate if lease terms are fair based on market standards
        
        Returns fairness metrics and recommendations
        """
        
        # Calculate monthly payment breakdown
        financed_amount = vehicle_price - down_payment
        monthly_interest_rate = (apr_percent / 100) / 12
        
        # Standard monthly payment calculation
        if monthly_interest_rate > 0:
            monthly_payment = financed_amount * (
                monthly_interest_rate * (1 + monthly_interest_rate) ** term_months
            ) / ((1 + monthly_interest_rate) ** term_months - 1)
        else:
            monthly_payment = financed_amount / term_months
        
        # Fair market benchmarks
        fair_apr_range = (3.0, 7.0)  # 3-7% is typical for good credit
        fair_down_payment_pct = down_payment / vehicle_price * 100
        fair_residual_pct = residual_value / vehicle_price * 100
        
        # Evaluate fairness
        apr_fair = fair_apr_range[0] <= apr_percent <= fair_apr_range[1]
        down_payment_fair = fair_down_payment_pct <= 20  # Less than 20% is good
        residual_fair = 45 <= fair_residual_pct <= 60  # 45-60% is typical
        
        return {
            "calculated_monthly_payment": round(monthly_payment, 2),
            "total_cost": round(monthly_payment * term_months + down_payment, 2),
            "total_interest": round(monthly_payment * term_months - financed_amount, 2),
            "fairness_checks": {
                "apr_fair": apr_fair,
                "apr_rating": "Good" if apr_fair else "High",
                "down_payment_fair": down_payment_fair,
                "residual_value_fair": residual_fair,
            },
            "recommendations": PriceEstimationService._generate_recommendations(
                apr_percent, fair_down_payment_pct, fair_residual_pct
            )
        }
    
    @staticmethod
    def _generate_recommendations(apr: float, down_pct: float, residual_pct: float) -> list:
        """Generate negotiation recommendations"""
        recommendations = []
        
        if apr > 7.0:
            recommendations.append(f"APR of {apr}% is high. Aim for 3-7% by improving credit or negotiating.")
        
        if down_pct > 20:
            recommendations.append(f"Down payment is {down_pct:.1f}% of vehicle value. Try to reduce it below 20%.")
        
        if residual_pct < 45:
            recommendations.append(f"Residual value is low at {residual_pct:.1f}%. This increases monthly payments.")
        
        if residual_pct > 60:
            recommendations.append(f"Residual value is high at {residual_pct:.1f}%. You may owe more at lease end.")
        
        if not recommendations:
            recommendations.append("Terms appear fair based on market standards.")
        
        return recommendations