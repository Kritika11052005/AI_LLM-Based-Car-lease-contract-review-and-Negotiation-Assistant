import os
import re
import json
import uuid
import requests
import logging
from sqlalchemy.orm import Session
from langchain_core.prompts import ChatPromptTemplate

# Internal Imports
from app.schemas import ContractSLA
from app.models import Contract, ContractSLA as ContractSLAModel, Vehicle, Extraction 
from app.services.negotiation_engine import generate_negotiation_plan
from app.services.llm_config import llm_extraction, chat_llm
from app.marketcheck_service import get_market_valuation

logger = logging.getLogger(__name__)

# --- EXTRACTION CHAIN ---
structured_llm = llm_extraction.with_structured_output(ContractSLA)

SLA_PROMPT = """
# UPDATE THIS IN YOUR main.py
You are a Lease Audit Expert. Extract the following 11 fields from the text provided.
If a value is not explicitly found, use your reasoning to find synonyms.

### FIELD MAPPING GUIDE:
1. APR: Look for 'Money Factor' (multiply by 2400), 'Rent Charge', or 'Lease Rate'.
2. Term: Look for 'Number of Months' or 'Lease Period'.
3. Monthly Payment: Extract the 'Base Monthly Payment' (excluding tax if possible).
4. Down Payment: Look for 'Capitalized Cost Reduction' or 'Total Amount Due at Signing'.
5. Residual Value: Look for 'Purchase Option Price at End of Term'.
6. Annual Miles: Look for 'Mileage Allowance' or 'Miles per Year'.
7. Termination: Look for 'Disposition Fee' or 'Early Termination' terms.
8. Buyout Option: This is usually the same as Residual Value + a small fee (e.g., $350).
9. Maintenance: Look for 'Service Contract' or 'Lessee Responsibility'.
10. Warranty: Search for 'Manufacturer's Warranty' or 'Remaining Coverage'.
11. Late Fees: Look for 'Late Charge', 'Default Penalty', or 'Overdue Amount'.

### FORMATTING RULES FOR GROQ/GEMINI:
- For 'residual_value', 'monthly_payment', 'term_months', 'down_payment', 'annual_miles': 
  Return as NUMBERS only. No quotes, no commas, no $.
- For 'late_fee_policy': Return the FULL SENTENCE as a string.
- For missing fields: Return the JSON value null. Do not write "N/A" or "None".

Contract Text:
{text}
"""
extraction_prompt = ChatPromptTemplate.from_template(SLA_PROMPT)
extraction_chain = extraction_prompt | structured_llm

# --- UTILITIES ---
def extract_vin_with_regex(text: str):
    pattern = r'\b[A-HJ-NPR-Z0-9]{17}\b'
    match = re.search(pattern, text)
    if match:
        vin = match.group(0)
        return vin.replace('O', '0').replace('I', '1').replace('Q', '0')
    return None

def get_nhtsa_vehicle_data(vin: str):
    if not vin: return None
    url = f"https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{vin}?format=json"
    try:
        response = requests.get(url, timeout=10)
        data = response.json()
        if "Results" in data and len(data["Results"]) > 0:
            res = data["Results"][0]
            return {
                "make": res.get("Make"),
                "model": res.get("Model"),
                "year": res.get("ModelYear")
            }
    except Exception: return None

def get_nhtsa_recalls(make: str, model: str, year: str):
    if not all([make, model, year]): return []
    clean_make, clean_model, clean_year = str(make).upper(), str(model).upper(), str(year)
    url = f"https://api.nhtsa.gov/recalls/recallsByVehicle?make={clean_make}&model={clean_model}&modelYear={clean_year}&format=json"
    try:
        response = requests.get(url, timeout=10)
        data = response.json()
        results = data.get("results", [])
        return [{"component": r.get("Component"), "summary": r.get("Summary")[:200] + "..."} for r in results]
    except Exception: return []

# --- MAIN EXECUTOR ---

def extract_sla_data(db: Session, contract_id: str):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract or not contract.raw_text:
        return {"error": "No OCR text found."}

    try:
        # 1. VIN & External Specs
        vin_found = extract_vin_with_regex(contract.raw_text)
        vehicle_details = get_nhtsa_vehicle_data(vin_found) if vin_found else {}

        # 2. Market Valuation
        market_info = get_market_valuation(
            vin=vin_found, 
            make=vehicle_details.get("make"), 
            model=vehicle_details.get("model"), 
            year=vehicle_details.get("year")
        )
        market_price = market_info.get("marketcheck_price", 0)

        # 3. LLM Data Extraction
        truncated_text = contract.raw_text[:12000]
        result = extraction_chain.invoke({"text": truncated_text})
        sla_dict = result.dict() if hasattr(result, 'dict') else result

        # 4. Scoring Logic (Passing real market_price to the engine)
        flags, score = generate_negotiation_plan(sla_dict, vehicle_details, market_price=market_price)

        # 5. Safety Data (Recalls)
        recalls = get_nhtsa_recalls(
            vehicle_details.get("make"), 
            vehicle_details.get("model"), 
            vehicle_details.get("year")
        )

        # 6. Persistence (Vehicle & SLA)
        if vin_found:
            vehicle = db.query(Vehicle).filter(Vehicle.vin == vin_found).first()
            if not vehicle:
                vehicle = Vehicle(
                    id=uuid.uuid4(), vin=vin_found,
                    make=vehicle_details.get("make"), model=vehicle_details.get("model"),
                    year=int(vehicle_details.get("year")) if str(vehicle_details.get("year")).isdigit() else None
                )
                db.add(vehicle)
                db.flush()
            contract.vehicle_id = vehicle.id
            contract.vin = vin_found

        sla_record = db.query(ContractSLAModel).filter(ContractSLAModel.contract_id == contract.id).first()
        if not sla_record:
            sla_record = ContractSLAModel(id=uuid.uuid4(), contract_id=contract.id)
            db.add(sla_record)

        for key, value in sla_dict.items():
            if hasattr(sla_record, key):
                setattr(sla_record, key, value)
        
        sla_record.fairness_score = score
        sla_record.negotiation_report = flags

        # 7. Audit Logging
        db.add(Extraction(id=uuid.uuid4(), contract_id=contract.id, status="completed", raw_output=sla_dict))
        
        db.commit()

        # 8. FINAL RETURN: Ensuring keys match the Streamlit p.get() calls
        return {
            "status": "Success",
            "contract_id": str(contract.id),
            "contract_profile": {
                "vin": vin_found,
                "make": vehicle_details.get("make"),
                "model": vehicle_details.get("model"),
                "year": vehicle_details.get("year"),
                "sla": sla_dict,
                "market_value": market_price,  # Matched to Frontend
                "score": score,               # Matched to Frontend
                "recalls": recalls             # Matched to Frontend
            }
        } 

    except Exception as e:
        db.rollback()
        logger.error(f"Extraction failed: {e}")
        return {"error": str(e)}