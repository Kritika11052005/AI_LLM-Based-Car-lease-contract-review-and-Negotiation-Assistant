# backend/app/core/fairness_scorer.py
"""
Contract Fairness Score Calculator (0-100)
Analyzes contract terms against market standards

Scoring Breakdown:
- APR Fairness (25 points)
- Monthly Payment (20 points)
- Down Payment (15 points)
- Mileage Terms (15 points)
- Fees & Penalties (15 points)
- Residual Value (10 points)
"""

from typing import Dict, Optional
from app.core.price_estimation import PriceEstimationService


class FairnessScorer:
    
    # Benchmark ranges (US market standards)
    FAIR_APR_RANGE = (3.0, 7.0)  # 3-7% for good credit
    FAIR_DOWN_PAYMENT_PCT = 20.0  # Max 20% of vehicle price
    FAIR_RESIDUAL_PCT = (45.0, 60.0)  # 45-60% is typical
    FAIR_MILEAGE_YEARLY = (12000, 15000)  # 12k-15k miles/year
    FAIR_OVERAGE_RATE = 0.25  # $0.25/mile max
    FAIR_EARLY_TERM_FEE_PCT = 2.0  # Max 2% of remaining balance
    
    @staticmethod
    def calculate_comprehensive_score(
        sla_data: Dict,
        vehicle_price: float,
        vehicle_data: Optional[Dict] = None
    ) -> Dict:
        """
        Calculate comprehensive fairness score (0-100)
        
        Args:
            sla_data: Contract SLA terms
            vehicle_price: Fair market value of vehicle
            vehicle_data: Optional vehicle info
            
        Returns:
            {
                "total_score": float (0-100),
                "rating": str (Excellent/Good/Fair/Poor/Very Poor),
                "breakdown": {
                    "apr_score": float,
                    "payment_score": float,
                    "down_payment_score": float,
                    "mileage_score": float,
                    "fees_score": float,
                    "residual_score": float
                },
                "red_flags": list,
                "warnings": list,
                "recommendations": list
            }
        """
        
        # Initialize scores
        apr_score = FairnessScorer._score_apr(sla_data.get("interest_rate"))
        payment_score = FairnessScorer._score_payment(
            sla_data.get("monthly_payment"),
            vehicle_price,
            sla_data.get("interest_rate"),
            sla_data.get("lease_term_months")
        )
        down_payment_score = FairnessScorer._score_down_payment(
            sla_data.get("down_payment"),
            vehicle_price
        )
        mileage_score = FairnessScorer._score_mileage(
            sla_data.get("mileage_allowance"),
            sla_data.get("overage_charge")
        )
        fees_score = FairnessScorer._score_fees(
            sla_data.get("early_termination_fee"),
            vehicle_price
        )
        residual_score = FairnessScorer._score_residual(
            sla_data.get("residual_value"),
            vehicle_price
        )
        
        # Calculate total score
        total_score = (
            apr_score +
            payment_score +
            down_payment_score +
            mileage_score +
            fees_score +
            residual_score
        )
        
        # Determine rating
        rating = FairnessScorer._get_rating(total_score)
        
        # Identify issues
        red_flags = FairnessScorer._identify_red_flags(sla_data, vehicle_price)
        warnings = FairnessScorer._identify_warnings(sla_data, vehicle_price)
        recommendations = FairnessScorer._generate_recommendations(sla_data, vehicle_price)
        
        return {
            "total_score": round(total_score, 2),
            "rating": rating,
            "breakdown": {
                "apr_score": round(apr_score, 2),
                "payment_score": round(payment_score, 2),
                "down_payment_score": round(down_payment_score, 2),
                "mileage_score": round(mileage_score, 2),
                "fees_score": round(fees_score, 2),
                "residual_score": round(residual_score, 2)
            },
            "red_flags": red_flags,
            "warnings": warnings,
            "recommendations": recommendations,
            "summary": FairnessScorer._generate_summary(total_score, red_flags, warnings)
        }
    
    @staticmethod
    def _score_apr(apr_str: Optional[str]) -> float:
        """Score APR (0-25 points)"""
        if not apr_str:
            return 12.5  # Neutral score if missing
        
        try:
            # Extract number from "X%" or "X"
            apr = float(apr_str.replace("%", "").strip())
            
            if apr <= 3.0:
                return 25  # Excellent
            elif apr <= 5.0:
                return 23  # Very good
            elif apr <= 7.0:
                return 20  # Good
            elif apr <= 9.0:
                return 15  # Fair
            elif apr <= 12.0:
                return 10  # Poor
            else:
                return 5   # Very poor (predatory)
        except:
            return 12.5
    
    @staticmethod
    def _score_payment(monthly_payment: Optional[float], vehicle_price: float, 
                      apr_str: Optional[str], term: Optional[int]) -> float:
        """Score monthly payment (0-20 points)"""
        if not monthly_payment or not vehicle_price:
            return 10  # Neutral
        
        # Calculate expected payment
        try:
            apr = float(apr_str.replace("%", "").strip()) if apr_str else 5.0
            term_months = term or 36
            
            lease_analysis = PriceEstimationService.calculate_fair_lease_terms(
                vehicle_price=vehicle_price,
                down_payment=0,  # Assuming included in payment
                term_months=term_months,
                apr_percent=apr,
                residual_value=vehicle_price * 0.5
            )
            
            expected = lease_analysis["calculated_monthly_payment"]
            difference_pct = ((monthly_payment - expected) / expected) * 100
            
            if difference_pct <= -10:
                return 20  # Great deal (10% below market)
            elif difference_pct <= 0:
                return 18  # Good deal
            elif difference_pct <= 5:
                return 15  # Fair
            elif difference_pct <= 10:
                return 10  # Slightly high
            elif difference_pct <= 20:
                return 5   # High
            else:
                return 2   # Very high
        except:
            return 10
    
    @staticmethod
    def _score_down_payment(down_payment: Optional[float], vehicle_price: float) -> float:
        """Score down payment (0-15 points)"""
        if not down_payment or not vehicle_price:
            return 15  # No down payment is good
        
        down_pct = (down_payment / vehicle_price) * 100
        
        if down_pct <= 10:
            return 15  # Excellent
        elif down_pct <= 15:
            return 13  # Good
        elif down_pct <= 20:
            return 10  # Fair
        elif down_pct <= 25:
            return 7   # High
        else:
            return 3   # Very high
    
    @staticmethod
    def _score_mileage(allowance: Optional[int], overage: Optional[float]) -> float:
        """Score mileage terms (0-15 points)"""
        score = 0
        
        # Score allowance (0-10 points)
        if allowance:
            if allowance >= 15000:
                score += 10  # Generous
            elif allowance >= 12000:
                score += 8   # Standard
            elif allowance >= 10000:
                score += 5   # Low
            else:
                score += 2   # Very low
        else:
            score += 5  # Neutral
        
        # Score overage fee (0-5 points)
        if overage:
            if overage <= 0.15:
                score += 5   # Great
            elif overage <= 0.20:
                score += 4   # Good
            elif overage <= 0.25:
                score += 3   # Fair
            elif overage <= 0.30:
                score += 2   # High
            else:
                score += 1   # Very high
        else:
            score += 2.5  # Neutral
        
        return score
    
    @staticmethod
    def _score_fees(early_term_fee: Optional[float], vehicle_price: float) -> float:
        """Score fees & penalties (0-15 points)"""
        if not early_term_fee or not vehicle_price:
            return 10  # Neutral
        
        fee_pct = (early_term_fee / vehicle_price) * 100
        
        if fee_pct <= 1.0:
            return 15  # Low
        elif fee_pct <= 2.0:
            return 12  # Fair
        elif fee_pct <= 3.0:
            return 8   # Moderate
        elif fee_pct <= 5.0:
            return 4   # High
        else:
            return 1   # Very high
    
    @staticmethod
    def _score_residual(residual: Optional[float], vehicle_price: float) -> float:
        """Score residual value (0-10 points)"""
        if not residual or not vehicle_price:
            return 5  # Neutral
        
        residual_pct = (residual / vehicle_price) * 100
        
        if 50 <= residual_pct <= 55:
            return 10  # Perfect
        elif 45 <= residual_pct <= 60:
            return 8   # Good
        elif 40 <= residual_pct <= 65:
            return 6   # Fair
        else:
            return 3   # Poor
    
    @staticmethod
    def _get_rating(score: float) -> str:
        """Convert score to rating"""
        if score >= 85:
            return "Excellent"
        elif score >= 70:
            return "Good"
        elif score >= 55:
            return "Fair"
        elif score >= 40:
            return "Poor"
        else:
            return "Very Poor"
    
    @staticmethod
    def _identify_red_flags(sla_data: Dict, vehicle_price: float) -> list:
        """Identify serious issues"""
        red_flags = []
        
        # High APR
        apr_str = sla_data.get("interest_rate")
        if apr_str:
            try:
                apr = float(apr_str.replace("%", "").strip())
                if apr > 12:
                    red_flags.append(f"Predatory APR: {apr}% (typical is 3-7%)")
                elif apr > 9:
                    red_flags.append(f"High APR: {apr}% (typical is 3-7%)")
            except:
                pass
        
        # High overage fee
        overage = sla_data.get("overage_charge")
        if overage and overage > 0.30:
            red_flags.append(f"Excessive overage fee: ${overage}/mile (typical is $0.15-0.25)")
        
        # Low mileage allowance
        mileage = sla_data.get("mileage_allowance")
        if mileage and mileage < 10000:
            red_flags.append(f"Very low mileage allowance: {mileage} miles/year (typical is 12k-15k)")
        
        # High early termination
        early_term = sla_data.get("early_termination_fee")
        if early_term and vehicle_price:
            pct = (early_term / vehicle_price) * 100
            if pct > 5:
                red_flags.append(f"Excessive early termination fee: {pct:.1f}% of vehicle price")
        
        return red_flags
    
    @staticmethod
    def _identify_warnings(sla_data: Dict, vehicle_price: float) -> list:
        """Identify moderate concerns"""
        warnings = []
        
        # Down payment
        down = sla_data.get("down_payment")
        if down and vehicle_price:
            pct = (down / vehicle_price) * 100
            if pct > 20:
                warnings.append(f"High down payment: {pct:.1f}% of vehicle price (typical is <20%)")
        
        # Residual value
        residual = sla_data.get("residual_value")
        if residual and vehicle_price:
            pct = (residual / vehicle_price) * 100
            if pct < 40:
                warnings.append(f"Low residual value: {pct:.1f}% (increases monthly payments)")
            elif pct > 65:
                warnings.append(f"High residual value: {pct:.1f}% (may owe more at lease end)")
        
        return warnings
    
    @staticmethod
    def _generate_recommendations(sla_data: Dict, vehicle_price: float) -> list:
        """Generate actionable recommendations"""
        recommendations = []
        
        apr_str = sla_data.get("interest_rate")
        if apr_str:
            try:
                apr = float(apr_str.replace("%", "").strip())
                if apr > 7:
                    recommendations.append(f"Negotiate APR down from {apr}% to 5-7% or get pre-approved financing")
            except:
                pass
        
        overage = sla_data.get("overage_charge")
        if overage and overage > 0.25:
            recommendations.append(f"Negotiate overage fee from ${overage}/mile to $0.20/mile or less")
        
        mileage = sla_data.get("mileage_allowance")
        if mileage and mileage < 12000:
            recommendations.append(f"Request at least 12,000 miles/year instead of {mileage}")
        
        if not recommendations:
            recommendations.append("Contract terms appear fair. Verify all details before signing.")
        
        return recommendations
    
    @staticmethod
    def _generate_summary(score: float, red_flags: list, warnings: list) -> str:
        """Generate human-readable summary"""
        rating = FairnessScorer._get_rating(score)
        
        if score >= 85:
            return f"This is an {rating} contract ({score:.0f}/100). Terms are very competitive."
        elif score >= 70:
            return f"This is a {rating} contract ({score:.0f}/100). Most terms are fair."
        elif score >= 55:
            return f"This is a {rating} contract ({score:.0f}/100). Some terms could be improved."
        elif score >= 40:
            return f"This is a {rating} contract ({score:.0f}/100). Several unfavorable terms detected."
        else:
            return f"This is a {rating} contract ({score:.0f}/100). Significant issues found. Consider alternatives."


# Example usage
if __name__ == "__main__":
    # Test scoring
    sla_data = {
        "interest_rate": "5.5%",
        "monthly_payment": 450.0,
        "down_payment": 3000.0,
        "lease_term_months": 36,
        "mileage_allowance": 12000,
        "overage_charge": 0.20,
        "early_termination_fee": 500.0,
        "residual_value": 17500.0
    }
    
    vehicle_price = 35000.0
    
    result = FairnessScorer.calculate_comprehensive_score(sla_data, vehicle_price)
    print("Fairness Score:", result["total_score"])
    print("Rating:", result["rating"])
    print("\nBreakdown:")
    for key, val in result["breakdown"].items():
        print(f"  {key}: {val}")
    print("\nRed Flags:", result["red_flags"])
    print("Warnings:", result["warnings"])
    print("\nRecommendations:")
    for rec in result["recommendations"]:
        print(f"  - {rec}")