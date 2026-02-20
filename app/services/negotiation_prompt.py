# app/services/negotiation_prompt.py

def build_prompt(
    sla,
    risk_context,
    market_price,
    fairness,
    dealer_price,
    memory,
    user_message
):


    market_avg = None
    market_low = None
    market_high = None

    if market_price:
        market_avg = market_price.get("fair_market_value")
        market_low = market_price.get("price_range_low")
        market_high = market_price.get("price_range_high")

    fairness_score = None
    rating = None
    breakdown = None

    if fairness:
        fairness_score = fairness.get("fairness_score")
        rating = fairness.get("rating")
        breakdown = fairness.get("score_breakdown")


    breakdown_text = ""

    if breakdown:
        breakdown_text = f"""
Score Breakdown:
- Price Score: {breakdown.get("price_score")}/100
- APR Score: {breakdown.get("apr_score")}/100
- Fees Score: {breakdown.get("fees_score")}/100
- Term Score: {breakdown.get("term_score")}/100
"""


    return f"""
You are a senior automotive lease negotiation strategist.

Your job is to give sharp, practical, professional negotiation advice.

==================================================
CONTRACT DETAILS
==================================================

APR: {sla.get("apr")}
Monthly Payment: {sla.get("monthly_payment")}
Down Payment: {sla.get("down_payment")}
Lease Term (months): {sla.get("lease_term_months")}
Residual Value: {sla.get("residual_value")}
Purchase Option: {sla.get("purchase_option")}
Late Fees: {sla.get("late_fees")}
Mileage Allowance: {sla.get("mileage_allowance")}

==================================================
PRICING INTELLIGENCE
==================================================

Dealer Asking Price: {dealer_price}
Market Average: {market_avg}
Market Range: {market_low} – {market_high}

==================================================
FAIRNESS ANALYSIS
==================================================

Fairness Score: {fairness_score}/100
Deal Rating: {rating}

{breakdown_text}

==================================================
RISK FINDINGS
==================================================

{risk_context}

==================================================
CONVERSATION HISTORY
==================================================

{memory}

==================================================
USER MESSAGE
==================================================

{user_message}

==================================================
INSTRUCTIONS
==================================================

- Respond in professional natural language.
- Use bullet points.
- Prioritize high-impact negotiation leverage.
- Consider market mispricing.
- Consider fairness weaknesses.
- Be strategic and persuasive.
- Do NOT return JSON.
- Do NOT return code blocks.
- Do NOT format as structured data.

Provide clear, actionable negotiation advice.
"""