from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Contract
from ..services.ocr_engine import extract_text_from_pdf
import shutil
import os

router = APIRouter()

@router.post("/upload")
async def upload_contract(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # 1. Save File
    file_location = f"uploads/{file.filename}"
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 2. Extract Text (OCR)
    text_content = extract_text_from_pdf(file_location)

    # 3. Store in Postgres
    new_contract = Contract(
        filename=file.filename,
        file_path=file_location,
        raw_text=text_content
    )
    db.add(new_contract)
    db.commit()
    db.refresh(new_contract)

    return {"id": new_contract.id, "message": "OCR Extraction Complete"}