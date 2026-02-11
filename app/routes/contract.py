from fastapi import APIRouter
from sqlalchemy import text
from app.database import SessionLocal
import json

router = APIRouter(prefix="/contract", tags=["Contract"])


@router.get("")
def get_contract(contract_id: int):

    db = SessionLocal()

    result = db.execute(
        text("""
            SELECT analysis
            FROM contract_analysis
            WHERE id = :id
        """),
        {"id": contract_id}
    ).fetchone()

    db.close()

    if not result:
        return {
            "sla": {},
            "vehicle": {},
            "vin": None,
            "recalls": {}
        }

    analysis = result[0]

    # Convert string → dict if needed
    if isinstance(analysis, str):
        analysis = json.loads(analysis)

    # Ensure keys exist
    return {
        "sla": analysis.get("sla", {}),
        "vehicle": analysis.get("vehicle", {}),
        "vin": analysis.get("vin", None),
        "recalls": analysis.get("recalls", {})
    }
