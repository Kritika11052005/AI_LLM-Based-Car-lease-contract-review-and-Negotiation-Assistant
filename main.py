import uuid
import os
import shutil
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

# Database & Models
from app.database import SessionLocal, engine
from app import models, schemas

# Services
from app.services.ocr_engine import extract_text_from_pdf
from app.services.llm_extractor import extraction_chain, get_nhtsa_recalls
from app.services.vehicle_service import get_vehicle_details
from app.utils.vin_validator import extract_vin_with_regex
from app.services.negotiation_engine import (
    generate_negotiation_plan, 
    chat_with_negotiator
)

# Initialize DB Tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Car Lease Negotiator - Pro")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- 1. CONTRACT PROCESSING ENDPOINT ---
@app.post("/process-contract", response_model=schemas.ProcessContractResponse)
async def process_contract(user_id: uuid.UUID, file: UploadFile = File(...), db: Session = Depends(get_db)):
    temp_filename = f"temp_{uuid.uuid4()}.pdf"
    
    try:
        # 0. Ensure User exists
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            user = models.User(id=user_id, email=f"user_{user_id.hex[:6]}@example.com")
            db.add(user)
            db.flush()

        # 1. File Handling
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 2. OCR & VIN Extraction
        raw_text = extract_text_from_pdf(temp_filename)
        if not raw_text:
            raise HTTPException(status_code=400, detail="OCR failed.")
        vin = extract_vin_with_regex(raw_text)
        
        # 3. Vehicle Processing
        v_id = None
        vehicle_info = {}
        if vin:
            vehicle_info = get_vehicle_details(vin)
            existing_v = db.query(models.Vehicle).filter(models.Vehicle.vin == vin).first()
            if not existing_v:
                new_v = models.Vehicle(
                    id=uuid.uuid4(),
                    vin=vin,
                    make=vehicle_info.get('make'),
                    model=vehicle_info.get('model'),
                    year=int(vehicle_info.get('year')) if str(vehicle_info.get('year')).isdigit() else None,
                    body_class=vehicle_info.get('body_class')
                )
                db.add(new_v)
                db.flush()
                v_id = new_v.id
            else:
                v_id = existing_v.id

        # 4. Create Contract Record
        contract_id = uuid.uuid4()
        new_contract = models.Contract(
            id=contract_id,
            user_id=user_id,
            vehicle_id=v_id,
            doc_status="processing",
            raw_text=raw_text[:5000], 
            vin=vin,
            vehicle_make=vehicle_info.get('make'),
            vehicle_model=vehicle_info.get('model'),
            vehicle_year=int(vehicle_info.get('year')) if str(vehicle_info.get('year')).isdigit() else None
        )
        db.add(new_contract)
        db.flush()

        # 5. LLM Extraction
        try:
            sla_results = extraction_chain.invoke({"text": raw_text})
            sla_data = sla_results.model_dump() if hasattr(sla_results, 'model_dump') else sla_results
            
            # 6. Negotiation Strategy
            contract_profile, intents_report, fairness_score = generate_negotiation_plan(
                sla_raw_data=sla_data, 
                vehicle_details={**vehicle_info, "vin": vin}
            )

            # 7. Save SLA Data to DB (Including hidden fields)
            new_sla = models.ContractSLA(
                id=uuid.uuid4(),
                contract_id=contract_id,
                apr_percent=sla_data.get("apr_percent"),
                term_months=sla_data.get("term_months"),
                monthly_payment=str(sla_data.get("monthly_payment")),
                down_payment=sla_data.get("down_payment"),
                residual_value=sla_data.get("residual_value"),
                contract_data=contract_profile,      # Combined Profile saved in DB
                negotiation_report=intents_report,  # Hidden intents saved in DB
                fairness_score=fairness_score       # Hidden score saved in DB
            )
            db.add(new_sla)

            # 8. Log the Extraction
            new_ext = models.Extraction(
                id=uuid.uuid4(),
                contract_id=contract_id,
                model_name="groq-llama-3.3",
                status="completed",
                raw_output=sla_data
            )
            db.add(new_ext)

            new_contract.doc_status = "completed"
            db.commit()

            # 9. Clean Response (FastAPI filters out 'negotiation_summary' based on schemas.ProcessContractResponse)
            return {
               "status": "success",
               "contract_id": contract_id,
               "contract_profile": contract_profile,
               "negotiation_summary": { # This will be hidden in Swagger
                   "score": fairness_score,
                   "status": "Analysis Complete."
               }
            }

        except Exception as inner_e:
            db.rollback()
            new_contract.doc_status = "failed"
            db.commit()
            raise inner_e

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)

# --- 2. INTERACTIVE CHAT ENDPOINT ---
@app.post("/contracts/{contract_id}/chat")
async def chat_endpoint(contract_id: uuid.UUID, payload: dict, db: Session = Depends(get_db)):
    user_message = payload.get("message")
    if not user_message:
        raise HTTPException(status_code=400, detail="Message is required")

    contract = db.query(models.Contract).filter(models.Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    try:
        thread = db.query(models.NegotiationThread).filter(models.NegotiationThread.contract_id == contract_id).first()
        if not thread:
            thread = models.NegotiationThread(
                id=uuid.uuid4(),
                user_id=contract.user_id,
                contract_id=contract_id,
                channel="chat",
                subject=f"Negotiation for {contract.vehicle_make or 'Vehicle'}"
            )
            db.add(thread)
            db.commit()
            db.refresh(thread)

        db_messages = db.query(models.NegotiationMessage).filter(models.NegotiationMessage.thread_id == thread.id).order_by(models.NegotiationMessage.sent_at.asc()).all()
        history = [{"role": m.sender_role, "content": m.body} for m in db_messages]

        new_user_msg = models.NegotiationMessage(id=uuid.uuid4(), thread_id=thread.id, sender_role="user", body=user_message)
        db.add(new_user_msg)
        db.commit() 

        ai_response = await chat_with_negotiator(db=db, contract_id=str(contract_id), user_message=user_message, history=history)

        new_ai_msg = models.NegotiationMessage(id=uuid.uuid4(), thread_id=thread.id, sender_role="assistant", body=ai_response)
        db.add(new_ai_msg)
        db.commit()

        return {"response": ai_response}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Negotiation engine failed.")

# --- 3. CHAT HISTORY ENDPOINT ---
@app.get("/contracts/{contract_id}/chat/history")
async def get_chat_history(contract_id: uuid.UUID, db: Session = Depends(get_db)):
    thread = db.query(models.NegotiationThread).filter(models.NegotiationThread.contract_id == contract_id).first()
    if not thread:
        return {"contract_id": str(contract_id), "history": []}

    messages = db.query(models.NegotiationMessage).filter(models.NegotiationMessage.thread_id == thread.id).order_by(models.NegotiationMessage.sent_at.asc()).all()

    return {
        "contract_id": str(contract_id),
        "history": [{"sender": m.sender_role, "content": m.body, "timestamp": m.sent_at.isoformat() if m.sent_at else None} for m in messages]
    }