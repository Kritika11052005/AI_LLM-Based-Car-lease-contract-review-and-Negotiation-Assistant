import json
import os
from typing import Any, Dict

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

Contract text:
{{TEXT_FROM_DB}}
"""


def _build_prompt(contract_text: str) -> str:
    return SLA_PROMPT.replace("{{TEXT_FROM_DB}}", contract_text)


def extract_sla_fields(contract_text: str) -> SLAData:
    """Extract SLA fields using LangChain's structured output approach"""
    if not contract_text or not contract_text.strip():
        raise ValueError("Contract text is empty; cannot extract SLA fields.")

    prompt = _build_prompt(contract_text)
    
    try:
        model = genai.GenerativeModel(
            model_name=MODEL_ID,
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0,
            }
        )
        response = model.generate_content(prompt)
        raw_json = response.text.strip()
    except Exception as exc:
        raise ValueError(f"Gemini request failed: {exc}") from exc

    try:
        data_dict = json.loads(raw_json)
        sla_data = SLAData(**data_dict)
        return sla_data
    except (ValidationError, json.JSONDecodeError, TypeError) as exc:
        raise ValueError(f"Invalid SLA data: {exc}") from exc
