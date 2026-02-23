import uuid
import os
import shutil
import traceback
import logging
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Database & Models
from app.database import SessionLocal, engine
from app import models, schemas

# Services
from app.marketcheck_service import get_market_valuation, calculate_fairness_score
from app.services.ocr_engine import extract_text_from_pdf
from app.services.llm_extractor import extraction_chain, get_nhtsa_recalls
from app.services.vehicle_service import get_vehicle_details
from app.utils.vin_validator import extract_vin_with_regex

# Import the robust extraction
# Import the robust extraction and chat logic
from app.services.negotiation_engine import generate_negotiation_plan, extract_financials_robust, chat_with_negotiator
from app.services.llm_config import chat_llm 

load_dotenv()

# Initialize DB Tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="LeaseGuard Pro API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def clean_currency(value):
    if value is None or value == "Not specified":
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    # Remove $ and ₹ symbols
    cleaned = str(value).replace('$', '').replace('₹', '').replace(',', '').strip()
    try:
        return float(cleaned)
    except ValueError:
        return 0.0

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- 1. MAIN PROCESSING ENDPOINT ---
@app.post("/process-contract", response_model=schemas.ProcessContractResponse)
async def process_contract(user_id: uuid.UUID, file: UploadFile = File(...), db: Session = Depends(get_db)):
    temp_filename = f"temp_{uuid.uuid4()}.pdf"
    
    try:
        # 0. User Safety Net
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            user = models.User(id=user_id, email=f"auto_{str(user_id)[:8]}@example.com", full_name="Auto-Generated User")
            db.add(user)
            db.commit()

        # 1. Save file
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 2. OCR & VIN
        raw_text = extract_text_from_pdf(temp_filename)
        if not raw_text: raise HTTPException(status_code=400, detail="OCR Failed")
        vin = extract_vin_with_regex(raw_text)
        
        # 3. Specs & Extraction (NO TRUNCATION - Using Gemini 2.5 Flash)
        vehicle_info = get_vehicle_details(vin) if vin else {}
        
        # Extract general terms
        sla_results = extraction_chain.invoke({"text": raw_text})
        sla_data = sla_results.model_dump() if hasattr(sla_results, 'model_dump') else sla_results
        
        # 4. Resolve Identity
        v_make = vehicle_info.get('make') or sla_data.get('make') or "Unknown"
        v_model = vehicle_info.get('model') or sla_data.get('model') or "Unknown"
        v_year = vehicle_info.get('year') or sla_data.get('year')
        
        # Ensure Vehicle Exists in DB
        vehicle_id = None
        if vin:
            existing_vehicle = db.query(models.Vehicle).filter(models.Vehicle.vin == vin).first()
            if existing_vehicle:
                vehicle_id = existing_vehicle.id
            else:
                new_vehicle = models.Vehicle(
                    id=uuid.uuid4(),
                    vin=vin,
                    make=v_make,
                    model=v_model,
                    year=int(v_year) if str(v_year).isdigit() else None
                )
                db.add(new_vehicle)
                db.commit()
                db.refresh(new_vehicle)
                vehicle_id = new_vehicle.id

        # 5. Market Valuation (IN INR via Service)
        raw_miles = sla_data.get("mileage_limit") or 12000
        clean_miles = int(''.join(filter(str.isdigit, str(raw_miles)))) if any(c.isdigit() for c in str(raw_miles)) else 12000
        
        # This service now handles USD->INR conversion internally
        market_info = get_market_valuation(vin=vin, make=v_make, model=v_model, year=v_year, miles=clean_miles)
        market_price = market_info.get("marketcheck_price", 0) if market_info else 0

        # --- 6. SCORING PREP (UPDATED) ---
        
        # A. EXTRACT FROM RAW TEXT (Sir's Logic)
        # We pass the full raw_text to the LLM and ask for the "Most Suitable Value"
        financials = extract_financials_robust(raw_text)
        
        dealer_price = financials.get("dealer_price", 0)
        buyout_price = financials.get("buyout_price", 0)

        # B. NO MATH FALLBACK
        # If dealer_price is 0, we leave it as 0. The score will reflect "Could not verify price".
        # This forces the system to rely purely on the text.
        if dealer_price == 0:
            logging.warning("⚠️ Dealer Price extraction returned 0. No math fallback applied.")

        # C. Scoring
        apr_val = clean_currency(sla_data.get("apr_percent"))
        fees_val = clean_currency(sla_data.get("fees_total")) 
        if fees_val == 0: fees_val = 500 
        term_val = int(float(clean_currency(sla_data.get("term_months")))) or 36

        score_data = calculate_fairness_score(
            contract_data=sla_data,
            market_price=market_price,
            dealer_price=dealer_price,
            apr=apr_val,
            fees=fees_val,
            term=term_val
        )
        
        fairness_score = score_data.get("final", 50)
        price_score = score_data.get("price_score", 0) # <--- Make sure this is updated from equity_score
        apr_score = score_data.get("apr_score", 0)
        fee_score = score_data.get("fee_score", 0)
        term_score = score_data.get("term_score", 0)
        score_reasoning = score_data.get("reasoning", "")

        # 7. Strategy & Recalls
        recalls = get_nhtsa_recalls(v_make, v_model, v_year) if v_make != "Unknown" else []
        
        # Generate Red Flags (Report)
        intents_report, _ = generate_negotiation_plan(
            sla_data, 
            vehicle_info, 
            market_price=market_price
        )

        contract_profile = {
            "vin": vin,
            "make": v_make,
            "model": v_model,
            "year": v_year,
            "market_value": market_price,
            "dealer_price": dealer_price,
            "buyout_price": buyout_price,
            "recalls": recalls
        }

        # 8. Database Persistence
        contract_id = uuid.uuid4()
        new_contract = models.Contract(
            id=contract_id, 
            user_id=user_id, 
            doc_status="completed", 
            vin=vin, 
            vehicle_make=v_make, 
            vehicle_model=v_model, 
            vehicle_year=int(v_year) if str(v_year).isdigit() else None,
            market_value=market_price,
            vehicle_id=vehicle_id,
            raw_text=raw_text  # <--- SAVING RAW TEXT TO DB
        )
        db.add(new_contract)
        db.flush() 

        new_sla = models.ContractSLA(
            id=uuid.uuid4(), 
            contract_id=contract_id, 
            fairness_score=fairness_score,
            negotiation_report=intents_report, 
            monthly_payment=str(sla_data.get("monthly_payment")),
            residual_value=clean_currency(sla_data.get("residual_value")),
            down_payment=clean_currency(sla_data.get("down_payment")),
            apr_percent=apr_val,
            term_months=term_val,
            llm_summary=score_reasoning,
            dealer_price=dealer_price,
            buyout_price=buyout_price
        )
        db.add(new_sla)
        db.commit()

        # 9. Return to Frontend
        return {
            "status": "success",
            "contract_id": str(contract_id),
            "contract_profile": {
                **contract_profile,
                "score": fairness_score,
                "sla": sla_data,
                "breakdown": {
                    "price_score": price_score, # <--- Perfectly matches your UI now!
                    "apr_score": apr_score,
                    "fee_score": fee_score,
                    "term_score": term_score
                }
            }
        }
    except Exception as e:
        db.rollback()
        logging.error(f"FATAL ERROR: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'temp_filename' in locals() and os.path.exists(temp_filename):
            os.remove(temp_filename)

# --- 2. INTERACTIVE CHAT ENDPOINT ---
# --- 2. INTERACTIVE CHAT ENDPOINT ---
@app.post("/contracts/{contract_id}/chat")
async def chat_with_contract(contract_id: str, message_payload: dict, db: Session = Depends(get_db)):
    user_message = message_payload.get("message")
    
    # 1. Fetch existing chat history to give the LLM memory
    thread = db.query(models.NegotiationThread).filter(models.NegotiationThread.contract_id == contract_id).first()
    history = []
    if thread:
        msgs = db.query(models.NegotiationMessage).filter(models.NegotiationMessage.thread_id == thread.id).order_by(models.NegotiationMessage.sent_at.asc()).all()
        history = [{"role": m.sender_role, "content": m.body} for m in msgs]

    # 2. Hand off all the complex logic to your negotiation_engine.py!
    ai_response_text = chat_with_negotiator(db, contract_id, user_message, history)

    # 3. Save the new conversation to the database
    contract_info = db.query(models.Contract).filter(models.Contract.id == contract_id).first()
    if not thread and contract_info:
        thread = models.NegotiationThread(id=uuid.uuid4(), user_id=contract_info.user_id, contract_id=contract_id, subject="Negotiation", channel="chat")
        db.add(thread)
        db.commit()
        db.refresh(thread)
    
    if thread:
        db.add(models.NegotiationMessage(id=uuid.uuid4(), thread_id=thread.id, sender_role="user", body=user_message))
        db.add(models.NegotiationMessage(id=uuid.uuid4(), thread_id=thread.id, sender_role="assistant", body=ai_response_text))
        db.commit()

    return {"response": ai_response_text}

# --- 3. CHAT HISTORY ENDPOINT ---
@app.get("/contracts/{contract_id}/chat/history")
async def get_chat_history(contract_id: uuid.UUID, db: Session = Depends(get_db)):
    thread = db.query(models.NegotiationThread).filter(models.NegotiationThread.contract_id == contract_id).first()
    if not thread:
        return {"contract_id": str(contract_id), "history": []}

    messages = db.query(models.NegotiationMessage).filter(models.NegotiationMessage.thread_id == thread.id).order_by(models.NegotiationMessage.sent_at.asc()).all()

    return {
        "contract_id": str(contract_id),
        "history": [{"sender": m.sender_role, "content": m.body, "timestamp": m.sent_at.isoformat()} for m in messages]
    }