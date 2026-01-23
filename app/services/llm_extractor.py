import os
import re
import requests
import json
from sqlalchemy.orm import Session
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from app.models import Contract
from app.schemas import ContractSLA
from dotenv import load_dotenv

load_dotenv()

# --- LLM SETUP ---
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash", 
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0
)
structured_llm = llm.with_structured_output(ContractSLA)

SLA_PROMPT = """
You are a specialized car lease auditor. 
Extract the SLA details from the contract text below. 
If a field is not found, return null.

Contract Text:
{text}
"""
prompt = ChatPromptTemplate.from_template(SLA_PROMPT)
modern_chain = prompt | structured_llm

# --- WEEK 4 UTILITIES ---

def extract_vin_with_regex(text: str):
    """Improved Regex for VIN Extraction"""
    # 1. First, try to find a 17-character string that looks like a VIN
    # This pattern is slightly more relaxed to catch OCR errors
    potential_vin_pattern = r'\b[A-Z0-9]{17}\b'
    match = re.search(potential_vin_pattern, text)
    
    if match:
        vin = match.group(0)
        # 2. Basic OCR cleaning: Replace 'O' with '0' and 'I' with '1' 
        # as these are common mistakes in car document OCR.
        vin = vin.replace('O', '0').replace('I', '1').replace('Q', '0')
        return vin
    
    return None

def get_nhtsa_vehicle_data(vin: str):
    """NHTSA API Lookup for Specs"""
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
    except Exception:
        return None

def get_nhtsa_recalls(make: str, model: str, year: str):
    """NHTSA API Lookup for Safety Recalls"""
    if not (make and model and year):
        return []
    
    url = f"https://api.nhtsa.gov/recalls/recallsByVehicle?make={make}&model={model}&modelYear={year}&format=json"
    try:
        response = requests.get(url, timeout=10)
        data = response.json()
        if "results" in data:
            # We return a list of simplified recall objects
            return [
                {"component": r.get("Component"), "summary": r.get("Summary")[:200] + "..."} 
                for r in data["results"]
            ]
    except Exception:
        return []
    return []

# --- MAIN EXECUTOR ---

def extract_sla_data(db: Session, contract_id: int):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract or not contract.raw_text:
        return {"error": "No OCR text found."}

    try:
        # 1. Regex Task (Identify the car)
        vin_found = extract_vin_with_regex(contract.raw_text)
        
        # 2. LLM Task (Analyze the agreement)
        result = modern_chain.invoke({"text": contract.raw_text})

        # 3. API Tasks (External verification & Safety check)
        vehicle_details = get_nhtsa_vehicle_data(vin_found) if vin_found else None
        
        recall_history = []
        if vehicle_details and vehicle_details.get("make"):
            recall_history = get_nhtsa_recalls(
                vehicle_details.get("make"),
                vehicle_details.get("model"),
                vehicle_details.get("year")
            )

        # 4. Save everything to DB
        contract.vin = vin_found
        for key, value in result.dict().items():
            setattr(contract, key, value)
        
        if vehicle_details:
            contract.vehicle_make = vehicle_details.get("make")
            contract.vehicle_model = vehicle_details.get("model")
            contract.vehicle_year = vehicle_details.get("year")
            # Store recalls as a JSON string for the DB
            contract.recalls = json.dumps(recall_history)

        db.commit()

        # 5. Combined Response (Final Week 4 Deliverable)
        return {
            "status": "Success",
            "vin_extracted": vin_found,
            "vehicle_verification": {
                "specs": vehicle_details,
                "recalls": recall_history
            } if vin_found else "No valid 17-digit VIN detected.",
            "contract_analysis": result.dict(),
            "warnings": [] if vin_found else ["Vehicle verification skipped: VIN not found."]
        }
    except Exception as e:
        db.rollback()
        return {"error": str(e)}