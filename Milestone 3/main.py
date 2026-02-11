import io
import os
from fastapi import FastAPI, UploadFile, File,HTTPException, Depends
from PyPDF2 import PdfReader
import pytesseract
from pdf2image import convert_from_bytes

from app.database import SessionLocal, engine, negotiation_engine, ContractBase, NegotiationBase ,get_db, get_negotiation_db
from app.models import Contract, NegotiationMessage
app = FastAPI(title="AI Car Lease Negotiation System")
from app.database import ContractBase, NegotiationBase 

ContractBase.metadata.create_all(bind=engine)
NegotiationBase.metadata.create_all(bind=negotiation_engine)

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
from fastapi import HTTPException
from app.models import Contract
from app.ai_utils import extract_sla

@app.post("/extract-sla/{contract_id}",response_model=dict)
def extract_sla_for_endpoint(contract_id: int):
    db = SessionLocal()

    try:
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            return {"error": "Contract not found"}
        print("RAW TEXT LENGTH:", len(contract.raw_text) if contract.raw_text else "NULL")

        # Call Gemini
        sla = extract_sla(contract.raw_text)

        # ✅ Store extracted fields
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
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


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

#---------------------MILESTONE 3 ------------------------#

from app.services.rule_engine import evaluate_sla_rules
from app.services.negotiation_llm import generate_negotiation_message

@app.post("/negotiate/{contract_id}")
def negotiate(contract_id: int):
    db = SessionLocal()
    
    try:
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            return {"error": "Contract not found"}
        
        # Get SLA data
        sla = {
            "apr": contract.apr,
            "lease_term_months": contract.lease_term_months,
            "monthly_payment": contract.monthly_payment,
            "down_payment": contract.down_payment,
            "residual_value": contract.residual_value,
            "mileage_allowance": contract.mileage_allowance,
            "early_termination_clause": contract.early_termination_clause,
            "late_fees": contract.late_fees,
            "purchase_option": contract.purchase_option
        }
        
        # 1. Check SLA against rules → Get triggered rules
        flags = evaluate_sla_rules(sla)

        severity_weights = {"critical": 25, "high": 15, "medium": 10, "low": 5, "none": 0}
        score = 100
        for flag in flags:
            if flag["severity"] != "none":
                score -= severity_weights.get(flag["severity"], 0)
        score = max(0, score)
        
        # 2. Create negotiation intents list from flags
        intents = []
        negotiation_intents_raw = []
        for flag in flags:
            # Convert issue to intent format: "High APR" → "high_apr"
            intent = flag.get("issue", "").lower().replace(" ", "_")
            if intent and intent not in intents:
                intents.append(intent)

            if "negotiation_intent" in flag and flag["negotiation_intent"]:
                negotiation_intents_raw.append(flag["negotiation_intent"])
        
        if not flags:
            return {
                "contract_id": contract_id,
                "triggered_rules": [],
                "negotiation_intents": [],
                "flags": [],
                "assistant_reply": "Your contract terms look fair. No negotiation needed.",
                "score": 100, 
                "thread_id": None  
            }
        
        # 3. Generate SINGLE negotiation message
        response = generate_negotiation_message(flags)

        thread_id = uuid.uuid4()
        
        # Store analysis in database
        analysis_summary = f"Contract Analysis for Contract #{contract_id}\n\n"
        analysis_summary += f"Score: {score}/100\n\n"
        analysis_summary += "Key Issues Found:\n"
        for flag in flags[:5]:  # Show top 5 issues
            analysis_summary += f"• {flag['issue']}: {flag['reason']}\n"
        
        # Add vehicle info if available
        if contract.vehicle_make:
            analysis_summary += f"\nVehicle: {contract.vehicle_year} {contract.vehicle_make} {contract.vehicle_model}"
        
        # Store in NegotiationMessage table
        analysis_message = NegotiationMessage(
            thread_id=thread_id,
            sender_role="ai",
            body=analysis_summary,
            suggested_text=analysis_summary,
            attachments={
                "contract_id": contract_id,
                "flags": flags,
                "score": score,
                "negotiation_intents": negotiation_intents_raw
            }
        )
        db.add(analysis_message)
        db.commit()
        
        return {
            "contract_id": contract_id,
            "thread_id": str(thread_id),  # ← THIS IS NEW - ADD THIS LINE
            "triggered_rules": [f["issue"] for f in flags],
            "negotiation_intents": intents,
            "flags": flags,
            "assistant_reply": response,
            "score": score  # ← NEW: Add score
        }
        
    except Exception as e:
        return {"error": str(e)}
    finally:
        db.close()

