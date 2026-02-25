import io
import os
from fastapi import FastAPI, UploadFile, File,HTTPException, Depends
from sqlalchemy.orm import Session
from app.schemas import ChatRequest  

from pypdf import PdfReader
import pytesseract
from pdf2image import convert_from_bytes
import json
import uuid
from datetime import datetime
from app.database import (
    SessionLocal,
    engine,
    negotiation_engine,
    ContractBase,
    NegotiationBase,
    get_db,
    get_negotiation_db,
)

from app.models import Contract, ContractSLA, NegotiationMessage,NegotiationThread
from app.ai_utils import extract_sla
from app.vin_utils import extract_vin, decode_vin, fetch_recalls
from app.services.rule_engine import evaluate_sla_rules
from app.services.negotiation_llm import (
    generate_negotiation_message,
    generate_chat_response,
)
from pydantic import BaseModel

import logging
logging.basicConfig(level=logging.DEBUG)
app = FastAPI(title="AI Car Lease Negotiation System", debug=True)



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
def clean_numeric(value):
    if value is None:
        return None
    s = str(value).strip().replace(',', '')
    s = (s.replace('INR ', '').replace('₹', '').replace('$', '').replace(',', '')
         .replace('%', '').replace(' per annum', '').replace(' months', '')
         .replace(' kilometers per annum', '').replace(' km', '')
         .replace('per annum', ''))
    match = re.search(r'[\d]+(?:\.\d+)?', s)
    if match:
        try:
            return float(match.group())
        except:
            return None
    return None

def clean_int(value):
    val = clean_numeric(value)
    return int(val) if val is not None else None

@app.post("/negotiation/upload")
async def negotiation_upload(
    file: UploadFile = File(...),
    db: Session = Depends(get_negotiation_db),
):
    content = await file.read()
    name = file.filename.lower()
    
    if not name.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    extracted_text = "" 
    reader = PdfReader(io.BytesIO(content))
    for page in reader.pages:
        extracted_text += page.extract_text() or ""

    if extracted_text.strip() == "":
        images = convert_from_bytes(content)
        for img in images:
            extracted_text += pytesseract.image_to_string(img)
    print(f"✅ OCR Success: {len(extracted_text)} chars extracted")
    
    sla = extract_sla(extracted_text)
    print(f"DEBUG purchase_option from LLM: {sla.purchase_option}")
    print(f"DEBUG clean_numeric result: {clean_numeric(sla.purchase_option)}")
    vin = extract_vin(extracted_text)

    new_sla = ContractSLA(
    contract_id=uuid.uuid4(),
    raw_text=extracted_text,  # ← SAVE RAW TEXT!
    vin=vin,  
    apr_percent=clean_numeric(sla.apr),                   
    money_factor=None,
    term_months=clean_int(sla.lease_term_months),
    monthly_payment=clean_numeric(sla.monthly_payment),
    down_payment=clean_numeric(sla.down_payment),
    fees_total=None,
    residual_value=clean_numeric(sla.residual_value),
    residual_percent_msrp=None,
    msrp=None,
    cap_cost=None,
    cap_cost_reduction=None,
    
    mileage_overage_fee=None,
    mileage_allowance_yr=clean_int(sla.mileage_allowance),      # Add this line
    purchase_option_price=clean_numeric(sla.purchase_option),   # Add this line  
                        
    disposition_fee=None,
    early_termination_fee=None,
    insurance_requirements=None,
    maintenance_resp=None,
    warranty_summary=None,
    late_fee_policy=sla.late_fees,                        
    other_terms=None,
)

    db.add(new_sla)
    db.commit()
    db.refresh(new_sla)

    return {
    "message": "Negotiation contract uploaded and SLA stored in new DB",
    "sla_id": new_sla.id,
    "vin": vin, 
    "text_length": len(extracted_text),
    "sla_display": {
        "apr_percent": new_sla.apr_percent,
        "money_factor": new_sla.money_factor,
        "term_months": new_sla.term_months,
        "monthly_payment": new_sla.monthly_payment,
        "down_payment": new_sla.down_payment,
        "fees_total": new_sla.fees_total,
        "residual_value": new_sla.residual_value,
        "residual_percent_msrp": new_sla.residual_percent_msrp,
        "msrp": new_sla.msrp,
        "cap_cost": new_sla.cap_cost,
        "cap_cost_reduction": new_sla.cap_cost_reduction,
        "mileage_allowance_yr": new_sla.mileage_allowance_yr,
        "mileage_overage_fee": new_sla.mileage_overage_fee,
        "early_termination_fee": new_sla.early_termination_fee,
        "disposition_fee": new_sla.disposition_fee,
        "purchase_option_price": new_sla.purchase_option_price,
        "insurance_requirements": new_sla.insurance_requirements,
        "maintenance_resp": new_sla.maintenance_resp,
        "warranty_summary": new_sla.warranty_summary,
        "late_fee_policy": new_sla.late_fee_policy,
        "other_terms": new_sla.other_terms,
    },
}

