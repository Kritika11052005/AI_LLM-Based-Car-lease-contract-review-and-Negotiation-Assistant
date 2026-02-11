from fastapi import APIRouter
from app.services.rule_engine import apply_rules
from app.services.negotiation_prompt import build_prompt
from app.services.llm_client import call_llm
from app.services.chat_persistence import (
    save_conversation,
    get_sla_from_db,
    load_memory,
    get_chat_history
)

router = APIRouter(prefix="/chat", tags=["Chat"])


# MAIN CHAT ENDPOINT
@router.post("")
def chat(contract_id: int, message: str):

    # Load contract SLA
    sla = get_sla_from_db(contract_id)

    # Apply risk rules
    flags = apply_rules(sla)

    # Load previous conversation
    memory = load_memory(contract_id)

    # Build prompt
    prompt = build_prompt(
        sla=sla,
        risk_context=flags,
        memory=memory,
        user_message=message
    )

    # Call LLM
    reply = call_llm(prompt)

    # Save conversation
    save_conversation(
        contract_id=contract_id,
        user_message=message,
        bot_reply=reply,
        flags=flags
    )

    return {"reply": reply}


# HISTORY ENDPOINT (for frontend)
@router.get("/history")
def history(contract_id: int):
    return get_chat_history(contract_id)

from sqlalchemy import text
from app.database import SessionLocal

@router.get("/history")
def get_chat_history(contract_id: int):

    db = SessionLocal()

    rows = db.execute(
        text("""
            SELECT user_message, bot_reply
            FROM chat_logs
            WHERE contract_id = :id
            ORDER BY created_at ASC
        """),
        {"id": contract_id}
    ).fetchall()

    db.close()

    history = []

    for row in rows:
        history.append({
            "user": row[0],
            "assistant": row[1]
        })

    return history
