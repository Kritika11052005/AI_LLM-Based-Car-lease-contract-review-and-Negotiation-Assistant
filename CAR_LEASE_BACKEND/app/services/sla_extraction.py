import json
import os

import google.generativeai as genai
from dotenv import load_dotenv
from pydantic import ValidationError

from app.models.sla import SLAData

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is not set. Add it to your .env file.")

genai.configure(api_key=GEMINI_API_KEY)

MODEL_ID = "gemini-2.5-flash"

SLA_PROMPT = """
You are a contract analysis assistant.

Extract the following SLA fields from the contract.

Definitions:
- apr: The annual percentage rate or interest rate charged on the lease or financing.
- lease_term_months: Total length of the lease in months.
- monthly_payment: Regular periodic payment amount.
- down_payment: Upfront amount paid at lease start.
- residual_value: Buyout price or estimated vehicle value at end of lease.
- mileage_allowance: Maximum allowed mileage over the lease or per year.
- early_termination_clause: Rules, fees, or penalties for ending the lease early.
- purchase_option: Whether and how the lessee can purchase the vehicle at lease end.
- late_fees: Penalties for late payments.

If a field is not explicitly present, return null.

Return strictly valid JSON with exactly these keys:

{
  "apr": null,
  "lease_term_months": null,
  "monthly_payment": null,
  "down_payment": null,
  "residual_value": null,
  "mileage_allowance": null,
  "early_termination_clause": null,
  "purchase_option": null,
  "late_fees": null
}

Contract text:
{{TEXT_FROM_DB}}
"""

def _build_prompt(contract_text: str) -> str:
    return SLA_PROMPT.replace("{{TEXT_FROM_DB}}", contract_text)

def extract_sla_fields(contract_text: str) -> SLAData:
    """Extract SLA fields from contract text using Gemini LLM and return validated Pydantic model"""
    if not contract_text or not contract_text.strip():
        raise ValueError("Contract text is empty; cannot extract SLA fields.")

    prompt = _build_prompt(contract_text)
    prompt_with_json = f"{prompt}\n\nYou must respond with ONLY valid JSON, no markdown, no explanations."
    
    model = genai.GenerativeModel(MODEL_ID)

    try:
        response = model.generate_content(prompt_with_json)
    except Exception as exc:
        raise ValueError(f"Gemini request failed: {exc}") from exc

    raw_output = response.text or ""
    
    # Remove markdown code blocks if present
    if raw_output.startswith("```json"):
        raw_output = raw_output.replace("```json", "").replace("```", "").strip()
    elif raw_output.startswith("```"):
        raw_output = raw_output.replace("```", "").strip()

    try:
        parsed = json.loads(raw_output)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Gemini did not return valid JSON. Response: {raw_output[:200]}") from exc

    # Validate and parse using Pydantic model (includes field validators for currency replacement)
    try:
        sla_data = SLAData(**parsed)
        return sla_data
    except ValidationError as exc:
        raise ValueError(f"Invalid SLA data structure: {exc}") from exc
