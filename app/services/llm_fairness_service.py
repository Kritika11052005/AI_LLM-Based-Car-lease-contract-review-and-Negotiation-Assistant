import json
from app.services.llm_client import call_llm


def normalize_score(score):
    """
    Normalize score to 0–100 range.

    Handles:
    0.65 -> 65
    6.5  -> 65
    65   -> 65
    """

    try:

        score = int(score)

        # 0–1 range
        if 0 <= score <= 1:
            score = score * 100

        # 0–10 range
        elif 0 < score <= 10:
            score = score * 10

        return round(score, 1)

    except Exception as e:

        print("Score normalization error:", e)

        return None


def calculate_llm_fairness_score(sla, market_price, vehicle):

    print("Starting fairness calculation")

    if not sla or not market_price or not vehicle:

        print("Missing required data")

        return None

    prompt = f"""
You are an expert automotive lease analyst.

Return ONLY valid JSON.

IMPORTANT:
fairness_score must be between 0 and 100.

Vehicle:
{json.dumps(vehicle)}

Market Price:
{json.dumps(market_price)}

Lease Terms:
{json.dumps(sla)}

JSON format:

{{
"fairness_score": number,
"rating": "Excellent Deal" or "Good Deal" or "Fair Deal" or "Bad Deal",
"explanation": string,
"negotiation_power": "Low" or "Moderate" or "High",
"recommended_action": string
}}
"""

    try:

        response = call_llm(prompt)

        print("Raw LLM response:", response)

        if not response:

            print("Empty LLM response")

            return None

        response = response.strip()

        # Remove markdown wrapping if present
        if response.startswith("```"):
            response = response.replace("```json", "")
            response = response.replace("```", "")
            response = response.strip()

        fairness = json.loads(response)

        raw_score = fairness.get("fairness_score")

        normalized_score = normalize_score(raw_score)

        fairness["fairness_score"] = normalized_score

        print("Final fairness object:", fairness)

        return fairness

    except Exception as e:

        print("Fairness generation error:", str(e))

        return None