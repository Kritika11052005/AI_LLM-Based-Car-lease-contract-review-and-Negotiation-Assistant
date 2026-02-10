from app.services.rule_engine import extract_negotiation_intents
from app.services.negotiation_service import generate_negotiation_message
from app.database import SessionLocal
from app.models import NegotiationMessage
from uuid import UUID
from datetime import datetime
import traceback
from uuid import UUID, uuid4

def negotiation_chat(thread_id: UUID, contract_data: dict, user_message: str):
    db = SessionLocal()

    try:
        intents = extract_negotiation_intents(contract_data)
        print(f"Extracted intents: {intents}") 

        reply = generate_negotiation_message(intents, contract_data)

        db.add(NegotiationMessage(
            id=uuid4(),
            thread_id=thread_id,
            sender_role="user",
            body=user_message,
            sent_at=datetime.utcnow()

        ))
        db.add(NegotiationMessage(
            id=uuid4(),
            thread_id=thread_id,
            sender_role="assistant",
            body=reply,
            sent_at=datetime.utcnow()
        ))

        db.commit()
        return {
            "negotiation_intents": intents,
            "assistant_reply": reply
        }
    
    except Exception as e:
        db.rollback()
        print(f"Error in negotiation_chat: {str(e)}")
        print(traceback.format_exc())
        return {
            "error": str(e),
            "negotiation_intents": [],
            "assistant_reply": "An error occurred while processing your request."
        }
    finally:
        db.close()
