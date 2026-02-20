# app/services/dealer_price_service.py

import json
from app.services.llm_client import call_llm


def extract_dealer_price(raw_text: str):
    """
    Uses LLM to extract dealer asking price from raw contract text.
    Returns float or None.
    """

    print("\nStarting dealer price extraction...")

    if not raw_text:
        print("No raw text provided.")
        return None

    prompt = f"""
You are a financial contract extraction engine.

Extract ONLY the dealer asking price or vehicle selling price.

Rules:
- Return ONLY valid JSON
- No markdown
- No explanation
- If not clearly found, return null
- Remove currency symbols ($, ₹, commas)

Format:

{{
  "dealer_price": null
}}

Contract text:
\"\"\"{raw_text}\"\"\"
"""

    try:
        response = call_llm(prompt)

        if not response:
            return None

        response = response.strip()

        if response.startswith("```"):
            response = response.replace("```json", "")
            response = response.replace("```", "")
            response = response.strip()

        start = response.find("{")
        end = response.rfind("}") + 1

        if start == -1 or end == -1:
            return None

        data = json.loads(response[start:end])

        price = data.get("dealer_price")

        if price is None:
            return None

        return float(price)

    except Exception as e:
        print("Dealer price extraction error:", e)
        return None