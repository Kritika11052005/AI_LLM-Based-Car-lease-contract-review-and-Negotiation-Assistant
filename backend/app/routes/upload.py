"""
Clean Upload & Extraction Routes
Only 3 endpoints: upload, extract-sla, vin-lookup
"""

import os
import shutil
import re
import json
from decimal import Decimal
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from app.generated.prisma import Prisma
from app.core.config import UPLOAD_DIR
from app.core.ocr_service import OCRService
from app.core.llm_service import LLMService
from app.core.vin_extractor import VINExtractor
from app.core.vin_service import VINService
from app.database import db, get_db

router = APIRouter()

os.makedirs(UPLOAD_DIR, exist_ok=True)


# ============================================
# HELPER: IMPROVED PARSING FUNCTIONS
# ============================================

def parse_decimal(value) -> Optional[Decimal]:
    """
    Parse decimal values from various formats
    Handles: INR 28,500 / $450.00 / 2,00,000 / "5" / 5.5
    
    ✅ FIX: Handles Indian number formatting and multiple currency symbols
    """
    if value is None:
        return None
    
    # If already a number
    if isinstance(value, (int, float)):
        return Decimal(str(value))
    
    if isinstance(value, Decimal):
        return value
    
    # Convert to string and clean
    value_str = str(value).strip()
    
    if not value_str or value_str.lower() in ('null', 'none', 'n/a'):
        return None
    
    # Remove ALL currency symbols and spaces
    # Handles: INR, $, ₹, £, €, Rs, etc.
    cleaned = re.sub(r'(?i)(inr|rs\.?|₹|\$|£|€)\s*', '', value_str)
    
    # Remove commas (works for both 2,500 and 2,00,000 formats)
    cleaned = cleaned.replace(',', '')
    
    # Remove percentage signs
    cleaned = cleaned.replace('%', '')
    
    # Remove any remaining spaces
    cleaned = cleaned.strip()
    
    if not cleaned:
        return None
    
    # Extract first number found
    match = re.search(r'(\d+\.?\d*)', cleaned)
    if match:
        try:
            return Decimal(match.group(1))
        except:
            return None
    
    return None


def parse_percentage(value) -> Optional[Decimal]:
    """Extract percentage as decimal (9.5% → 9.5)"""
    if value is None:
        return None
    
    value_str = str(value).strip()
    
    # Extract first number found
    match = re.search(r'(\d+\.?\d*)', value_str)
    if match:
        try:
            return Decimal(match.group(1))
        except:
            return None
    
    return None


def parse_integer(value) -> Optional[int]:
    """Parse integer values (handles 15,000 or 15000)"""
    if value is None:
        return None
    
    if isinstance(value, int):
        return value
    
    value_str = str(value).strip()
    
    if not value_str or value_str.lower() in ('null', 'none'):
        return None
    
    # Remove commas
    cleaned = value_str.replace(',', '')
    
    # Extract first number
    match = re.search(r'(\d+)', cleaned)
    if match:
        try:
            return int(match.group(1))
        except:
            return None
    
    return None


# ============================================
# ENDPOINT 1: UPLOAD CONTRACT
# ============================================