from uuid import UUID
@app.post("/negotiate/sla/{sla_id}")
def negotiate_on_sla(
    sla_id: UUID,
    db: Session = Depends(get_negotiation_db),
):
    sla_row = db.query(ContractSLA).filter(ContractSLA.id == sla_id).first()
    if not sla_row:
        raise HTTPException(status_code=404, detail="SLA not found")

    sla = {
        "apr": sla_row.apr_percent,
        "lease_term_months": sla_row.term_months,
        "monthly_payment": sla_row.monthly_payment,
        "down_payment": sla_row.down_payment,
        "residual_value": sla_row.residual_value,
        "mileage_allowance": sla_row.mileage_allowance_yr,
        "early_termination_clause": sla_row.early_termination_fee,
        "purchase_option": sla_row.purchase_option_price,
        "late_fees": sla_row.late_fee_policy,
        "msrp": sla_row.msrp,
    }

    flags = evaluate_sla_rules(sla)

    severity_weights = {"critical": 25, "high": 15, "medium": 10, "low": 5, "none": 0}
    score = 100
    for flag in flags:
        if flag["severity"] != "none":
            score -= severity_weights.get(flag["severity"], 0)
    score = max(0, score)

    intents = []
    negotiation_intents_raw = []
    for flag in flags:
        intent = flag.get("issue", "").lower().replace(" ", "_")
        if intent and intent not in intents:
            intents.append(intent)
        if flag.get("negotiation_intent"):
            negotiation_intents_raw.append(flag["negotiation_intent"])

    if not flags:
        return {
            "sla_id": sla_id,
            "triggered_rules": [],
            "negotiation_intents": [],
            "flags": [],
            "assistant_reply": "Your contract terms look fair. No negotiation needed.",
            "score": 100,
            "thread_id": None,
        }

    response_text = generate_negotiation_message(flags)

    thread_id = uuid.uuid4()

    analysis_summary = f"Contract Analysis for SLA #{sla_id}\n\n"
    analysis_summary += f"Score: {score}/100\n\n"
    analysis_summary += "Key Issues Found:\n"
    for flag in flags[:5]:
        analysis_summary += f"• {flag['issue']}: {flag['reason']}\n"

    thread = NegotiationThread(
        user_id=uuid.uuid4(),              
        contract_id=uuid.uuid4(),          
        dealer_id=uuid.uuid4(),
        lender_id=uuid.uuid4(),          
        channel="ai_direct",              
        subject=f"SLA Analysis {str(sla_id)[:8]}", 
        created_at=datetime.utcnow(),     
        sla_id=sla_id                    
    )

    db.add(thread)
    db.flush()
    analysis_msg = NegotiationMessage(
        id=uuid.uuid4(),
        thread_id=thread.id,  
        sender_role="ai",
        body=analysis_summary,
        suggested_text=analysis_summary,
        attachments=json.dumps({     
            "sla_id": str(sla_id),  
            "flags": flags,
            "score": score,
            "negotiation_intents": negotiation_intents_raw,
        }),
        sent_at=datetime.utcnow()    
    )
    db.add(analysis_msg)
    db.commit()

# 3. FIXED return statement
    return {
        "sla_id": str(sla_id),      
        "thread_id": str(thread.id), 
        "triggered_rules": [f["issue"] for f in flags],
        "negotiation_intents": intents,
        "flags": flags,
        "assistant_reply": response_text,
        "score": score,
    }