from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db,get_negotiation_db
import uuid
from datetime import datetime
from app.models import NegotiationMessage
from app.services.negotiation_llm import generate_chat_response
from typing import List, Dict

class ChatRequest(BaseModel):
    message: str

# 1. Chat about contract
@app.post("/chat/{thread_id}")
async def chat_about_contract(
    thread_id: str,
    request: ChatRequest,
    db: Session = Depends(get_negotiation_db)
):
    """
    Interactive chat about a specific contract negotiation
    """
    try:
        thread_uuid = uuid.UUID(thread_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid thread ID")
    
    # Get all messages in this thread
    thread_messages = db.query(NegotiationMessage).filter(
        NegotiationMessage.thread_id == thread_uuid
    ).order_by(NegotiationMessage.sent_at).all()
    
    if not thread_messages:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Find the analysis message
    analysis_message = None
    negotiation_intents = []
    for msg in thread_messages:
        if msg.attachments and "negotiation_intents" in msg.attachments:
            analysis_message = msg
            negotiation_intents = msg.attachments.get("negotiation_intents", [])
            break
    
    if not analysis_message:
        raise HTTPException(status_code=404, detail="No contract analysis found")
    
    # Prepare chat history
    chat_history = []
    for msg in thread_messages:
        if msg.id == analysis_message.id:
            continue
        chat_history.append({
            "sender_role": msg.sender_role,
            "body": msg.body,
            "sent_at": msg.sent_at
        })
    
    # Generate AI response
    ai_response = generate_chat_response(
        user_message=request.message,
        negotiation_intents=negotiation_intents,
        chat_history=chat_history[-10:]
    )
    
    # Save user message
    user_msg = NegotiationMessage(
        thread_id=thread_uuid,
        sender_role="user",
        body=request.message,
        sent_at=datetime.utcnow()
    )
    db.add(user_msg)
    
    # Save AI response
    ai_msg = NegotiationMessage(
        thread_id=thread_uuid,
        sender_role="ai",
        body=ai_response,
        suggested_text=ai_response,
        sent_at=datetime.utcnow()
    )
    db.add(ai_msg)
    
    db.commit()
    
    return {
        "thread_id": thread_id,
        "response": ai_response,
        "timestamp": datetime.utcnow().isoformat()
    }

# 2. Get chat history
@app.get("/thread/{thread_id}")
async def get_thread_details(thread_id: str, db: Session = Depends(get_negotiation_db)):
    """Get all messages in a negotiation thread"""
    try:
        thread_uuid = uuid.UUID(thread_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid thread ID")
    
    messages = db.query(NegotiationMessage).filter(
        NegotiationMessage.thread_id == thread_uuid
    ).order_by(NegotiationMessage.sent_at).all()
    
    # Get contract analysis from attachments
    contract_analysis = None
    contract_id = None
    for msg in messages:
        if msg.attachments and "contract_id" in msg.attachments:
            contract_analysis = {
                "contract_id": msg.attachments.get("contract_id"),
                "score": msg.attachments.get("score"),
                "flags": msg.attachments.get("flags", []),
                "negotiation_intents": msg.attachments.get("negotiation_intents", [])
            }
            contract_id = msg.attachments.get("contract_id")
            break
    
    return {
        "thread_id": thread_id,
        "contract_analysis": contract_analysis,
        "messages": [
            {
                "id": str(msg.id),
                "sender_role": msg.sender_role,
                "body": msg.body,
                "sent_at": msg.sent_at.isoformat() if msg.sent_at else None,
                "has_attachments": bool(msg.attachments)
            }
            for msg in messages
        ]
    }

# 3. List all threads for a contract
@app.get("/contract/{contract_id}/threads")
async def get_contract_threads(contract_id: int, db: Session = Depends(get_negotiation_db)):
    """Get all negotiation threads for a contract"""
    # Find all threads that have this contract_id in attachments
    all_messages = db.query(NegotiationMessage).filter(
        NegotiationMessage.attachments.contains({"contract_id": contract_id})
    ).all()
    
    # Group by thread_id
    threads = {}
    for msg in all_messages:
        thread_id = str(msg.thread_id)
        if thread_id not in threads:
            threads[thread_id] = {
                "thread_id": thread_id,
                "last_message": msg.sent_at,
                "message_count": 0,
                
            }
        threads[thread_id]["message_count"] += 1
        if msg.sent_at and (threads[thread_id]["last_message"] is None or msg.sent_at > threads[thread_id]["last_message"]):
            threads[thread_id]["last_message"] = msg.sent_at
    
    return {
        "contract_id": contract_id,
        "threads": list(threads.values())
    }