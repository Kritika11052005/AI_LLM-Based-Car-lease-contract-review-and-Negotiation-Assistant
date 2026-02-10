from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel  
import uuid
from datetime import datetime
from typing import List, Dict, Optional

from app.database import get_db
from app.models import Contract, NegotiationMessage
from app.schemas import SLASchema  # Your schema
from app.services.rule_engine import evaluate_sla_rules, analyze_contract_with_score
from app.services.negotiation_llm import generate_negotiation_message, generate_chat_response

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    thread_id: str
    response: str
    timestamp: str

@router.post("/negotiate/{contract_id}", response_model=Dict)
async def negotiate(contract_id: int, db: Session = Depends(get_db)):
    """
    YOUR original endpoint - UPDATED to include negotiation_intent and score
    """
    # Get contract from database
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    # Create SLA dict from your Contract model (matches SLASchema)
    sla = {
        "apr": contract.apr,
        "lease_term_months": contract.lease_term_months,
        "monthly_payment": contract.monthly_payment,
        "down_payment": contract.down_payment,
        "residual_value": contract.residual_value,
        "mileage_allowance": contract.mileage_allowance,
        "early_termination_clause": contract.early_termination_clause,
        "purchase_option": contract.purchase_option,
        "late_fees": contract.late_fees
    }

    # Get flags WITH negotiation_intent
    flags = evaluate_sla_rules(sla)
    
    # Get score
    _, score = analyze_contract_with_score(sla)

    if not flags:
        return {
            "message": "No negotiation needed",
            "flags": []
        }

    # Generate assistant reply
    response = generate_negotiation_message(flags)
    
    # Extract triggered rules and intents
    triggered_rules = [flag["issue"] for flag in flags]

    negotiation_intents = []
    for flag in flags:
        # ADD THIS NULL CHECK: if "negotiation_intent" exists AND it's not None/empty
        if "negotiation_intent" in flag and flag["negotiation_intent"]:
            intent_text = flag["negotiation_intent"]
            # Convert to snake_case like your example
            snake_case = intent_text.lower().replace(" ", "_").replace("-", "_")
            negotiation_intents.append(snake_case)
    
    # Create a thread for this negotiation
    thread_id = uuid.uuid4()
    
    # Store initial analysis as an AI message
    analysis_summary = f"Contract Analysis for Contract #{contract_id}\n\n"
    analysis_summary += f"Score: {score}/100\n\n"
    analysis_summary += "Key Issues Found:\n"
    for flag in flags[:5]:  # Show top 5
        analysis_summary += f"• {flag['issue']}: {flag['reason']}\n"
    
    # Add vehicle info if available
    if contract.vehicle_make:
        analysis_summary += f"\nVehicle: {contract.vehicle_year} {contract.vehicle_make} {contract.vehicle_model}"
    
    analysis_message = NegotiationMessage(
        thread_id=thread_id,
        sender_role="ai",
        body=analysis_summary,
        suggested_text=analysis_summary,
        attachments={
            "contract_id": contract_id,
            "flags": flags,
            "score": score,
            "negotiation_intents": [flag.get('negotiation_intent') for flag in flags if flag.get('negotiation_intent')]
        }
    )
    db.add(analysis_message)
    db.commit()

    return {
        "contract_id": contract_id,
        "thread_id": str(thread_id),  # NEW: Return thread ID for chat
        "triggered_rules": triggered_rules,
        "negotiation_intents": negotiation_intents,
        "flags": flags,  # Now includes negotiation_intent
        "assistant_reply": response,
        "score": score
    }

