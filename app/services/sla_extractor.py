import json
from app.services.llm_client import call_llm


def extract_sla(text: str):
    text = text[:8000]

    PROMPT = f"""
You are a contract data extraction engine.

Your job is to extract structured SLA data from a lease contract.

Return ONLY valid JSON.
Do NOT include markdown.
Do NOT include explanations.

Definitions:
- apr: Annual percentage rate (APR) or interest rate.
- lease_term_months: Total length of the lease in months.
- monthly_payment: Regular payment amount.
- down_payment: Upfront payment at lease start.
- residual_value: Buyout price or estimated value at end.
- mileage_allowance: Allowed mileage (per year or total).
- early_termination_clause: Fees or rules for ending early.
- purchase_option: Buyout option and price.
- late_fees: Penalties for late payment.

Number rules:
- Convert all money and numeric values to numbers only.
- Remove symbols ($, ₹, %, commas).
- "36 months" → 36
- "$18,000" → 18000
- "2.9%" → 2.9
- "₹10,500" → 10500
- If not present → null

Return STRICT JSON with EXACT keys:

{{
  "apr": null,
  "lease_term_months": null,
  "monthly_payment": null,
  "down_payment": null,
  "residual_value": null,
  "mileage_allowance": null,
  "early_termination_clause": null,
  "purchase_option": null,
  "late_fees": null
}}

Contract text:
\"\"\"{text}\"\"\"
"""

    raw = call_llm(PROMPT)

    try:
        return json.loads(raw)
    except Exception:
        # fallback if model adds noise
        start = raw.find("{")
        end = raw.rfind("}") + 1
        return json.loads(raw[start:end])
