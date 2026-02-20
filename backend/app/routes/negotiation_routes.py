"""
Simplified Negotiation Routes with Database Persistence

1. POST /analyze-contract/{contract_id} - Analyze contract & save intents
2. POST /negotiate-script/{contract_id} - Generate & save script
3. POST /negotiate-ask/{contract_id}    - Ask questions & save chat history

Changes:
- convert_sla_to_dict() now maps ALL ContractSLA schema fields
- market_data pulled from ContractSLA.otherTerms and passed to all LLM calls
- ✅ Fixed: NegotiationChatbot async methods are now properly awaited
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict
from app.generated.prisma import Prisma
from app.database import get_db
import json

router = APIRouter()


# ============================================
# REQUEST / RESPONSE MODELS
# ============================================

class NegotiationAnalysisResponse(BaseModel):
    contract_id:         str
    fairness_score:      float
    rating:              str
    summary:             str
    red_flags:           List[str]
    warnings:            List[str]
    negotiation_intents: List[Dict]


class ScriptResponse(BaseModel):
    contract_id:        str
    thread_id:          str
    fairness_score:     float
    rating:             str
    negotiation_script: str


class QuestionRequest(BaseModel):
    question:  str
    thread_id: Optional[str] = None


class QuestionResponse(BaseModel):
    contract_id: str
    thread_id:   str
    question:    str
    answer:      str


# ============================================
# HELPER FUNCTIONS
# ============================================

def convert_sla_to_dict(sla) -> Dict:
    """
    Convert Prisma ContractSLA model to dict.
    Maps ALL schema fields so the LLM has complete contract context.
    """
    if not sla:
        return {}

    def to_float(value):
        return float(value) if value is not None else None

    return {
        # ── financial terms ────────────────────────────────────────────────────
        "interest_rate":          f"{float(sla.aprPercent)}%" if sla.aprPercent else None,
        "money_factor":           to_float(sla.moneyFactor),
        "monthly_payment":        to_float(sla.monthlyPayment),
        "down_payment":           to_float(sla.downPayment),
        "fees_total":             to_float(sla.feesTotal),
        "lease_term_months":      sla.termMonths,

        # ── vehicle pricing ────────────────────────────────────────────────────
        "msrp":                   to_float(sla.msrp),
        "dealer_price":           to_float(sla.capCost) or to_float(sla.dealerPrice),
        "cap_cost_reduction":     to_float(sla.capCostReduction),

        # ── residual ──────────────────────────────────────────────────────────
        "residual_value":         to_float(sla.residualValue),
        "residual_percent_msrp":  to_float(sla.residualPercentMsrp),

        # ── mileage ───────────────────────────────────────────────────────────
        "mileage_allowance":      sla.mileageAllowanceYr,
        "overage_charge":         to_float(sla.mileageOverageFee),

        # ── fees ──────────────────────────────────────────────────────────────
        "early_termination_fee":  to_float(sla.earlyTerminationFee),
        "disposition_fee":        to_float(sla.dispositionFee),
        "purchase_option_price":  to_float(sla.purchaseOptionPrice),

        # ── policies (text fields) ────────────────────────────────────────────
        "late_fee":               sla.lateFeePolicy,
        "insurance_requirements": sla.insuranceRequirements,
        "maintenance_resp":       sla.maintenanceResp,
        "warranty_summary":       sla.warrantySummary,
    }


def convert_vehicle_to_dict(vehicle) -> Optional[Dict]:
    """Convert Prisma Vehicle model to dict."""
    if not vehicle:
        return None
    return {
        "vin":   vehicle.vin,
        "year":  vehicle.year,
        "make":  vehicle.make,
        "model": vehicle.model,
        "trim":  vehicle.trim,
    }


def extract_market_data(sla) -> Optional[Dict]:
    """
    Pull market price data stored by /api/market/enrich in ContractSLA.otherTerms.
    Returns None if not present so chatbot gracefully skips market context.
    """
    if not sla or not sla.otherTerms:
        return None

    try:
        raw    = sla.otherTerms
        parsed = raw if isinstance(raw, dict) else json.loads(raw)
        blob   = parsed.get("__market__", {})

        if not blob.get("market_price"):
            return None

        return {
            "predicted_price":  blob.get("market_price"),
            "price_range": {
                "low":  blob.get("price_range_low"),
                "high": blob.get("price_range_high"),
            },
            "listings_sampled": blob.get("listings_sampled"),
            "listings_found":   blob.get("listings_found"),
            "source":           blob.get("source"),
            "dealer_price":     float(sla.capCost or sla.dealerPrice or 0) or None,
        }
    except Exception:
        return None


# ============================================
# ENDPOINT 1: ANALYZE CONTRACT
# ============================================

@router.post("/analyze-contract/{contract_id}", response_model=NegotiationAnalysisResponse)
async def analyze_contract(
    contract_id: str,
    db: Prisma = Depends(get_db),
):
    """
    Analyze contract, generate negotiation intents, save to database.

    Saves:
    - negotiationIntents → Contract.negotiationIntents
    - fairnessScore      → Contract.fairnessScore
    - redFlagLevel       → Contract.redFlagLevel
    """
    from app.core.negotiation_rules import NegotiationRules

    contract = await db.contract.find_unique(
        where={"id": contract_id},
        include={"sla": True, "vehicle": True},
    )

    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    if not contract.sla:
        raise HTTPException(
            status_code=400,
            detail="No SLA data. Run /extract-sla/{contract_id} first.",
        )

    try:
        sla_data     = convert_sla_to_dict(contract.sla)
        vehicle_data = convert_vehicle_to_dict(contract.vehicle)

        analysis = NegotiationRules.analyze_contract(
            sla_data=sla_data,
            vehicle_data=vehicle_data,
            user_income=None,
        )

        await db.contract.update(
            where={"id": contract_id},
            data={
                "negotiationIntents": json.dumps(analysis["negotiation_intents"]),
                "fairnessScore":      analysis["fairness_score"],
                "redFlagLevel":       analysis["rating"],
            },
        )

        return {
            "contract_id":         contract_id,
            "fairness_score":      analysis["fairness_score"],
            "rating":              analysis["rating"],
            "summary":             analysis["summary"],
            "red_flags":           analysis["red_flags"],
            "warnings":            analysis["warnings"],
            "negotiation_intents": analysis["negotiation_intents"],
        }

    except Exception as e:
        import traceback
        print(f"Analysis error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


# ============================================
# ENDPOINT 2: GENERATE SCRIPT
# ============================================

@router.post("/negotiate-script/{contract_id}", response_model=ScriptResponse)
async def generate_script(
    contract_id: str,
    db: Prisma = Depends(get_db),
):
    """
    Generate comprehensive negotiation script and save to database.

    Saves:
    - Creates NegotiationThread for this contract
    - Saves script as first NegotiationMessage (role: assistant)

    Passes full SLA + market price to LLM for accurate, context-aware script.
    """
    from app.core.negotiation_chatbot import NegotiationChatbot
    from app.core.negotiation_rules import NegotiationRules

    contract = await db.contract.find_unique(
        where={"id": contract_id},
        include={"sla": True, "vehicle": True, "user": True},
    )

    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    if not contract.sla:
        raise HTTPException(status_code=400, detail="No SLA data. Run /extract-sla first.")

    try:
        sla_data     = convert_sla_to_dict(contract.sla)
        vehicle_data = convert_vehicle_to_dict(contract.vehicle)
        market_data  = extract_market_data(contract.sla)

        analysis = NegotiationRules.analyze_contract(
            sla_data=sla_data,
            vehicle_data=vehicle_data,
        )

        # ✅ FIX 1: added await — was passing a coroutine object to Prisma
        script = await NegotiationChatbot.generate_comprehensive_negotiation_script(
            sla_data=sla_data,
            negotiation_intents=analysis["negotiation_intents"],
            analysis=analysis,
            vehicle_data=vehicle_data,
            market_data=market_data,
        )

        vehicle_label = (
            f"{vehicle_data.get('year', '')} "
            f"{vehicle_data.get('make', '')} "
            f"{vehicle_data.get('model', '')}"
        ).strip() if vehicle_data else "Unknown Vehicle"

        thread = await db.negotiationthread.create(
            data={
                "userId":     contract.userId,
                "contractId": contract_id,
                "dealerId":   contract.dealerId,
                "lenderId":   contract.lenderId,
                "channel":    "ai_assistant",
                "subject":    f"Negotiation Script - {vehicle_label}",
            }
        )

        await db.negotiationmessage.create(
            data={
                "threadId":      thread.id,
                "senderRole":    "assistant",
                "body":          script,
                "suggestedText": None,
                "attachments":   json.dumps({
                    "fairness_score":  analysis["fairness_score"],
                    "rating":          analysis["rating"],
                    "intents_count":   len(analysis["negotiation_intents"]),
                    "market_price":    market_data.get("predicted_price") if market_data else None,
                    "market_source":   market_data.get("source") if market_data else None,
                }),
            }
        )

        return {
            "contract_id":        contract_id,
            "thread_id":          thread.id,
            "fairness_score":     analysis["fairness_score"],
            "rating":             analysis["rating"],
            "negotiation_script": script,
        }

    except Exception as e:
        import traceback
        print(f"Script generation error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Script generation failed: {str(e)}")


# ============================================
# ENDPOINT 3: ASK QUESTIONS
# ============================================

@router.post("/negotiate-ask/{contract_id}", response_model=QuestionResponse)
async def ask_question(
    contract_id: str,
    request: QuestionRequest,
    db: Prisma = Depends(get_db),
):
    """
    Answer negotiation questions with full contract + market context.

    Saves:
    - Creates NegotiationThread if thread_id not provided
    - Saves user question as NegotiationMessage (role: user)
    - Saves AI answer as NegotiationMessage  (role: assistant)

    Passes full SLA + market price to LLM for accurate, context-aware answers.
    """
    from app.core.negotiation_chatbot import NegotiationChatbot
    from app.core.negotiation_rules import NegotiationRules

    contract = await db.contract.find_unique(
        where={"id": contract_id},
        include={"sla": True, "vehicle": True, "user": True},
    )

    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    if not contract.sla:
        raise HTTPException(status_code=400, detail="No SLA data. Run /extract-sla first.")

    try:
        sla_data     = convert_sla_to_dict(contract.sla)
        vehicle_data = convert_vehicle_to_dict(contract.vehicle)
        market_data  = extract_market_data(contract.sla)

        analysis = NegotiationRules.analyze_contract(
            sla_data=sla_data,
            vehicle_data=vehicle_data,
        )

        # ── get or create thread ───────────────────────────────────────────────
        thread_id = request.thread_id

        if thread_id:
            thread = await db.negotiationthread.find_unique(
                where={"id": thread_id}
            )
            if not thread or thread.contractId != contract_id:
                raise HTTPException(
                    status_code=404,
                    detail="Thread not found or doesn't belong to this contract",
                )
        else:
            vehicle_label = (
                f"{vehicle_data.get('year', '')} "
                f"{vehicle_data.get('make', '')} "
                f"{vehicle_data.get('model', '')}"
            ).strip() if vehicle_data else "Unknown Vehicle"

            thread = await db.negotiationthread.create(
                data={
                    "userId":     contract.userId,
                    "contractId": contract_id,
                    "dealerId":   contract.dealerId,
                    "lenderId":   contract.lenderId,
                    "channel":    "ai_chat",
                    "subject":    f"Q&A - {vehicle_label}",
                }
            )
            thread_id = thread.id

        # ── load conversation history ──────────────────────────────────────────
        messages = await db.negotiationmessage.find_many(
            where={"threadId": thread_id},
            order={"sentAt": "asc"},
        )
        conversation_history = [
            {"role": msg.senderRole, "content": msg.body}
            for msg in messages
        ]

        # ── save user question ─────────────────────────────────────────────────
        await db.negotiationmessage.create(
            data={
                "threadId":   thread_id,
                "senderRole": "user",
                "body":       request.question,
            }
        )

        # ✅ FIX 2: added await — was passing a coroutine object to Prisma
        answer = await NegotiationChatbot.answer_followup_question(
            user_question=request.question,
            sla_data=sla_data,
            negotiation_intents=analysis["negotiation_intents"],
            analysis=analysis,
            vehicle_data=vehicle_data,
            conversation_history=conversation_history,
            market_data=market_data,
        )

        # ── save AI answer ─────────────────────────────────────────────────────
        await db.negotiationmessage.create(
            data={
                "threadId":   thread_id,
                "senderRole": "assistant",
                "body":       answer,
            }
        )

        return {
            "contract_id": contract_id,
            "thread_id":   thread_id,
            "question":    request.question,
            "answer":      answer,
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Q&A error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Question answering failed: {str(e)}")