import os
from fastapi import APIRouter, UploadFile, File, Depends
from app.generated.prisma import Prisma
from app.core.config import UPLOAD_DIR
from app.core.ocr_service import OCRService
from app.database import get_db

router = APIRouter()

os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload-contract")
async def upload_contract(file: UploadFile = File(...), db: Prisma = Depends(get_db)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    
    # Save file
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    file_size = len(content)
    
    # Extract text from document
    try:
        extracted_text = OCRService.extract_text(file_path)
    except Exception as e:
        extracted_text = f"Text extraction failed: {str(e)}"
    
    # Save to database
    contract = await db.contract.create(
        data={
            "filename": file.filename,
            "filePath": file_path,
            "fileSize": file_size,
            "extractedText": extracted_text
        }
    )

    return {
        "message": "Contract uploaded successfully",
        "contract_id": contract.id,
        "filename": contract.filename,
        "file_path": contract.filePath,
        "file_size": contract.fileSize,
        "extracted_text_preview": extracted_text[:200] if extracted_text else None
    }