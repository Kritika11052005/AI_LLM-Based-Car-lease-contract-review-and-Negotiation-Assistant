"""
Simplified Negotiation Routes with Database Persistence
1. POST /analyze-contract/{contract_id} - Analyze contract & save intents
2. POST /negotiate-script/{contract_id} - Generate & save script
3. POST /negotiate-ask/{contract_id} - Ask questions & save chat history
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict
from app.generated.prisma import Prisma
from app.database import get_db
import json

router = APIRouter()

# ============================================
# REQUEST/RESPONSE MODELS
# ============================================

class NegotiationAnalysisResponse(BaseModel):
    """Response for contract analysis"""
    contract_id: str
    fairness_score: float
    rating: str
    summary: str
    red_flags: List[str]
    warnings: List[str]
    negotiation_intents: List[Dict]


class ScriptResponse(BaseModel):
    """Response for negotiation script"""
    contract_id: str
    thread_id: str  # NEW: ID of the negotiation thread
    fairness_score: float
    rating: str
    negotiation_script: str


class QuestionRequest(BaseModel):
    """Request for asking questions"""
    question: str
    thread_id: Optional[str] = None  # NEW: Optional thread ID for continuing conversation


class QuestionResponse(BaseModel):
    """Response for questions"""
    contract_id: str
    thread_id: str  # NEW: ID of the negotiation thread
    question: str
    answer: str


# ============================================
# HELPER FUNCTIONS
# ============================================

def convert_sla_to_dict(sla) -> Dict:
    """Convert Prisma SLA model to dict"""
    if not sla:
        return {}
    
    def to_float(value):
        return float(value) if value is not None else None
    
    return {
        "interest_rate": f"{float(sla.aprPercent)}%" if sla.aprPercent else None,
        "lease_term_months": sla.termMonths,
        "monthly_payment": to_float(sla.monthlyPayment),
        "down_payment": to_float(sla.downPayment),
        "residual_value": to_float(sla.residualValue),
        "mileage_allowance": sla.mileageAllowanceYr,
        "overage_charge": to_float(sla.mileageOverageFee),
        "early_termination_fee": to_float(sla.earlyTerminationFee),
        "purchase_option": to_float(sla.purchaseOptionPrice),
        "maintenance_responsibility": sla.maintenanceResp,
        "warranty_coverage": sla.warrantySummary,
        "late_fee": sla.lateFeePolicy
    }


def convert_vehicle_to_dict(vehicle) -> Optional[Dict]:
    """Convert Prisma Vehicle model to dict"""
    if not vehicle:
        return None
    
    return {
        "vin": vehicle.vin,
        "year": vehicle.year,
        "make": vehicle.make,
        "model": vehicle.model,
        "trim": vehicle.trim
    }


# ============================================
# ENDPOINT 1: ANALYZE CONTRACT (Save Intents)
# ============================================

@router.post("/analyze-contract/{contract_id}", response_model=NegotiationAnalysisResponse)
async def analyze_contract(
    contract_id: str, 
    db: Prisma = Depends(get_db)
):
    """
    Analyze contract, generate negotiation intents, and SAVE to database
    
    Saves:
    - negotiationIntents to Contract table
    - fairnessScore to Contract table
    
    Returns:
    - Fairness score (0-100)
    - Rating (Excellent/Good/Fair/Poor/Very Poor)
    - Red flags
    - Negotiation intents (prioritized)
    """
    from app.core.negotiation_rules import NegotiationRules
    
    # Get contract with SLA from database
    contract = await db.contract.find_unique(
        where={"id": contract_id},
        include={"sla": True, "vehicle": True}
    )
    
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if not contract.sla:
        raise HTTPException(
            status_code=400, 
            detail="No SLA data. Run /extract-sla/{contract_id} first."
        )
    
    try:
        # Convert database models to dict
        sla_data = convert_sla_to_dict(contract.sla)
        vehicle_data = convert_vehicle_to_dict(contract.vehicle)

        # Analyze contract using rules engine
        analysis = NegotiationRules.analyze_contract(
            sla_data=sla_data,
            vehicle_data=vehicle_data,
            user_income=None
        )
        
        # ✅ SAVE: Store intents and fairness score in Contract table
        await db.contract.update(
            where={"id": contract_id},
            data={
                "negotiationIntents": json.dumps(analysis["negotiation_intents"]),  # Save as JSON
                "fairnessScore": analysis["fairness_score"],  # Save fairness score
                "redFlagLevel": analysis["rating"]  # Save rating (Excellent/Good/Fair/Poor)
            }
        )
        
        return {
            "contract_id": contract_id,
            "fairness_score": analysis["fairness_score"],
            "rating": analysis["rating"],
            "summary": analysis["summary"],
            "red_flags": analysis["red_flags"],
            "warnings": analysis["warnings"],
            "negotiation_intents": analysis["negotiation_intents"]
        }
        
    except Exception as e:
        import traceback
        print(f"Analysis error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


# ============================================
# ENDPOINT 2: GENERATE SCRIPT (Save to Thread)
# ============================================

@router.post("/negotiate-script/{contract_id}", response_model=ScriptResponse)
async def generate_script(
    contract_id: str, 
    db: Prisma = Depends(get_db)
):
    """
    Generate comprehensive negotiation script and SAVE to database
    
    Saves:
    - Creates NegotiationThread for this contract
    - Saves script as first NegotiationMessage with role "assistant"
    
    Returns:
    - Complete negotiation script
    - Thread ID (for future Q&A)
    - Fairness score
    - Rating
    """
    from app.core.negotiation_chatbot import NegotiationChatbot
    from app.core.negotiation_rules import NegotiationRules
    
    # Get contract with SLA from database
    contract = await db.contract.find_unique(
        where={"id": contract_id},
        include={"sla": True, "vehicle": True, "user": True}
    )
    
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if not contract.sla:
        raise HTTPException(status_code=400, detail="No SLA data. Run /extract-sla first.")
    
    try:
        # Convert database models to dict
        sla_data = convert_sla_to_dict(contract.sla)
        vehicle_data = convert_vehicle_to_dict(contract.vehicle)

        # Run analysis to generate intents
        analysis = NegotiationRules.analyze_contract(
            sla_data=sla_data,
            vehicle_data=vehicle_data
        )
        
        # Generate script using LLM
        script = NegotiationChatbot.generate_comprehensive_negotiation_script(
            sla_data=sla_data,
            negotiation_intents=analysis["negotiation_intents"],
            analysis=analysis,
            vehicle_data=vehicle_data
        )
        
        # ✅ SAVE: Create NegotiationThread
        thread = await db.negotiationthread.create(
            data={
                "userId": contract.userId,
                "contractId": contract_id,
                "dealerId": contract.dealerId,
                "lenderId": contract.lenderId,
                "channel": "ai_assistant",
                "subject": f"Negotiation Script - {vehicle_data.get('year', '')} {vehicle_data.get('make', '')} {vehicle_data.get('model', '')}"
            }
        )
        
        # ✅ SAVE: Save script as first message
        await db.negotiationmessage.create(
            data={
                "threadId": thread.id,
                "senderRole": "assistant",
                "body": script,
                "suggestedText": None,  # This IS the suggested text
                "attachments": json.dumps({
                    "fairness_score": analysis["fairness_score"],
                    "rating": analysis["rating"],
                    "intents_count": len(analysis["negotiation_intents"])
                })
            }
        )
        
        return {
            "contract_id": contract_id,
            "thread_id": thread.id,
            "fairness_score": analysis["fairness_score"],
            "rating": analysis["rating"],
            "negotiation_script": script
        }
        
    except Exception as e:
        import traceback
        print(f"Script generation error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Script generation failed: {str(e)}")


# ============================================
# ENDPOINT 3: ASK QUESTIONS (Save Chat History)
# ============================================

@router.post("/negotiate-ask/{contract_id}", response_model=QuestionResponse)
async def ask_question(
    contract_id: str,
    request: QuestionRequest,
    db: Prisma = Depends(get_db)
):
    """
    Ask negotiation questions and SAVE chat history to database
    
    Saves:
    - Creates NegotiationThread if thread_id not provided
    - Saves user question as NegotiationMessage (role: "user")
    - Saves AI answer as NegotiationMessage (role: "assistant")
    
    Handles:
    - General questions ("How do I negotiate APR?")
    - Income-aware questions ("I make $5000/month, is this affordable?")
    - Follow-ups using thread_id
    
    Returns:
    - Context-aware answer
    - Thread ID (for continuing conversation)
    """
    from app.core.negotiation_chatbot import NegotiationChatbot
    from app.core.negotiation_rules import NegotiationRules
    
    # Get contract with SLA from database
    contract = await db.contract.find_unique(
        where={"id": contract_id},
        include={"sla": True, "vehicle": True, "user": True}
    )
    
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if not contract.sla:
        raise HTTPException(status_code=400, detail="No SLA data. Run /extract-sla first.")
    
    try:
        # Convert database models to dict
        sla_data = convert_sla_to_dict(contract.sla)
        vehicle_data = convert_vehicle_to_dict(contract.vehicle)

        # Generate analysis for context
        analysis = NegotiationRules.analyze_contract(
            sla_data=sla_data,
            vehicle_data=vehicle_data
        )
        
        # ✅ GET OR CREATE THREAD
        thread_id = request.thread_id
        
        if thread_id:
            # Verify thread exists and belongs to this contract
            thread = await db.negotiationthread.find_unique(
                where={"id": thread_id}
            )
            if not thread or thread.contractId != contract_id:
                raise HTTPException(status_code=404, detail="Thread not found or doesn't belong to this contract")
        else:
            # Create new thread
            thread = await db.negotiationthread.create(
                data={
                    "userId": contract.userId,
                    "contractId": contract_id,
                    "dealerId": contract.dealerId,
                    "lenderId": contract.lenderId,
                    "channel": "ai_chat",
                    "subject": f"Q&A - {vehicle_data.get('year', '')} {vehicle_data.get('make', '')} {vehicle_data.get('model', '')}"
                }
            )
            thread_id = thread.id
        
        # ✅ LOAD CONVERSATION HISTORY from database
        messages = await db.negotiationmessage.find_many(
            where={"threadId": thread_id},
            order={"sentAt": "asc"}
        )
        
        # Convert to conversation history format
        conversation_history = []
        for msg in messages:
            conversation_history.append({
                "role": msg.senderRole,
                "content": msg.body
            })
        
        # ✅ SAVE: User's question
        await db.negotiationmessage.create(
            data={
                "threadId": thread_id,
                "senderRole": "user",
                "body": request.question
            }
        )
        
        # Get answer with full context (handles income extraction automatically)
        answer = NegotiationChatbot.answer_followup_question(
            user_question=request.question,
            sla_data=sla_data,
            negotiation_intents=analysis["negotiation_intents"],
            analysis=analysis,
            vehicle_data=vehicle_data,
            conversation_history=conversation_history  # Pass DB history
        )
        
        # ✅ SAVE: AI's answer
        await db.negotiationmessage.create(
            data={
                "threadId": thread_id,
                "senderRole": "assistant",
                "body": answer
            }
        )
        
        return {
            "contract_id": contract_id,
            "thread_id": thread_id,
            "question": request.question,
            "answer": answer
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Q&A error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Question answering failed: {str(e)}")