@app.post("/chat/{thread_id}")
async def chat_about_contract(
    thread_id: str,
    request: ChatRequest,
    db: Session = Depends(get_negotiation_db),
):
    thread_uuid = uuid.UUID(thread_id)
    thread_messages = db.query(NegotiationMessage).filter(
        NegotiationMessage.thread_id == thread_uuid
    ).order_by(NegotiationMessage.sent_at).all()

    if not thread_messages:
        raise HTTPException(status_code=404, detail="Thread not found")

    
    analysis_message = None
    negotiation_intents = []
    for msg in thread_messages:
        if msg.attachments:
            try:
                attachments_dict = json.loads(msg.attachments)
                if "negotiation_intents" in attachments_dict:
                    analysis_message = msg
                    negotiation_intents = attachments_dict.get("negotiation_intents", [])
                    break
            except json.JSONDecodeError:
                continue

    if not analysis_message:
        raise HTTPException(status_code=404, detail="No contract analysis found")

    
    chat_history = []
    for msg in thread_messages:
        if msg.id == analysis_message.id:
            continue
        chat_history.append({
            "sender_role": msg.sender_role,
            "body": msg.body,
            "sent_at": msg.sent_at,
        })

    # Get SLA data to pass to chatbot
    thread_obj = db.query(NegotiationThread).filter(
        NegotiationThread.id == thread_uuid
    ).first()
    
    contract_data = {}
    if thread_obj and thread_obj.sla_id:
        sla_obj = db.query(ContractSLA).filter(
            ContractSLA.id == thread_obj.sla_id
        ).first()
        if sla_obj:
            contract_data = {
                "monthly_payment": sla_obj.monthly_payment or "Not specified",
                "apr_percent": sla_obj.apr_percent or "Not specified",
                "term_months": sla_obj.term_months or "Not specified",
                "down_payment": sla_obj.down_payment or "Not specified",
                "residual_value": sla_obj.residual_value or "Not specified",
                "mileage_allowance_yr": sla_obj.mileage_allowance_yr or "Not specified",
                "purchase_option_price": sla_obj.purchase_option_price or "Not specified",
                "fees_total": sla_obj.fees_total or "Not specified",
                "late_fee_policy": sla_obj.late_fee_policy or "Not specified",
                "early_termination_fee": sla_obj.early_termination_fee or "Not specified",
                "disposition_fee": sla_obj.disposition_fee or "Not specified",
                "insurance_requirements": sla_obj.insurance_requirements or "Not specified",
                "maintenance_resp": sla_obj.maintenance_resp or "Not specified",
                "warranty_summary": sla_obj.warranty_summary or "Not specified",
                "fairness_score": sla_obj.fairness_score or "Not specified",
                "price_score": sla_obj.price_score or "Not specified",
                "apr_score": sla_obj.apr_score or "Not specified",
                "fees_score": sla_obj.fees_score or "Not specified",
                "term_score": sla_obj.term_score or "Not specified",
            }
            print(f"DEBUG contract_data scores: fairness={contract_data.get('fairness_score')}, price={contract_data.get('price_score')}, apr={contract_data.get('apr_score')}")
    ai_response = generate_chat_response(
        user_message=request.message,
        negotiation_intents=negotiation_intents,
        chat_history=chat_history[-10:],
        contract_data=contract_data,
    )

    # Save messages (perfect!)
    user_msg = NegotiationMessage(
        thread_id=thread_uuid,
        sender_role="user",
        body=request.message,
        sent_at=datetime.utcnow(),
    )
    db.add(user_msg)

    ai_msg = NegotiationMessage(
        thread_id=thread_uuid,
        sender_role="ai",
        body=ai_response,
        suggested_text=ai_response,
        sent_at=datetime.utcnow(),
    )
    db.add(ai_msg)
    db.commit()

    return {
        "thread_id": thread_id,
        "response": ai_response,
        "timestamp": datetime.utcnow().isoformat(),
    }

