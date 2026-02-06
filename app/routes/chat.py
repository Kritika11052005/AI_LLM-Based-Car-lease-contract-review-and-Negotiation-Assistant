from fastapi import APIRouter
from app.services.rule_engine import apply_rules
from app.services.negotiation_prompt import build_prompt
from app.services.llm_client import call_llm
from app.services.chat_persistence import (
    save_conversation,
    get_sla_from_db,
    load_memory
)

router = APIRouter(prefix="/chat", tags=["Chat"])

@router.post("")
def chat(contract_id: int, message: str):

    # 1. Load extracted contract data
    sla = get_sla_from_db(contract_id)

    # 2. Apply rules (internal only)
    flags = apply_rules(sla)

    # 3. Load conversation memory
    memory = load_memory(contract_id)

    # 4. Build negotiation prompt
    prompt = build_prompt(
        sla=sla,
        risk_context=flags,   # internal
        memory=memory,
        user_message=message
    )

    # 5. Ask LLM
    reply = call_llm(prompt)

    # 6. Store conversation FIRST (with flags)
    save_conversation(
        contract_id=contract_id,
        user_message=message,
        bot_reply=reply,
        flags=flags
    )

    # 7. Return only chatbot reply
    return {"reply": reply}

from app.services.chat_persistence import get_chat_history

@router.get("/history")
def chat_history(contract_id: int):
    messages = get_chat_history(contract_id)

    return {
        "contract_id": contract_id,
        "messages": messages
    }

