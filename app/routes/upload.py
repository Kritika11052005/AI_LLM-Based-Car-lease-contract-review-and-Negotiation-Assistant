from fastapi import UploadFile, File, APIRouter
import os
from sqlalchemy import text
from app.database import SessionLocal
from app.services.extraction import extract_text_with_langchain
from app.services.sla_extractor import extract_sla
from app.services.vin_extractor import extract_vin
from app.services.nhtsa_client import decode_vin, get_recalls
import json

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_contract(file: UploadFile = File(...)):
    safe_name = file.filename.replace(" ", "_")
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    with open(file_path, "wb") as f:
        f.write(await file.read())

    docs = extract_text_with_langchain(file_path)
    raw_text = "\n".join(d.page_content for d in docs).replace("\x00", "")

    # ---- LLM SLA ----
    sla = extract_sla(raw_text)

    # ---- VIN + NHTSA ----
    vin = extract_vin(raw_text)
    vehicle = None
    recalls = None

    if vin:
        vehicle = decode_vin(vin)
        recalls = get_recalls(vin)

    analysis = json.dumps({
    "vin": vin,
    "vehicle": vehicle,
    "recalls": recalls,
    "sla": sla
})
    db = SessionLocal()
    result = db.execute(
        text("""
            INSERT INTO contract_analysis (filename, raw_text, analysis)
            VALUES (:f, :raw, :a)
            RETURNING id
        """),
        {
            "f": safe_name,
            "raw": raw_text,
            "a": analysis
        }
    )

    contract_id = result.scalar()
    db.commit()
    db.close()

    return {
        "contract_id": contract_id,
        "filename": safe_name,
        "analysis": analysis
    }
