import os
import json
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from app.generated.prisma import Prisma
from app.core.config import UPLOAD_DIR
from app.core.ocr_service import OCRService
from app.core.llm_service import LLMService
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

@router.post("/extract-sla/{contract_id}")
async def extract_sla(contract_id: int, db: Prisma = Depends(get_db)):
    """Extract SLA details from an uploaded contract using LLM"""
    
    # Get contract from database
    contract = await db.contract.find_unique(where={"id": contract_id})
    
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if not contract.extractedText:
        raise HTTPException(status_code=400, detail="No extracted text available for this contract")
    
    try:
        # Extract SLA using LLM
        sla_data = LLMService.extract_sla_details(contract.extractedText)
        
        # Convert Pydantic model to dict
        sla_dict = sla_data.model_dump(exclude_none=True)
        
        # Debug: print what we're trying to save
        print(f"SLA Dict before cleaning: {sla_dict}")
        print(f"SLA Dict types: {[(k, type(v)) for k, v in sla_dict.items()]}")
        
        # Use raw SQL to update with JSONB
        # This bypasses Prisma's validation
        await db.execute_raw(
            f"""
            UPDATE "Contract" 
            SET "extractedData" = $1::jsonb, 
                "status" = $2
            WHERE id = $3
            """,
            json.dumps(sla_dict),
            "sla_extracted",
            contract_id
        )
        
        # Fetch the updated contract
        updated_contract = await db.contract.find_unique(where={"id": contract_id})
        
        return {
            "message": "SLA extraction completed",
            "contract_id": updated_contract.id,
            "sla_data": sla_dict
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # Detailed error logging
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error in extract_sla: {error_trace}")
        raise HTTPException(
            status_code=500, 
            detail=f"SLA extraction failed: {str(e)}"
        )

