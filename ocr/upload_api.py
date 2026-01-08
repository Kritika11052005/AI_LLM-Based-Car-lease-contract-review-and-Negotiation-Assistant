from fastapi import APIRouter, UploadFile, File, Depends
import os, shutil
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Contract, OCRText
from ocr.pdf_utils import pdf_to_images
from ocr.ocr_service import extract_text_from_image

router = APIRouter(prefix="/api/v1/upload", tags=["Upload & OCR"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/")
def upload_contract(file: UploadFile = File(...), db: Session = Depends(get_db)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    extracted_text = ""

    if file.filename.lower().endswith(".pdf"):
        images = pdf_to_images(file_path, UPLOAD_DIR)
        for img in images:
            extracted_text += extract_text_from_image(img) + "\n"
    else:
        extracted_text = extract_text_from_image(file_path)

    contract = Contract(file_name=file.filename, file_path=file_path)
    db.add(contract)
    db.commit()
    db.refresh(contract)

    ocr = OCRText(contract_id=contract.id, raw_text=extracted_text)
    db.add(ocr)
    db.commit()

    return {
        "message": "Upload + OCR completed",
        "contract_id": contract.id,
        "text_length": len(extracted_text)
    }
