import io
import os
from fastapi import FastAPI, UploadFile, File
from PyPDF2 import PdfReader
import pytesseract
from pdf2image import convert_from_bytes

from app.database import SessionLocal, engine
from app.database import SessionLocal, engine
from app.database import Base
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Milestone-1: Secure Document Upload & Store")

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    content = await file.read()
    name = file.filename.lower()

    if not name.endswith(".pdf"):
        return {"error": "Only PDF files are supported"}

    extracted_text = ""
    reader = PdfReader(io.BytesIO(content))
    for page in reader.pages:
        extracted_text += page.extract_text() or ""
    if extracted_text.strip() == "":
        images = convert_from_bytes(content)
        for img in images:
            extracted_text += pytesseract.image_to_string(img)

    db = SessionLocal()
    try:
        new_contract = Contract(file_name=file.filename, raw_text=extracted_text)
        db.add(new_contract)
        db.commit()
        db.refresh(new_contract)
    finally:
        db.close()

    return {
        "message": "Contract uploaded and stored securely",
        "db_id": new_contract.id,
        "file_name": file.filename,
        "text_length": len(extracted_text)
    }
