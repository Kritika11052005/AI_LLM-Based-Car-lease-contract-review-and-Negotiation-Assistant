import os
import re
import json
import uuid
import requests
from sqlalchemy.orm import Session
from langchain_core.prompts import ChatPromptTemplate
from app.schemas import ContractSLA
from app.models import Contract, ContractSLA as ContractSLAModel, Vehicle, Extraction 
from app.services.negotiation_engine import generate_negotiation_plan
# Import from the new config file to break the circular dependency
from app.services.llm_config import llm_extraction, chat_llm
# --- EXTRACTION CHAIN ---
structured_llm = llm_extraction.with_structured_output(ContractSLA)

SLA_PROMPT = """
You are a car lease auditor. Extract exactly 11 fields from the contract text below.
STRICT RULES:
1. NO MATH: Calculate final numbers.
2. NUMERIC ONLY: For currency amounts, provide the number ONLY. 
3. CURRENCY SYMBOLS: Keep symbols in text fields like 'late_fee_policy'.
4. Return null if field not found.

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
def get_nhtsa_recalls(make, model, year):
    if not (make and model and year): 
        return []
    url = f"https://api.nhtsa.gov/recalls/recallsByVehicle?make={make}&model={model}&modelYear={year}&format=json"
    try:
        response = requests.get(url, timeout=10)
        data = response.json()
        if "results" in data:
            return [{"component": r.get("Component"), "summary": r.get("Summary")[:200] + "..."} for r in data["results"]]
    except Exception: 
        return []
    return []
# --- MAIN EXECUTOR ---

def extract_sla_data(db: Session, contract_id: str):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract or not contract.raw_text:
        return {"error": "No OCR text found for this contract ID."}

    try:
        # 1. VIN & External Specs
        vin_found = extract_vin_with_regex(contract.raw_text)
        vehicle_details = get_nhtsa_vehicle_data(vin_found) if vin_found else None

        if vin_found:
            vehicle = db.query(Vehicle).filter(Vehicle.vin == vin_found).first()
            if not vehicle:
                vehicle = Vehicle(
                    id=uuid.uuid4(),
                    vin=vin_found,
                    make=vehicle_details.get("make") if vehicle_details else None,
                    model=vehicle_details.get("model") if vehicle_details else None,
                    year=int(vehicle_details.get("year")) if vehicle_details and vehicle_details.get("year").isdigit() else None
                )
                db.add(vehicle)
                db.flush()
            contract.vehicle_id = vehicle.id
            contract.vin = vin_found 

        # 2. LLM Extraction (70b)
        truncated_text = contract.raw_text[:12000]
        result = extraction_chain.invoke({"text": truncated_text})
        sla_dict = result.dict() if hasattr(result, 'dict') else result

        # 3. Negotiation Logic (Calling the engine which uses 8b)
        flags, score = generate_negotiation_plan(sla_dict)

        # 4. Persistence to contract_sla table
        sla_record = db.query(ContractSLAModel).filter(ContractSLAModel.contract_id == contract.id).first()
        if not sla_record:
            sla_record = ContractSLAModel(id=uuid.uuid4(), contract_id=contract.id)
            db.add(sla_record)

        for key, value in sla_dict.items():
            if hasattr(sla_record, key):
                setattr(sla_record, key, value)
        
        sla_record.fairness_score = score
        sla_record.negotiation_report = flags

        # 5. Persistence to extractions table (Audit)
        db.add(Extraction(
            id=uuid.uuid4(),
            contract_id=contract.id,
            status="completed",
            raw_output=sla_dict
        ))

        db.commit()
        return {"status": "Success", "score": score, "data": sla_dict}

    except Exception as e:
        db.rollback()
        return {"error": f"Extraction failed: {str(e)}"}