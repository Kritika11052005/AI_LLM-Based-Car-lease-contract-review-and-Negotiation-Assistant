from fastapi import UploadFile, File
import os
from sqlalchemy import text

from app.services.extraction import extract_text_with_langchain
from app.database import SessionLocal

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


async def upload_contract(file: UploadFile = File(...)):
    safe_name = file.filename.replace(" ", "_")
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    with open(file_path, "wb") as f:
        f.write(await file.read())

    docs = extract_text_with_langchain(file_path)
    raw_text = "\n".join(d.page_content for d in docs)
    raw_text = raw_text.replace("\x00", "")

    db = SessionLocal()
    db.execute(
    text("""
        INSERT INTO contracts (filename, raw_text, extracted_text, ingestion_method)
        VALUES (:f, :raw, :ext, :m)
    """),
    {
        "f": safe_name,
        "raw": raw_text,
        "ext": raw_text,
        "m": "auto"
    }
)

    db.commit()
    db.close()

    return {
        "message": "Uploaded & processed",
        "filename": safe_name,
        "characters": len(raw_text)
    }
