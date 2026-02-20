from fastapi import UploadFile, File, APIRouter
import os
from sqlalchemy import text
from app.database import SessionLocal

from app.services.extraction import extract_text_with_langchain
from app.services.sla_extractor import extract_sla
from app.services.vin_extractor import extract_vin
from app.services.nhtsa_client import decode_vin, get_recalls
from app.services.dealer_price_service import extract_dealer_price

import json
import re

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def normalize_text(text: str) -> str:
    text = text.replace("\x00", "")
    text = text.replace("\n", " ")
    text = text.replace("\r", " ")
    text = re.sub(r"\s+", " ", text)
    return text


@router.post("/upload")
async def upload_contract(file: UploadFile = File(...)):

    db = SessionLocal()

    try:

        safe_name = file.filename.replace(" ", "_")
        file_path = os.path.join(UPLOAD_DIR, safe_name)

        with open(file_path, "wb") as f:
            f.write(await file.read())

        print("File saved:", file_path)

        docs = extract_text_with_langchain(file_path)
        raw_text = "\n".join(d.page_content for d in docs)
        raw_text = normalize_text(raw_text)

        print("Text extracted length:", len(raw_text))

        sla = extract_sla(raw_text)
        print("SLA extracted:", sla)

        dealer_price = extract_dealer_price(raw_text)
        print("Dealer price extracted:", dealer_price)

        vin = extract_vin(raw_text)
        print("VIN extracted:", vin)

        vehicle = decode_vin(vin) if vin else None
        recalls = get_recalls(vin) if vin else None

        analysis_dict = {
            "vin": vin,
            "vehicle": vehicle,
            "recalls": recalls,
            "sla": sla,
            "dealer_price": dealer_price,
            "market_price": None,
            "fairness": None
        }

        result = db.execute(
            text("""
                INSERT INTO contract_analysis
                (filename, raw_text, analysis)
                VALUES (:filename, :raw_text, :analysis)
                RETURNING id
            """),
            {
                "filename": safe_name,
                "raw_text": raw_text,
                "analysis": json.dumps(analysis_dict)
            }
        )

        contract_id = result.scalar()
        db.commit()

        return {
            "contract_id": contract_id,
            "filename": safe_name,
            "vin": vin,
            "vehicle": vehicle,
            "dealer_price": dealer_price
        }

    finally:
        db.close()