from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Form
from sqlalchemy.orm import Session
import os
import uuid
from datetime import datetime
from typing import Optional

from database import get_db, Contract, OCRText
from app.services.extraction import extract_text_from_file

router = APIRouter()

# Allowed file types
ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.bmp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

@router.post("/upload")
async def upload_contract(
    file: UploadFile = File(...),
    user_id: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Upload a car lease contract (PDF or image) for processing
    """
    try:
        # Validate file type
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Read file content to get size
        content = await file.read()
        file_size = len(content)
        
        # Validate file size
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        # Generate unique filename
        unique_filename = f"{uuid.uuid4().hex}{file_ext}"
        file_path = os.path.join("contracts", unique_filename)
        
        # Save file
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Create contract record
        contract = Contract(
            file_name=file.filename,
            file_path=file_path,
            file_size=file_size,
            file_type=file_ext.lstrip('.'),
            user_id=user_id
        )
        
        db.add(contract)
        db.commit()
        db.refresh(contract)
        
        # Extract text from file
        try:
            extracted_text, confidence = extract_text_from_file(file_path)
            
            # Create OCR text record
            ocr_text = OCRText(
                contract_id=contract.id,
                raw_text=extracted_text,
                confidence_score=confidence
            )
            
            db.add(ocr_text)
            db.commit()
            db.refresh(ocr_text)
            
            return {
                "success": True,
                "message": "Contract uploaded and processed successfully",
                "contract_id": contract.id,
                "file_name": file.filename,
                "file_size": file_size,
                "text_extracted": True,
                "text_length": len(extracted_text),
                "confidence_score": confidence,
                "next_step": "Ready for LLM SLA extraction (Week 3-4)"
            }
            
        except Exception as extraction_error:
            # If extraction fails, still save the contract but mark extraction as failed
            error_msg = str(extraction_error)
            
            # Create minimal OCR text record
            ocr_text = OCRText(
                contract_id=contract.id,
                raw_text=f"Extraction failed: {error_msg}",
                confidence_score=0.0
            )
            
            db.add(ocr_text)
            db.commit()
            
            return {
                "success": True,
                "message": "Contract uploaded but text extraction failed",
                "contract_id": contract.id,
                "file_name": file.filename,
                "text_extracted": False,
                "error": error_msg,
                "next_step": "Check file format or try different file"
            }
    
    except HTTPException:
        raise
    except Exception as e:
        if 'db' in locals():
            db.rollback()
        raise HTTPException(status_code=500, detail=f"Error uploading contract: {str(e)}")

@router.get("/contract/{contract_id}")
async def get_contract(
    contract_id: int,
    db: Session = Depends(get_db)
):
    """
    Get contract details and extracted text
    """
    try:
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")
        
        ocr_texts = db.query(OCRText).filter(OCRText.contract_id == contract_id).all()
        
        return {
            "contract": {
                "id": contract.id,
                "file_name": contract.file_name,
                "file_size": contract.file_size,
                "file_type": contract.file_type,
                "upload_date": contract.upload_date.isoformat() if contract.upload_date else None
            },
            "ocr_texts": [
                {
                    "id": text.id,
                    "extraction_date": text.extraction_date.isoformat() if text.extraction_date else None,
                    "confidence_score": text.confidence_score,
                    "text_preview": text.raw_text[:500] + "..." if len(text.raw_text) > 500 else text.raw_text,
                    "text_length": len(text.raw_text)
                }
                for text in ocr_texts
            ]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching contract: {str(e)}")