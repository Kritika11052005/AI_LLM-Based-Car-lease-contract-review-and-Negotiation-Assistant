import os
import shutil
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from models import Contract
from services.pdf_extraction import extract_text_from_pdf

router = APIRouter(prefix="/upload", tags=["Upload"])

# Ensure temp directory exists
TEMP_DIR = "temp_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)

@router.post("/")
def upload_contract(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    file_path = os.path.join(TEMP_DIR, file.filename)
    
    try:
        # Save file temporarily
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Extract text
        extracted_text = extract_text_from_pdf(file_path)

        # Save to database
        db_contract = Contract(filename=file.filename, raw_text=extracted_text)
        db.add(db_contract)
        db.commit()
        db.refresh(db_contract)

        return {
            "id": db_contract.id,
            "filename": db_contract.filename,
            "message": "Contract uploaded and text extracted successfully"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
    
    finally:
        # Clean up temporary file
        if os.path.exists(file_path):
            os.remove(file_path)