@app.get("/thread/{thread_id}")
async def get_thread_details(thread_id: str, db: Session = Depends(get_negotiation_db)):
    thread_uuid = uuid.UUID(thread_id)
    messages = db.query(NegotiationMessage).filter(
        NegotiationMessage.thread_id == thread_uuid
    ).order_by(NegotiationMessage.sent_at).all()

    
    contract_analysis = None
    for msg in messages:
        if msg.attachments:
            try:
                attachments_dict = json.loads(msg.attachments)
                if "sla_id" in attachments_dict:
                    contract_analysis = {
                        "sla_id": attachments_dict.get("sla_id"),
                        "score": attachments_dict.get("score"),
                        "flags": attachments_dict.get("flags", []),
                        "negotiation_intents": attachments_dict.get("negotiation_intents", []),
                    }
                    break
            except json.JSONDecodeError:
                continue

    return {
        "thread_id": thread_id,
        "contract_analysis": contract_analysis,
        "messages": [
            {
                "id": str(msg.id),
                "sender_role": msg.sender_role,
                "body": msg.body,
                "sent_at": msg.sent_at.isoformat() if msg.sent_at else None,
                "has_attachments": bool(msg.attachments),
            }
            for msg in messages
        ],
    }

@app.get("/sla/{sla_id}/threads")
async def get_sla_threads(sla_id: str, db: Session = Depends(get_negotiation_db)):
    
    all_messages = db.query(NegotiationMessage).all()
    all_messages = [
        msg for msg in all_messages 
        if msg.attachments and f'"sla_id":"{sla_id}"' in msg.attachments
    ]

    threads = {}
    for msg in all_messages:
        tid = str(msg.thread_id)
        if tid not in threads:
            threads[tid] = {
                "thread_id": tid,
                "last_message": msg.sent_at,
                "message_count": 0,
            }
        threads[tid]["message_count"] += 1
        if msg.sent_at and (
            threads[tid]["last_message"] is None
            or msg.sent_at > threads[tid]["last_message"]
        ):
            threads[tid]["last_message"] = msg.sent_at

    return {
        "sla_id": sla_id,
        "threads": list(threads.values()),
    }


# =====================================================
# 🔹 MILESTONE 4 - LLM DEALER PRICE + MARKET ANALYSIS
# =====================================================

from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import google.generativeai as genai
from services.market_analysis import get_market_data 
from app import models      
from uuid import UUID
from app.database import get_negotiation_db  # NOT get_db!
from app.models import ContractSLA
import re  

def extract_dealer_price_from_raw_text(raw_text: str, monthly_fallback=None) -> float:
    """LLM extracts dealer price from raw_text"""
    
    # Quick regex first - detect currency from symbol
    price_match = re.search(r'([\$₹])?([\d,]+\.?\d*)\s*(?:price|total|msrp|selling)', raw_text, re.IGNORECASE)
    if price_match:
        currency_symbol = price_match.group(1) or ""
        price_str = re.sub(r'[^\d.]', '', price_match.group(2))
        if price_str:
            price_float = safe_float(price_str)
            if currency_symbol == "₹":
                return price_float  # already INR
            else:
                return price_float * 80.88  # USD to INR
    
    # LLM extraction
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"""You are a financial contract extraction engine.
Extract ONLY the dealer asking price or vehicle selling price.
Rules:
- Return ONLY valid JSON
- No markdown
- No explanation
- Detect the currency of the price (USD or INR)
- If not clearly found, return null
- Remove currency symbols ($, ₹, commas)
Format:
{{
  "dealer_price": null,
  "currency": "USD"
}}
Contract text:
\"\"\"{raw_text[:3000]}\"\"\"
"""
        response = model.generate_content(prompt)
        result = json.loads(response.text.strip())
        price = result.get("dealer_price")
        currency = result.get("currency", "USD")
        if price:
            price_float = safe_float(price)
            if currency == "USD":
                return price_float * 80.88  # USD to INR
            else:
                return price_float  # already INR
    except:
        pass
    
    # Ultimate fallback — monthly is already INR so no conversion needed
    return safe_float(monthly_fallback) * 36 or 2500000

def safe_float(value):
    """Convert string/number/None → float safely"""
    if value is None:
        return 0.0
    try:
        clean_str = str(value).strip().replace('INR ', '').replace(',', '').replace('₹', '')
        return float(clean_str)
    except:
        return 0.0
   
