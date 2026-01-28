import os
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
    """Extract SLA details and VIN from an uploaded contract using LLM"""
    from app.core.vin_extractor import VINExtractor
    from app.core.vin_service import VINService
    import json
    
    # Get contract from database
    contract = await db.contract.find_unique(where={"id": contract_id})
    
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if not contract.extractedText:
        raise HTTPException(status_code=400, detail="No extracted text available for this contract")
    
    try:
        # Extract SLA using LLM
        sla_data = LLMService.extract_sla_details(contract.extractedText)
        
        # Extract VIN from contract text
        vin = VINExtractor.extract_vin(contract.extractedText)
        
        # If VIN found, lookup vehicle data
        vehicle_data = None
        if vin:
            vehicle_data = VINService.lookup_vin(vin)
            # Remove raw_data to keep response clean
            if "raw_data" in vehicle_data:
                del vehicle_data["raw_data"]
        
        # Convert to JSON strings
        sla_dict = sla_data.model_dump()
        sla_json = json.dumps(sla_dict)
        vehicle_json = json.dumps(vehicle_data) if vehicle_data else None
        
        # Use raw SQL to update (bypasses Prisma validation issues)
        if vin and vehicle_json:
            await db.execute_raw(
                '''UPDATE "Contract" 
                   SET "extractedData" = $1::jsonb, 
                       "vin" = $2, 
                       "vehicleData" = $3::jsonb,
                       "status" = $4
                   WHERE id = $5''',
                sla_json, vin, vehicle_json, "completed", contract_id
            )
        elif vin:
            await db.execute_raw(
                '''UPDATE "Contract" 
                   SET "extractedData" = $1::jsonb, 
                       "vin" = $2,
                       "status" = $3
                   WHERE id = $4''',
                sla_json, vin, "completed", contract_id
            )
        else:
            await db.execute_raw(
                '''UPDATE "Contract" 
                   SET "extractedData" = $1::jsonb,
                       "status" = $2
                   WHERE id = $3''',
                sla_json, "completed", contract_id
            )
        
        # Fetch updated contract
        updated_contract = await db.contract.find_unique(where={"id": contract_id})
        
        return {
            "message": "SLA extraction and VIN lookup completed",
            "contract_id": updated_contract.id,
            "sla_data": sla_dict,
            "vin": vin,
            "vehicle_data": vehicle_data
        }
        
    except Exception as e:
        import traceback
        print(f"Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")
        
    """Extract SLA details and VIN from an uploaded contract using LLM"""
    from app.core.vin_extractor import VINExtractor
    from app.core.vin_service import VINService
    
    # Get contract from database
    contract = await db.contract.find_unique(where={"id": contract_id})
    
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if not contract.extractedText:
        raise HTTPException(status_code=400, detail="No extracted text available for this contract")
    
    try:
        # Extract SLA using LLM
        sla_data = LLMService.extract_sla_details(contract.extractedText)
        
        # Extract VIN from contract text
        vin = VINExtractor.extract_vin(contract.extractedText)
        
        # If VIN found, lookup vehicle data
        vehicle_data = None
        if vin:
            vehicle_data = VINService.lookup_vin(vin)
            # Remove raw_data to keep response clean
            if "raw_data" in vehicle_data:
                del vehicle_data["raw_data"]
        
        # Convert SLA data to plain dict
        sla_dict = sla_data.model_dump()
        
        # Update based on what data we have
        if vin and vehicle_data:
            updated_contract = await db.contract.update(
                where={"id": contract_id},
                data={
                    "extractedData": sla_dict,
                    "vin": vin,
                    "vehicleData": vehicle_data,
                    "status": "completed"
                }
            )
        elif vin:
            updated_contract = await db.contract.update(
                where={"id": contract_id},
                data={
                    "extractedData": sla_dict,
                    "vin": vin,
                    "status": "completed"
                }
            )
        else:
            updated_contract = await db.contract.update(
                where={"id": contract_id},
                data={
                    "extractedData": sla_dict,
                    "status": "completed"
                }
            )
        
        return {
            "message": "SLA extraction and VIN lookup completed",
            "contract_id": updated_contract.id,
            "sla_data": sla_dict,
            "vin": vin,
            "vehicle_data": vehicle_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

@router.get("/contract-with-vehicle/{contract_id}")
async def get_contract_with_vehicle(contract_id: int, db: Prisma = Depends(get_db)):
    """
    Get contract details combined with vehicle data
    This retrieves stored SLA extraction and vehicle information
    """
    
    # Get contract from database
    contract = await db.contract.find_unique(where={"id": contract_id})
    
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Combine contract and vehicle data
    return {
        "message": "Contract and vehicle data retrieved successfully",
        "contract_id": contract.id,
        "filename": contract.filename,
        "uploaded_at": contract.uploadedAt.isoformat(),
        "status": contract.status,
        "sla_data": contract.extractedData,
        "vin": contract.vin,
        "vehicle_data": contract.vehicleData
    }