import io
import os
from fastapi import FastAPI, UploadFile, File
from PyPDF2 import PdfReader
import pytesseract
from pdf2image import convert_from_bytes

from app.database import SessionLocal, engine
from app.database import SessionLocal, engine
from app.database import Base
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Milestone-1: Secure Document Upload & Store")

#------MILESTONE 1-------#
@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    content = await file.read()
    name = file.filename.lower()

    if not name.endswith(".pdf"):
        return {"error": "Only PDF files are supported"}

    extracted_text = ""
    reader = PdfReader(io.BytesIO(content))
    for page in reader.pages:
        extracted_text += page.extract_text() or ""
    if extracted_text.strip() == "":
        images = convert_from_bytes(content)
        for img in images:
            extracted_text += pytesseract.image_to_string(img)

    db = SessionLocal()
    try:
        new_contract = Contract(file_name=file.filename, raw_text=extracted_text)
        db.add(new_contract)
        db.commit()
        db.refresh(new_contract)
    finally:
        db.close()

    return {
        "message": "Contract uploaded and stored securely",
        "db_id": new_contract.id,
        "file_name": file.filename,
        "text_length": len(extracted_text)
    }

#-----MILESTONE 2-----#

from fastapi import FastAPI
from app.database import SessionLocal

from app.models import Contract
from app.ai_utils import extract_sla

@app.post("/extract-sla/{contract_id}")              #------WEEK3----#
def extract_sla_for_contract(contract_id: int):
    db = SessionLocal()

    try:
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            return {"error": "Contract not found"}

        sla = extract_sla(contract.raw_text)
    
        contract.apr = sla.apr
        contract.lease_term_months = sla.lease_term_months
        contract.monthly_payment = sla.monthly_payment
        contract.down_payment = sla.down_payment
        contract.residual_value = sla.residual_value
        contract.mileage_allowance = sla.mileage_allowance
        contract.early_termination_clause = sla.early_termination_clause
        contract.purchase_option = sla.purchase_option
        contract.late_fees = sla.late_fees

        db.commit()
        db.refresh(contract) 

        return {
            "message": "SLA extracted successfully",
            "contract_id": contract_id,
            "sla": sla.dict()
        }

    except Exception as e:
        return {"error": str(e)}

    finally:
        db.close()

from app.database import SessionLocal
from app.models import Contract
from app.vin_utils import extract_vin, decode_vin, fetch_recalls
import json

@app.post("/extract-vin/{contract_id}")                          #-------week4--------#
def extract_vin_for_contract(contract_id: int):
    db = SessionLocal()

    try:
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract or not contract.raw_text:
            return {"error": "No OCR text found"}

        vin = extract_vin(contract.raw_text)
        print(f"Extracted VIN: {vin}")
        
        if not vin:
            return {"error": "No VIN found in text"}
        
        contract.vin = vin

        vehicle_details = decode_vin(vin)
        print(f"Vehicle details: {vehicle_details}")

        recalls = []

        if vehicle_details and all([
            vehicle_details.get("make"),
            vehicle_details.get("model"),
            vehicle_details.get("year")
        ]):
            recalls = fetch_recalls(
                vehicle_details["make"],
                vehicle_details["model"],
                vehicle_details["year"]
            )
        
        if vehicle_details:
            contract.vehicle_make = vehicle_details.get("make")
            contract.vehicle_model = vehicle_details.get("model")
            contract.vehicle_year = vehicle_details.get("year")
            contract.vehicle_type = vehicle_details.get("type")  
        else:
            
            contract.vehicle_make = None
            contract.vehicle_model = None
            contract.vehicle_year = None
            contract.vehicle_type = None
        
        contract.recalls = json.dumps(recalls) if recalls else None
        
        db.commit()
        db.refresh(contract)
        
        print(f"Saved to DB: make={contract.vehicle_make}, model={contract.vehicle_model}, year={contract.vehicle_year}, type={contract.vehicle_type}")
        
         # COMBINED RESPONSE 
        return {
            "status": "success",
            "message": "VIN extracted and vehicle data retrieved successfully",
            "contract_data": {
                "contract_id": contract.id,
                "file_name": contract.file_name,
                
                "sla_data": {
                    "apr": contract.apr,
                    "lease_term_months": contract.lease_term_months,
                    "monthly_payment": contract.monthly_payment,
                    "down_payment": contract.down_payment,
                    "residual_value": contract.residual_value,
                    "mileage_allowance": contract.mileage_allowance,
                    "early_termination_clause": contract.early_termination_clause,
                    "purchase_option": contract.purchase_option,
                    "late_fees": contract.late_fees
                },
                
                "vin": contract.vin,
                "vehicle_make": contract.vehicle_make,
                "vehicle_model": contract.vehicle_model,
                "vehicle_year": contract.vehicle_year,
                "vehicle_type": contract.vehicle_type,
                "has_recalls": contract.recalls is not None
            },
            "vehicle_details": vehicle_details or {},
            "recalls": recalls,
            "extraction_summary": {
                "vin_found": bool(vin),
                "vehicle_data_retrieved": bool(vehicle_details),
                "recalls_found": len(recalls) if recalls else 0,
                
            }
        }
    except Exception as e:
        db.rollback()
        print(f"Error: {str(e)}")
        return {"error": str(e)}

    finally:
        db.close()