@router.post("/upload-contract")
async def upload_contract(file: UploadFile = File(...)):
    """
    Upload contract PDF/image and extract text via OCR
    
    Returns contract_id for use in /extract-sla/{contract_id}
    """
    
    file_path = None
    
    try:
        # 1. Save file
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, file.filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 2. Extract text using OCR
        extracted_text = OCRService.extract_text(file_path)
        
        if not extracted_text:
            raise HTTPException(status_code=400, detail="Could not extract text from file")
        
        # 3. Create contract record (store extracted text in notes)
        contract = await db.contract.create(
            data={
                "notes": extracted_text,
                "docStatus": "uploaded"
            }
        )
        
        # 4. Create contract file record
        contract_file = await db.contractfile.create(
            data={
                "contractId": contract.id,
                "fileName": file.filename,
                "storageUrl": file_path,
                "mimeType": file.content_type or "application/pdf",
                "uploadedAt": datetime.utcnow(),
            }
        )
        
        return {
            "message": "Contract uploaded successfully",
            "contract_id": contract.id,
            "file_id": contract_file.id,
            "filename": file.filename,
            "text_length": len(extracted_text)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # Clean up file if something goes wrong
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        
        raise HTTPException(
            status_code=500,
            detail=f"Error processing contract: {str(e)}"
        )


# ============================================
# ENDPOINT 2: EXTRACT SLA
# ============================================

@router.post("/extract-sla/{contract_id}")
async def extract_sla(contract_id: str, db: Prisma = Depends(get_db)):
    """
    Extract SLA details from uploaded contract using LLM
    Saves to ContractSLA table with proper type conversion
    
    ✅ FIX: Properly parses mileage_overage_fee and all other fields
    """
    
    # Get contract
    contract = await db.contract.find_unique(where={"id": contract_id})
    
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if not contract.notes:
        raise HTTPException(
            status_code=400,
            detail="No extracted text available. Upload contract first."
        )
    
    try:
        # Extract SLA using LLM
        sla_data = LLMService.extract_sla_details(contract.notes)
        sla_dict = sla_data.model_dump()
        
        # Extract VIN
        vin = VINExtractor.extract_vin(contract.notes)
        
        # Lookup vehicle data if VIN found
        vehicle_data = None
        vehicle_id = None
        
        if vin:
            vehicle_data = VINService.lookup_vin(vin)
            if vehicle_data and "raw_data" in vehicle_data:
                del vehicle_data["raw_data"]
            
            # Create or get vehicle
            if vehicle_data:
                existing_vehicle = await db.vehicle.find_first(where={"vin": vin})
                
                if existing_vehicle:
                    vehicle_id = existing_vehicle.id
                else:
                    vehicle = await db.vehicle.create(
                        data={
                            "vin": vin,
                            "year": vehicle_data.get("year"),
                            "make": vehicle_data.get("make"),
                            "model": vehicle_data.get("model"),
                            "trim": vehicle_data.get("trim"),
                            "bodyClass": vehicle_data.get("body_class"),
                            "engine": vehicle_data.get("engine"),
                            "drivetrain": vehicle_data.get("drivetrain"),
                            "fuelType": vehicle_data.get("fuel_type")
                        }
                    )
                    vehicle_id = vehicle.id
        
        # ============================================
        # BUILD CONTRACTSLA DATA WITH IMPROVED PARSING
        # ============================================
        
        sla_create_data = {
            "contractId": contract_id,
            
            # APR
            "aprPercent": parse_percentage(sla_dict.get("interest_rate")),
            
            # Term
            "termMonths": parse_integer(sla_dict.get("lease_term_months")),
            
            # Payments (using improved parse_decimal)
            "monthlyPayment": parse_decimal(sla_dict.get("monthly_payment")),
            "downPayment": parse_decimal(sla_dict.get("down_payment")),
            
            # Values
            "residualValue": parse_decimal(sla_dict.get("residual_value")),
            
            # Mileage
            "mileageAllowanceYr": parse_integer(sla_dict.get("mileage_allowance")),
            
            # ✅ FIX: This was NULL - now properly parsed
            "mileageOverageFee": parse_decimal(sla_dict.get("overage_charge")),
            
            # Fees
            "earlyTerminationFee": parse_decimal(sla_dict.get("early_termination_fee")),
            
            # Purchase option
            "purchaseOptionPrice": parse_decimal(sla_dict.get("purchase_option")),
            
            # Text fields
            "maintenanceResp": sla_dict.get("maintenance_responsibility"),
            "warrantySummary": sla_dict.get("warranty_coverage"),
            "lateFeePolicy": sla_dict.get("late_fee"),
            
            # Store complete extraction as JSON
            "otherTerms": json.dumps({"raw_sla": sla_dict})
        }
        
        # Create or update ContractSLA
        existing_sla = await db.contractsla.find_unique(
            where={"contractId": contract_id}
        )
        
        if existing_sla:
            await db.contractsla.update(
                where={"contractId": contract_id},
                data=sla_create_data
            )
        else:
            await db.contractsla.create(data=sla_create_data)
        
        # Update contract
        update_data = {
            "docStatus": "extracted",
            "contractType": "lease"
        }
        
        if vehicle_id:
            update_data["vehicleId"] = vehicle_id
        
        await db.contract.update(
            where={"id": contract_id},
            data=update_data
        )
        
        # Fetch final contract with SLA
        updated_contract = await db.contract.find_unique(
            where={"id": contract_id},
            include={"sla": True, "vehicle": True}
        )
        
        # Build response
        return {
            "message": "SLA extraction and VIN lookup completed",
            "contract_id": contract_id,
            "sla_data": sla_dict,
            "vin": vin,
            "vehicle_data": vehicle_data,
            "database_saved": {
                "contract_sla_created": True,
                "vehicle_linked": vehicle_id is not None,
                "fields_saved": {
                    "apr_percent": float(updated_contract.sla.aprPercent) if updated_contract.sla and updated_contract.sla.aprPercent else None,
                    "term_months": updated_contract.sla.termMonths if updated_contract.sla else None,
                    "monthly_payment": float(updated_contract.sla.monthlyPayment) if updated_contract.sla and updated_contract.sla.monthlyPayment else None,
                    "mileage_allowance": updated_contract.sla.mileageAllowanceYr if updated_contract.sla else None,
                    "overage_fee": float(updated_contract.sla.mileageOverageFee) if updated_contract.sla and updated_contract.sla.mileageOverageFee else None,  # ✅ This should now work!
                    "purchase_option": float(updated_contract.sla.purchaseOptionPrice) if updated_contract.sla and updated_contract.sla.purchaseOptionPrice else None
                }
            }
        }
        
    except Exception as e:
        import traceback
        print(f"Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


# ============================================
# ENDPOINT 3: VIN LOOKUP
# ============================================

@router.get("/vin-lookup/{vin}")
async def lookup_vin(vin: str):
    """
    Look up vehicle information by VIN
    
    Can be called independently or is automatically called during /extract-sla
    """
    try:
        vehicle_data = VINService.lookup_vin(vin)
        
        if not vehicle_data:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        
        # Remove raw_data to keep response clean
        if "raw_data" in vehicle_data:
            del vehicle_data["raw_data"]
        
        return {
            "vin": vin,
            "vehicle_data": vehicle_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"VIN lookup failed: {str(e)}"
        )