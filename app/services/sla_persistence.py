from sqlalchemy import text
from app.database import SessionLocal
import json

def save_sla(contract_id: int, sla_obj):
    db = SessionLocal()

    db.execute(
        text("""
        INSERT INTO sla (contract_id, sla_json)
        VALUES (:cid, :json)
        """),
        {
            "cid": contract_id,
            "json": json.dumps(sla_obj)
        }
    )

    db.commit()
    db.close()
