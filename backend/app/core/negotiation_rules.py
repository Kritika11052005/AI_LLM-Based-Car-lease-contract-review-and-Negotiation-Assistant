from typing import Dict, List, Optional
import re
from decimal import Decimal

class NegotiationRules:
    """
    Rules engine for analyzing car lease/loan contracts and generating negotiation intents
    Flow: Rules → Analysis → Intent Generation
    """
    
    @staticmethod
    def _has_value(field_value) -> bool:
        """
        Check if a field has an actual value (not None, not empty string)
        Handles int, float, Decimal, and string types properly
        """
        if field_value is None:
            return False
        
        # If it's a string, check if it's not empty
        if isinstance(field_value, str):
            return bool(field_value.strip())
        
        # If it's a number (int, float, Decimal), it has a value
        if isinstance(field_value, (int, float, Decimal)):
            return True
        
        # For any other type, convert to bool
        return bool(field_value)
    
    @staticmethod
    def _extract_number(value) -> Optional[float]:
        """
        Extract numeric value from various formats
        Handles: int, float, Decimal, strings with currency
        """
        if value is None:
            return None
        
        # ✅ If already a number, return it directly
        if isinstance(value, (int, float)):
            return float(value)
        
        # ✅ Handle Decimal type
        if isinstance(value, Decimal):
            return float(value)
        
        # ✅ Handle strings
        if isinstance(value, str):
            # Remove currency symbols, spaces, commas, percent signs
            cleaned = re.sub(r'[INR$₹£€\s,]', '', value, flags=re.IGNORECASE)
            cleaned = cleaned.replace('%', '')
            
            if not cleaned:
                return None
            
            # Extract first number found
            match = re.search(r'(\d+\.?\d*)', cleaned)
            if match:
                try:
                    return float(match.group(1))
                except ValueError:
                    return None
        
        return None
    
    @staticmethod
    def analyze_contract(sla_data: Dict, vehicle_data: Optional[Dict] = None, user_income: Optional[float] = None) -> Dict:
        """
        Comprehensive contract analysis with negotiation recommendations
        
        Args:
            sla_data: Extracted SLA data from contract (with proper numeric types)
            vehicle_data: Vehicle information from VIN lookup
            user_income: User's monthly income (optional, for affordability analysis)
        
        Returns:
            Dictionary with recommendations, red flags, negotiation points, fairness score, and intents
        """
        recommendations = []
        negotiation_points = []
        red_flags = []
        warnings = []
        fair_score = 0
        max_score = 100
        
        # ✅ FIX: Use _has_value() to check for missing fields (not falsy check)
        # This prevents false warnings when values are 0 or 0.0
        
        # Analyze each component
        apr_result = NegotiationRules._analyze_apr(sla_data.get("interest_rate"))
        payment_result = NegotiationRules._analyze_payment(
            sla_data.get("monthly_payment"),
            sla_data.get("lease_term_months"),
            user_income
        )
        down_payment_result = NegotiationRules._analyze_down_payment(sla_data.get("down_payment"))
        term_result = NegotiationRules._analyze_term(sla_data.get("lease_term_months"))
        mileage_result = NegotiationRules._analyze_mileage(
            sla_data.get("mileage_allowance"),
            sla_data.get("overage_charge")
        )
        early_term_result = NegotiationRules._analyze_early_termination(sla_data.get("early_termination_fee"))
        late_fee_result = NegotiationRules._analyze_late_fee(sla_data.get("late_fee"))
        
        # Aggregate results
        results = [apr_result, payment_result, down_payment_result, term_result, 
                   mileage_result, early_term_result, late_fee_result]
        
        for result in results:
            if result:
                fair_score += result.get("score", 0)
                if result.get("recommendation"):
                    recommendations.append(result["recommendation"])
                if result.get("negotiation_points"):
                    negotiation_points.extend(result["negotiation_points"])
                if result.get("red_flag"):
                    red_flags.append(result["red_flag"])
                if result.get("warning"):
                    warnings.append(result["warning"])
        
        # Determine overall rating
        score_percentage = (fair_score / max_score) * 100
        if score_percentage >= 90:
            rating = "Excellent"
            summary = "This is an excellent deal. Proceed with confidence."
        elif score_percentage >= 75:
            rating = "Good"
            summary = "This is a good deal with minor areas for negotiation."
        elif score_percentage >= 60:
            rating = "Fair"
            summary = "Fair deal but several key points should be negotiated."
        elif score_percentage >= 40:
            rating = "Poor"
            summary = "Poor deal. Strong negotiation needed or consider walking away."
        else:
            rating = "Very Poor"
            summary = "Very poor deal. Recommend rejecting or complete renegotiation."
        
        # Generate negotiation intents based on analysis
        negotiation_intents = NegotiationRules._generate_negotiation_intents(
            sla_data, 
            red_flags, 
            negotiation_points,
            score_percentage
        )
        
        return {
            "fairness_score": round(score_percentage, 1),
            "rating": rating,
            "summary": summary,
            "recommendations": recommendations,
            "negotiation_points": negotiation_points,
            "red_flags": red_flags,
            "warnings": warnings,
            "priority_negotiations": NegotiationRules._prioritize_negotiations(negotiation_points),
            "negotiation_intents": negotiation_intents  # NEW: LLM will use these
        }
    
    @staticmethod
    def _generate_negotiation_intents(sla_data: Dict, red_flags: List[str], 
                                     negotiation_points: List[str], score: float) -> List[Dict]:
        """
        Generate structured negotiation intents based on rules analysis
        These intents will be used by the LLM to create negotiation scripts
        
        Returns:
            List of intent dictionaries with priority, field, current_value, target_value, and reasoning
        """
        intents = []
        
        # ✅ Extract numeric values for comparison using improved _extract_number
        apr = NegotiationRules._extract_number(sla_data.get("interest_rate"))
        monthly_payment = NegotiationRules._extract_number(sla_data.get("monthly_payment"))
        down_payment = NegotiationRules._extract_number(sla_data.get("down_payment"))
        term_months = sla_data.get("lease_term_months")
        early_term_fee = NegotiationRules._extract_number(sla_data.get("early_termination_fee"))
        late_fee = NegotiationRules._extract_number(sla_data.get("late_fee"))
        overage_charge = NegotiationRules._extract_number(sla_data.get("overage_charge"))
        mileage_allowance = NegotiationRules._extract_number(sla_data.get("mileage_allowance"))
        
        # Intent 1: APR Negotiation
        if apr:
            if apr >= 10.0:
                intents.append({
                    "priority": "CRITICAL",
                    "field": "interest_rate",
                    "current_value": f"{apr}%",
                    "target_value": "6-7%",
                    "market_benchmark": "4-6% for good credit",
                    "reasoning": f"Current APR of {apr}% is predatory. Market standard is 4-6% for qualified buyers.",
                    "negotiation_leverage": "This rate will cost thousands in extra interest. Show competing offers."
                })
            elif apr >= 8.0:
                intents.append({
                    "priority": "HIGH",
                    "field": "interest_rate",
                    "current_value": f"{apr}%",
                    "target_value": "6.0% or lower",
                    "market_benchmark": "4-6% for good credit",
                    "reasoning": f"APR of {apr}% is above market average. You should qualify for better rates.",
                    "negotiation_leverage": "Credit unions typically offer 5-6% for similar credit profiles."
                })
            elif apr >= 6.0:
                intents.append({
                    "priority": "MEDIUM",
                    "field": "interest_rate",
                    "current_value": f"{apr}%",
                    "target_value": "Below 5.5%",
                    "market_benchmark": "4-6% for good credit",
                    "reasoning": f"APR of {apr}% is acceptable but can be improved with negotiation.",
                    "negotiation_leverage": "Ask if rate can be lowered with larger down payment or shorter term."
                })
        
        # Intent 2: Monthly Payment Negotiation
        if monthly_payment and monthly_payment > 500:
            target_payment = monthly_payment * 0.85  # Target 15% reduction
            intents.append({
                "priority": "HIGH",
                "field": "monthly_payment",
                "current_value": f"${monthly_payment:.2f}",
                "target_value": f"${target_payment:.2f}",
                "market_benchmark": "Should be <15% of monthly income",
                "reasoning": f"Monthly payment of ${monthly_payment:.2f} may strain budget.",
                "negotiation_leverage": "Request payment reduction through higher down payment, extended term, or lower APR."
            })
        
        # Intent 3: Down Payment
        if down_payment:
            if down_payment < 2000:
                intents.append({
                    "priority": "LOW",
                    "field": "down_payment",
                    "current_value": f"${down_payment:.2f}",
                    "target_value": "$3,000-$5,000",
                    "market_benchmark": "10-20% of vehicle price",
                    "reasoning": f"Low down payment of ${down_payment:.2f} leads to higher monthly payments.",
                    "negotiation_leverage": "Increasing down payment reduces monthly costs and total interest."
                })
            elif down_payment > 8000:
                intents.append({
                    "priority": "MEDIUM",
                    "field": "down_payment",
                    "current_value": f"${down_payment:.2f}",
                    "target_value": "$5,000-$7,000",
                    "market_benchmark": "10-20% of vehicle price",
                    "reasoning": f"Very high down payment of ${down_payment:.2f}. Consider if buying outright makes more sense.",
                    "negotiation_leverage": "Question whether lease/loan is optimal with this much upfront capital."
                })
        
        # Intent 4: Term Length
        if term_months and term_months > 48:
            intents.append({
                "priority": "HIGH",
                "field": "lease_term_months",
                "current_value": f"{term_months} months",
                "target_value": "36-48 months",
                "market_benchmark": "36 months (standard lease)",
                "reasoning": f"{term_months}-month term is too long and increases total interest paid.",
                "negotiation_leverage": "Longer terms mean being underwater on the loan and paying more interest."
            })
        
        # Intent 5: Mileage Allowance
        if mileage_allowance and mileage_allowance < 12000:
            intents.append({
                "priority": "HIGH",
                "field": "mileage_allowance",
                "current_value": f"{int(mileage_allowance)} miles/year",
                "target_value": "12,000-15,000 miles/year",
                "market_benchmark": "12,000 miles/year standard",
                "reasoning": f"Mileage allowance of {int(mileage_allowance)} miles/year is below standard. Risk of expensive overage charges.",
                "negotiation_leverage": "Request standard 12,000 or 15,000 mile allowance to avoid penalties."
            })
        
        # Intent 6: Mileage Overage Fee
        if overage_charge and overage_charge > 0.25:
            intents.append({
                "priority": "MEDIUM",
                "field": "overage_charge",
                "current_value": f"${overage_charge:.2f}/mile",
                "target_value": "$0.15-$0.20/mile",
                "market_benchmark": "$0.15-$0.20/mile standard",
                "reasoning": f"Overage charge of ${overage_charge:.2f}/mile is excessive.",
                "negotiation_leverage": "Standard overage rates are $0.15-$0.20/mile. Request adjustment to market rate."
            })
        
        # Intent 7: Early Termination Fee
        if early_term_fee and early_term_fee > 500:
            intents.append({
                "priority": "MEDIUM",
                "field": "early_termination_fee",
                "current_value": f"${early_term_fee:.2f}",
                "target_value": "$300-500 or waived",
                "market_benchmark": "$300-500 industry standard",
                "reasoning": f"Early termination fee of ${early_term_fee:.2f} is excessive.",
                "negotiation_leverage": "This penalizes life changes. Request reduction or removal."
            })
        
        # Intent 8: Late Fee
        if late_fee and late_fee > 35:
            intents.append({
                "priority": "LOW",
                "field": "late_fee",
                "current_value": f"${late_fee:.2f}",
                "target_value": "$25-35",
                "market_benchmark": "$25-35 standard",
                "reasoning": f"Late fee of ${late_fee:.2f} is above industry standard.",
                "negotiation_leverage": "Request alignment with industry standard fees."
            })
        
        # Sort by priority
        priority_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        intents.sort(key=lambda x: priority_order.get(x["priority"], 3))
        
        return intents
    
    @staticmethod
    def _analyze_apr(interest_rate: Optional[str]) -> Dict:
        """Analyze interest rate / APR"""
        # ✅ Use _has_value instead of "if not"
        if not NegotiationRules._has_value(interest_rate):
            return {
                "score": 10,
                "recommendation": "Interest rate not found in contract. Request this information.",
                "warning": "Missing interest rate information"
            }
        
        apr = NegotiationRules._extract_number(interest_rate)
        if not apr:
            return {"score": 10, "warning": "Could not parse interest rate"}
        
        # Scoring (20 points max)
        if apr < 4.0:
            score = 20
            recommendation = f"Excellent APR of {apr}%. This is a great rate."
            negotiation_points = []
            red_flag = None
        elif apr < 6.0:
            score = 15
            recommendation = f"Good APR of {apr}%. Acceptable rate."
            negotiation_points = ["Consider negotiating for a rate below 5% if you have excellent credit"]
            red_flag = None
        elif apr < 8.0:
            score = 10
            recommendation = f"Fair APR of {apr}%. Room for improvement."
            negotiation_points = [
                f"Current APR is {apr}%. Negotiate for 6.0% or lower",
                "Shop with 3+ lenders to compare rates",
                "Check if your credit score qualifies for better rates"
            ]
            red_flag = None
        elif apr < 10.0:
            score = 5
            recommendation = f"High APR of {apr}%. Negotiate strongly."
            negotiation_points = [
                f"APR of {apr}% is high. Target 6-7% range",
                "This rate will cost you significantly in interest over the loan term",
                "Consider improving credit score before financing"
            ]
            red_flag = f"High APR: {apr}%"
        else:
            score = 0
            recommendation = f"Very high APR of {apr}%. This may be predatory."
            negotiation_points = [
                f"APR of {apr}% is extremely high and likely predatory",
                "Walk away from this deal",
                "Seek financing from credit unions or banks instead"
            ]
            red_flag = f"CRITICAL: Predatory APR of {apr}%"
        
        return {
            "score": score,
            "recommendation": recommendation,
            "negotiation_points": negotiation_points,
            "red_flag": red_flag
        }
    
    @staticmethod
    def _analyze_payment(monthly_payment: Optional[str], term_months: Optional[int], 
                         user_income: Optional[float]) -> Dict:
        """Analyze monthly payment affordability"""
        # ✅ Use _has_value instead of "if not"
        if not NegotiationRules._has_value(monthly_payment):
            return {
                "score": 7,
                "warning": "Monthly payment not found in contract"
            }
        
        payment = NegotiationRules._extract_number(monthly_payment)
        if not payment:
            return {"score": 7, "warning": "Could not parse monthly payment"}
        
        # Base scoring without income (15 points max)
        if not user_income:
            return {
                "score": 10,
                "recommendation": f"Monthly payment is ${payment:.2f}. Ensure this fits your budget (should be <15% of monthly income).",
                "negotiation_points": [
                    "Verify monthly payment fits within 15% of your monthly income",
                    f"Calculate total cost: ${payment:.2f} × {term_months or 36} months = ${payment * (term_months or 36):.2f}"
                ]
            }
        
        # With income data
        payment_percentage = (payment / user_income) * 100
        
        if payment_percentage < 10:
            score = 15
            recommendation = f"Excellent! Payment of ${payment:.2f} ({payment_percentage:.1f}% of income) is very affordable."
            negotiation_points = []
            red_flag = None
        elif payment_percentage < 15:
            score = 10
            recommendation = f"Payment of ${payment:.2f} ({payment_percentage:.1f}% of income) is manageable."
            negotiation_points = ["Consider if you can negotiate payment down further"]
            red_flag = None
        elif payment_percentage < 20:
            score = 5
            recommendation = f"Payment of ${payment:.2f} ({payment_percentage:.1f}% of income) is stretching your budget."
            negotiation_points = [
                f"Payment is {payment_percentage:.1f}% of income (recommended: <15%)",
                "Negotiate higher down payment to lower monthly payment",
                "Consider extending loan term (but watch total interest cost)"
            ]
            red_flag = None
        else:
            score = 0
            recommendation = f"Payment of ${payment:.2f} ({payment_percentage:.1f}% of income) is NOT affordable."
            negotiation_points = [
                f"CRITICAL: Payment is {payment_percentage:.1f}% of income (max recommended: 15%)",
                "This vehicle is too expensive for your budget",
                "Consider a less expensive vehicle"
            ]
            red_flag = f"Unaffordable: Payment is {payment_percentage:.1f}% of monthly income"
        
        return {
            "score": score,
            "recommendation": recommendation,
            "negotiation_points": negotiation_points,
            "red_flag": red_flag
        }
    
    @staticmethod
    def _analyze_down_payment(down_payment: Optional[str]) -> Dict:
        """Analyze down payment amount"""
        # ✅ Use _has_value instead of "if not"
        if not NegotiationRules._has_value(down_payment):
            return {
                "score": 5,
                "warning": "Down payment not specified in contract"
            }
        
        down = NegotiationRules._extract_number(down_payment)
        if not down:
            return {"score": 5, "warning": "Could not parse down payment"}
        
        if 2000 <= down <= 5000:
            score = 10
            recommendation = f"Down payment of ${down:.2f} is in the standard range."
            negotiation_points = []
        elif down < 2000:
            score = 5
            recommendation = f"Low down payment of ${down:.2f}. This will result in higher monthly payments."
            negotiation_points = [
                f"Consider increasing down payment from ${down:.2f} to $3,000-5,000",
                "Higher down payment = lower monthly payments and less interest"
            ]
        elif down <= 8000:
            score = 7
            recommendation = f"High down payment of ${down:.2f}. Good for reducing monthly costs."
            negotiation_points = []
        else:
            score = 3
            recommendation = f"Very high down payment of ${down:.2f}. Question if lease/loan is the best option."
            negotiation_points = [
                f"Down payment of ${down:.2f} is very high",
                "Consider if buying outright makes more sense"
            ]
        
        return {
            "score": score,
            "recommendation": recommendation,
            "negotiation_points": negotiation_points
        }
    
    @staticmethod
    def _analyze_term(lease_term_months: Optional[int]) -> Dict:
        """Analyze lease/loan term duration"""
        # ✅ Use _has_value instead of "if not"
        if not NegotiationRules._has_value(lease_term_months):
            return {
                "score": 7,
                "warning": "Lease term not specified in contract"
            }
        
        if 24 <= lease_term_months <= 36:
            score = 15
            recommendation = f"Lease term of {lease_term_months} months is ideal."
            negotiation_points = []
            red_flag = None
        elif 37 <= lease_term_months <= 48:
            score = 10
            recommendation = f"Lease term of {lease_term_months} months is acceptable."
            negotiation_points = [
                f"Consider negotiating down to 36-month term if possible"
            ]
            red_flag = None
        elif 49 <= lease_term_months <= 60:
            score = 5
            recommendation = f"Lease term of {lease_term_months} months is risky."
            negotiation_points = [
                f"{lease_term_months}-month term is too long",
                "Negotiate for 36-month term or consider cheaper vehicle"
            ]
            red_flag = f"Risky term: {lease_term_months} months"
        else:
            score = 0
            recommendation = f"Lease term of {lease_term_months} months is excessively long."
            negotiation_points = [
                f"CRITICAL: {lease_term_months}-month term is too long"
            ]
            red_flag = f"CRITICAL: Excessive term of {lease_term_months} months"
        
        return {
            "score": score,
            "recommendation": recommendation,
            "negotiation_points": negotiation_points,
            "red_flag": red_flag
        }
    
    @staticmethod
    def _analyze_mileage(mileage_allowance: Optional[str], overage_charge: Optional[str]) -> Dict:
        """Analyze mileage allowance and overage charges"""
        results = {"score": 10, "recommendation": "", "negotiation_points": []}
        
        # ✅ Use _has_value instead of "if not"
        if not NegotiationRules._has_value(mileage_allowance):
            results["warning"] = "Mileage allowance not specified"
            results["recommendation"] = "Confirm annual mileage allowance before signing."
            return results
        
        miles_match = re.search(r'(\d+(?:,\d+)?)', str(mileage_allowance))
        if miles_match:
            miles = int(miles_match.group(1).replace(',', ''))
            
            if miles >= 15000:
                results["score"] = 10
                results["recommendation"] = f"High mileage allowance of {miles:,} miles/year is good."
            elif miles >= 12000:
                results["score"] = 10
                results["recommendation"] = f"Standard mileage allowance of {miles:,} miles/year."
            elif miles >= 10000:
                results["score"] = 7
                results["recommendation"] = f"Low mileage allowance of {miles:,} miles/year."
                results["negotiation_points"].append(f"Consider negotiating up to 12,000-15,000 miles")
            else:
                results["score"] = 3
                results["recommendation"] = f"Very low mileage allowance of {miles:,} miles/year."
                results["negotiation_points"].append(f"CRITICAL: {miles:,} miles/year is very low")
                results["red_flag"] = f"Very low mileage: {miles:,} miles/year"
        
        if NegotiationRules._has_value(overage_charge):
            overage = NegotiationRules._extract_number(overage_charge)
            if overage:
                if overage >= 0.30:
                    results["negotiation_points"].append(f"CRITICAL: Excessive overage rate of ${overage:.2f}/mile")
                    results["red_flag"] = f"Excessive overage charge: ${overage:.2f}/mile"
                elif overage >= 0.25:
                    results["negotiation_points"].append(f"High overage rate of ${overage:.2f}/mile")
        
        return results
    
    @staticmethod
    def _analyze_early_termination(early_termination_fee: Optional[str]) -> Dict:
        """Analyze early termination fees"""
        # ✅ Use _has_value instead of "if not"
        if not NegotiationRules._has_value(early_termination_fee):
            return {
                "score": 3,
                "warning": "Early termination fee not specified"
            }
        
        fee = NegotiationRules._extract_number(early_termination_fee)
        if not fee:
            return {"score": 3, "warning": "Could not parse early termination fee"}
        
        if fee == 0:
            return {"score": 5, "recommendation": "Excellent! No early termination fee."}
        elif fee <= 500:
            return {"score": 3, "recommendation": f"Early termination fee of ${fee:.2f} is acceptable."}
        elif fee <= 1000:
            return {
                "score": 1,
                "recommendation": f"High early termination fee of ${fee:.2f}.",
                "negotiation_points": [f"Negotiate early termination fee down from ${fee:.2f}"]
            }
        else:
            return {
                "score": 0,
                "recommendation": f"Excessive early termination fee of ${fee:.2f}.",
                "negotiation_points": [f"CRITICAL: ${fee:.2f} early termination fee is excessive"],
                "red_flag": f"Excessive early termination fee: ${fee:.2f}"
            }
    
    @staticmethod
    def _analyze_late_fee(late_fee: Optional[str]) -> Dict:
        """Analyze late payment fees"""
        # ✅ Use _has_value instead of "if not"
        if not NegotiationRules._has_value(late_fee):
            return {"score": 3, "warning": "Late payment fee not specified"}
        
        fee = NegotiationRules._extract_number(late_fee)
        if not fee:
            return {"score": 3, "warning": "Could not parse late fee"}
        
        if fee <= 25:
            return {"score": 5, "recommendation": f"Acceptable late fee of ${fee:.2f}."}
        elif fee <= 35:
            return {"score": 3, "recommendation": f"Standard late fee of ${fee:.2f}."}
        elif fee <= 50:
            return {
                "score": 1,
                "recommendation": f"High late fee of ${fee:.2f}.",
                "negotiation_points": [f"Negotiate late fee down from ${fee:.2f}"]
            }
        else:
            return {
                "score": 0,
                "recommendation": f"Excessive late fee of ${fee:.2f}.",
                "negotiation_points": [f"CRITICAL: ${fee:.2f} late fee is excessive"],
                "red_flag": f"Excessive late fee: ${fee:.2f}"
            }
    
    @staticmethod
    def _prioritize_negotiations(negotiation_points: List[str]) -> List[Dict]:
        """Prioritize negotiation points by importance"""
        priorities = []
        
        for point in negotiation_points:
            if any(word in point.lower() for word in ['critical', 'excessive', 'predatory']):
                priority = "HIGH"
            elif any(word in point.lower() for word in ['negotiate', 'high', 'risky']):
                priority = "MEDIUM"
            else:
                priority = "LOW"
            
            priorities.append({
                "priority": priority,
                "point": point
            })
        
        priority_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
        priorities.sort(key=lambda x: priority_order[x["priority"]])
        
        return priorities