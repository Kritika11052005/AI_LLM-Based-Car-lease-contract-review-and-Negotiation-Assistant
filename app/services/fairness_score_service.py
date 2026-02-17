import json
from app.services.llm_client import call_llm


def generate_fairness_score_llm(sla, market_price, vehicle):

    prompt = f"""
You are an expert car lease financial analyst.

Evaluate the fairness of this lease contract.

Vehicle:
{json.dumps(vehicle, indent=2)}

Market Price Data:
{json.dumps(market_price, indent=2)}

Lease Contract Terms:
{json.dumps(sla, indent=2)}

Evaluate fairness based on:

• APR vs market norms
• Monthly payment vs fair market value
• Down payment reasonableness
• Purchase option fairness
• Residual value fairness

Return ONLY valid JSON in this format:

{{
  "fairness_score": number_between_0_and_100,
  "rating": "Excellent | Good | Average | Poor",
  "explanation": "clear explanation",
  "negotiation_power": "Strong | Moderate | Weak",
  "recommended_action": "what user should do"
}}
"""

    try:

        response = call_llm(prompt)

        # Try parse JSON
        start = response.find("{")
        end = response.rfind("}") + 1

        json_str = response[start:end]

        data = json.loads(json_str)

        return data

    except Exception as e:

        print("LLM fairness parse error:", e)

        return {
            "fairness_score": 50,
            "rating": "Unknown",
            "explanation": "LLM parsing failed",
            "negotiation_power": "Unknown",
            "recommended_action": "Review manually"
        }
