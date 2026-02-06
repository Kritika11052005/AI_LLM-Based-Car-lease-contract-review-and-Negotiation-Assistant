from sqlalchemy import text
from datetime import datetime
from app.database import SessionLocal
import json

def save_conversation(contract_id, user_message, bot_reply, flags):
    db = SessionLocal()
    db.execute(
        text("""
            INSERT INTO chat_logs
            (contract_id, user_message, bot_reply, flags, created_at)
            VALUES (:c, :u, :b, :f, :t)
        """),
        {
            "c": contract_id,
            "u": user_message,
            "b": bot_reply,
            "f": json.dumps(flags),
            "t": datetime.utcnow()
        }
    )
    db.commit()
    db.close()


def get_sla_from_db(contract_id):
    db = SessionLocal()
    result = db.execute(
        text("SELECT analysis FROM contract_analysis WHERE id=:id"),
        {"id": contract_id}
    ).fetchone()
    db.close()

    if not result:
        return {}

    data = result[0]
    return data.get("sla", {})


def load_memory(contract_id, limit=5):
    db = SessionLocal()
    rows = db.execute(
        text("""
            SELECT user_message, bot_reply
            FROM chat_logs
            WHERE contract_id=:id
            ORDER BY created_at DESC
            LIMIT :l
        """),
        {"id": contract_id, "l": limit}
    ).fetchall()
    db.close()

    rows.reverse()
    memory = ""
    for u, b in rows:
        memory += f"User: {u}\nAssistant: {b}\n"

    return memory

def get_chat_history(contract_id: int):
    db = SessionLocal()
    rows = db.execute(
        text("""
            SELECT user_message, bot_reply, created_at
            FROM chat_logs
            WHERE contract_id = :id
            ORDER BY created_at ASC
        """),
        {"id": contract_id}
    ).fetchall()
    db.close()

    messages = []

    for user_msg, bot_msg, ts in rows:
        messages.append({
            "role": "user",
            "content": user_msg,
            "timestamp": ts.isoformat()
        })
        messages.append({
            "role": "assistant",
            "content": bot_msg,
            "timestamp": ts.isoformat()
        })

    return messages

