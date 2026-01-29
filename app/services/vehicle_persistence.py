from sqlalchemy import text
from app.database import SessionLocal
import json

def save_vehicle(contract_id: int, vehicle: dict, recalls: list | None):
    db = SessionLocal()
    db.execute(
        text("""
            INSERT INTO vehicle_data (contract_id, vin, vehicle_json, recalls_json)
            VALUES (:cid, :vin, :vjson, :rjson)
        """),
        {
            "cid": contract_id,
            "vin": vehicle.get("vin") if vehicle else None,
            "vjson": json.dumps(vehicle) if vehicle else None,
            "rjson": json.dumps(recalls) if recalls else None
        }
    )
    db.commit()
    db.close()