def calculate_fairness_score(contract, market_price: float, dealer_price: float = 0) -> int:
    """4-factor weighted fairness score matching documented formula"""
    
    # 1. PRICE (40%) - dealer price vs market price
    if market_price > 0 and dealer_price > 0:
        price_diff_pct = (dealer_price - market_price) / market_price * 100
        if dealer_price <= market_price:
            # Underpaying - slight bonus
            price_score = min(100, 90 + (abs(price_diff_pct) * 0.2))
        else:
            # Overpaying - 3 pts per 1%
            price_score = max(0, 100 - (price_diff_pct * 3))
    else:
        price_score = 70

    # 2. APR (25%)
    apr = safe_float(contract.apr_percent) or 0
    if apr > 10:
        apr_score = max(0, 100 - ((apr - 10) * 15))
    elif apr > 8:
        apr_score = max(0, 100 - ((apr - 8) * 10))
    elif apr > 6:
        apr_score = max(0, 100 - ((apr - 6) * 5))
    else:
        apr_score = 100

    # 3. FEES (15%) - as per documented formula
    fees = safe_float(contract.fees_total) or 0
    if fees > 200000:  # > $2000 equivalent
        fees_score = 70
    elif fees > 100000:  # $1000-2000
        fees_score = 80
    else:
        fees_score = 90

    # 4. TERM (20%) - as per documented formula
    term_months = safe_float(contract.term_months) or 36
    if term_months < 12:
        term_score = 70
    elif term_months > 72:
        term_score = 75
    elif term_months > 60:
        term_score = 90
    else:
        term_score = 100

    print(f"DEBUG scores: price={price_score}, apr={apr_score}, fees={fees_score}, term={term_score}")

    final_score = int(
        (price_score * 0.40) +
        (apr_score * 0.25) +
        (fees_score * 0.15) +
        (term_score * 0.20)
    )

    return {
    "final_score": max(0, min(100, final_score)),
    "breakdown": {
        "price_score": round(price_score, 1),
        "apr_score": round(apr_score, 1),
        "fees_score": round(fees_score, 1),
        "term_score": round(term_score, 1)
    }
}

from uuid import UUID
from app.database import get_negotiation_db

@app.post("/sla/{sla_id}/market-analysis")
async def sla_market_analysis(sla_id: UUID, db: Session = Depends(get_negotiation_db)):
    # 1. Get the contract from Postgres
    sla = db.query(ContractSLA).filter(ContractSLA.id == sla_id).first()
    if not sla:
        raise HTTPException(status_code=404, detail="Contract not found")

    # 2. Get Market Data from our Service
    
    mileage = int(''.join(filter(str.isdigit, str(sla.mileage_allowance_yr or ''))) or 12000)

    market_info = get_market_data(sla.vin, mileage)

    
    # 3. THE DIFFERENCE LOGIC
    
    market_price = market_info["market_price_inr"]  
    monthly_rental_inr = safe_float(sla.monthly_payment)
    purchase_option = safe_float(sla.purchase_option_price)

# If purchase_option_price is null, try extracting buyout price from raw text
    if purchase_option == 0:
        buyout_match = re.search(r'buyout\s*price[:\s]+(?:INR|₹|Rs\.?)?\s*([\d,]+)', sla.raw_text, re.IGNORECASE)
        if buyout_match:
            purchase_option = safe_float(buyout_match.group(1).replace(',', ''))
            print(f"DEBUG: Extracted buyout price from raw text: {purchase_option}")

    dealer_price = purchase_option if purchase_option > 0 else extract_dealer_price_from_raw_text(
    sla.raw_text,
    monthly_fallback=monthly_rental_inr
)
    
    # Calculate the Gap
    # Calculate the Gap
    price_diff = market_price - dealer_price
    sla.price_difference = price_diff
    sla.analysis_status = "Good Deal" if price_diff > 0 else "Overpriced"
    
    # Calculate and STORE fairness score
    fairness_result = calculate_fairness_score(sla, market_price, dealer_price)
    sla.fairness_score = fairness_result["final_score"]
    sla.price_score = fairness_result["breakdown"]["price_score"]
    sla.apr_score = fairness_result["breakdown"]["apr_score"]
    sla.fees_score = fairness_result["breakdown"]["fees_score"]
    sla.term_score = fairness_result["breakdown"]["term_score"]
    db.commit()

    return {
        "dealer_price": f"₹{dealer_price:,}",
        "market_price": f"₹{market_price:,}",
        "difference": f"₹{price_diff:,}",
        "insight": f"{'Great deal!' if price_diff > 0 else 'Overpriced!'} ₹{abs(price_diff):,} {'below' if price_diff > 0 else 'above'} market.",
        "fairness_score": f"{fairness_result['final_score']}/100",
        "score_breakdown": fairness_result["breakdown"]
    }