"""
Upload & Extraction Routes
UPDATED: Maps all ContractSLA schema fields from RAG extraction with USD→INR conversion
"""

import os
import shutil
import re
import json
from decimal import Decimal
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from app.generated.prisma import Prisma
from app.core.config import UPLOAD_DIR
from app.core.ocr_service import OCRService
from app.core.llm_service import LLMService
from app.core.vin_extractor import VINExtractor
from app.core.vin_service import VINService
from app.database import db, get_db

router = APIRouter()

os.makedirs(UPLOAD_DIR, exist_ok=True)


# ============================================================
# PARSING HELPERS
# ============================================================

def parse_decimal(value) -> Optional[Decimal]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return Decimal(str(value))
    if isinstance(value, Decimal):
        return value
    value_str = str(value).strip()
    if not value_str or value_str.lower() in ('null', 'none', 'n/a'):
        return None
    cleaned = re.sub(r'(?i)(inr|rs\.?|₹|\$|£|€)\s*', '', value_str)
    cleaned = cleaned.replace(',', '').replace('%', '').strip()
    if not cleaned:
        return None
    match = re.search(r'(\d+\.?\d*)', cleaned)
    if match:
        try:
            return Decimal(match.group(1))
        except Exception:
            return None
    return None


def parse_percentage(value) -> Optional[Decimal]:
    if value is None:
        return None
    match = re.search(r'(\d+\.?\d*)', str(value).strip())
    if match:
        try:
            return Decimal(match.group(1))
        except Exception:
            return None
    return None


def parse_integer(value) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, int):
        return value
    value_str = str(value).strip()
    if not value_str or value_str.lower() in ('null', 'none'):
        return None
    cleaned = value_str.replace(',', '')
    match = re.search(r'(\d+)', cleaned)
    if match:
        try:
            return int(match.group(1))
        except Exception:
            return None
    return None


# ============================================================
# ENDPOINT 1: UPLOAD CONTRACT
# ============================================================

@router.post("/upload-contract")
async def upload_contract(
    file: UploadFile = File(...),
    user_id: str = Form(None)
):
    file_path = None
    try:
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, file.filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        extracted_text = OCRService.extract_text(file_path)
        if not extracted_text:
            raise HTTPException(status_code=400, detail="Could not extract text from file")

        contract_data = {"notes": extracted_text, "docStatus": "uploaded"}
        if user_id:
            contract_data["userId"] = user_id
            print(f"✅ userId: {user_id}")

        contract = await db.contract.create(data=contract_data)
        contract_file = await db.contractfile.create(data={
            "contractId": contract.id,
            "fileName": file.filename,
            "storageUrl": file_path,
            "mimeType": file.content_type or "application/pdf",
            "uploadedAt": datetime.utcnow(),
        })

        return {
            "message": "Contract uploaded successfully",
            "contract_id": contract.id,
            "file_id": contract_file.id,
            "filename": file.filename,
            "text_length": len(extracted_text),
            "user_id": user_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error processing contract: {str(e)}")


# ============================================================
# ENDPOINT 2: EXTRACT SLA (with USD → INR conversion)
# ============================================================

@router.post("/extract-sla/{contract_id}")
async def extract_sla(contract_id: str, db: Prisma = Depends(get_db)):
    """
    Extract all SLA fields using RAG with automatic USD→INR conversion.
    OPTIMIZED: Skips re-extraction if SLA already exists in DB.
    """
    contract = await db.contract.find_unique(where={"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    if not contract.notes:
        raise HTTPException(status_code=400, detail="No extracted text. Upload contract first.")

    try:
        # ✅ NEW: Check if SLA already exists — skip full AI re-extraction
        existing_sla = await db.contractsla.find_unique(where={"contractId": contract_id})
        if existing_sla:
            print(f"✅ SLA already exists for contract {contract_id} — skipping re-extraction")

            # Just return the existing data without re-running the AI pipeline
            def _f(v):
                return float(v) if v is not None else None

            return {
                "message": "SLA already extracted — returned from database",
                "contract_id": contract_id,
                "skipped_extraction": True,
                "database_saved": {
                    "contract_sla_created": True,
                    "vehicle_linked": contract.vehicleId is not None,
                    "all_prices_in_inr": True,
                    "fields_saved": {
                        "apr_percent":        _f(existing_sla.aprPercent),
                        "term_months":        existing_sla.termMonths,
                        "monthly_payment":    _f(existing_sla.monthlyPayment),
                        "down_payment":       _f(existing_sla.downPayment),
                        "mileage_allowance":  existing_sla.mileageAllowanceYr,
                        "early_termination":  _f(existing_sla.earlyTerminationFee),
                    },
                },
            }

        # No existing SLA — run full extraction
        print(f"🔍 No existing SLA for {contract_id} — running full AI extraction")
        sla_data = await LLMService.extract_sla_details(contract.notes)
        sla_dict = sla_data.model_dump()

        # VIN lookup
        vin = VINExtractor.extract_vin(contract.notes)
        vehicle_data = None
        vehicle_id = None

        if vin:
            vehicle_data = VINService.lookup_vin(vin)
            if vehicle_data and "raw_data" in vehicle_data:
                del vehicle_data["raw_data"]
            if vehicle_data:
                existing_vehicle = await db.vehicle.find_first(where={"vin": vin})
                if existing_vehicle:
                    vehicle_id = existing_vehicle.id
                else:
                    year_value = vehicle_data.get("year")
                    try:
                        year_int = int(year_value) if year_value else None
                    except (ValueError, TypeError):
                        year_int = None
                    vehicle = await db.vehicle.create(data={
                        "vin": vin,
                        "year": year_int,
                        "make": vehicle_data.get("make"),
                        "model": vehicle_data.get("model"),
                        "trim": vehicle_data.get("trim"),
                        "bodyClass": vehicle_data.get("body_class"),
                        "engine": vehicle_data.get("engine"),
                        "drivetrain": vehicle_data.get("drivetrain"),
                        "fuelType": vehicle_data.get("fuel_type"),
                    })
                    vehicle_id = vehicle.id

        # Build ContractSLA record
        sla_create_data = {
            "contractId":            contract_id,
            "aprPercent":            parse_percentage(sla_dict.get("interest_rate")),
            "moneyFactor":           parse_decimal(sla_dict.get("money_factor")),
            "termMonths":            parse_integer(sla_dict.get("lease_term_months")),
            "monthlyPayment":        parse_decimal(sla_dict.get("monthly_payment")),
            "downPayment":           parse_decimal(sla_dict.get("down_payment")),
            "feesTotal":             parse_decimal(sla_dict.get("fees_total")),
            "msrp":                  parse_decimal(sla_dict.get("msrp")),
            "capCost":               parse_decimal(sla_dict.get("cap_cost")),
            "capCostReduction":      parse_decimal(sla_dict.get("cap_cost_reduction")),
            "residualValue":         parse_decimal(sla_dict.get("residual_value")),
            "residualPercentMsrp":   parse_percentage(sla_dict.get("residual_percent_msrp")),
            "mileageAllowanceYr":    parse_integer(sla_dict.get("mileage_allowance")),
            "mileageOverageFee":     parse_decimal(sla_dict.get("overage_charge")),
            "earlyTerminationFee":   parse_decimal(sla_dict.get("early_termination_fee")),
            "dispositionFee":        parse_decimal(sla_dict.get("disposition_fee")),
            "purchaseOptionPrice":   parse_decimal(sla_dict.get("purchase_option")),
            "insuranceRequirements": sla_dict.get("insurance_requirements"),
            "maintenanceResp":       sla_dict.get("maintenance_responsibility"),
            "warrantySummary":       sla_dict.get("warranty_coverage"),
            "lateFeePolicy":         sla_dict.get("late_fee"),
            "otherTerms":            json.dumps({"raw_sla": sla_dict}),
        }

        await db.contractsla.create(data=sla_create_data)

        update_data = {"docStatus": "extracted", "contractType": "lease"}
        if vehicle_id:
            update_data["vehicleId"] = vehicle_id
        await db.contract.update(where={"id": contract_id}, data=update_data)

        updated = await db.contract.find_unique(
            where={"id": contract_id},
            include={"sla": True, "vehicle": True},
        )
        sla = updated.sla

        def _f(v):
            return float(v) if v is not None else None

        return {
            "message": "SLA extraction complete with USD→INR conversion",
            "contract_id": contract_id,
            "skipped_extraction": False,
            "sla_data": sla_dict,
            "vin": vin,
            "vehicle_data": vehicle_data,
            "database_saved": {
                "contract_sla_created": True,
                "vehicle_linked": vehicle_id is not None,
                "all_prices_in_inr": True,
                "fields_saved": {
                    "msrp":               _f(sla.msrp) if sla else None,
                    "cap_cost":           _f(sla.capCost) if sla else None,
                    "apr_percent":        _f(sla.aprPercent) if sla else None,
                    "term_months":        sla.termMonths if sla else None,
                    "monthly_payment":    _f(sla.monthlyPayment) if sla else None,
                    "down_payment":       _f(sla.downPayment) if sla else None,
                    "mileage_allowance":  sla.mileageAllowanceYr if sla else None,
                    "early_termination":  _f(sla.earlyTerminationFee) if sla else None,
                },
            },
        }

    except Exception as e:
        import traceback
        print(f"Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")
    """Extract all SLA fields using RAG with automatic USD→INR conversion."""
    contract = await db.contract.find_unique(where={"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    if not contract.notes:
        raise HTTPException(status_code=400, detail="No extracted text. Upload contract first.")

    try:
        # ✅ FIX: Add await here since extract_sla_details is now async
        sla_data = await LLMService.extract_sla_details(contract.notes)
        sla_dict = sla_data.model_dump()

        # VIN lookup
        vin = VINExtractor.extract_vin(contract.notes)
        vehicle_data = None
        vehicle_id = None

        if vin:
            vehicle_data = VINService.lookup_vin(vin)
            if vehicle_data and "raw_data" in vehicle_data:
                del vehicle_data["raw_data"]
            if vehicle_data:
                existing = await db.vehicle.find_first(where={"vin": vin})
                if existing:
                    vehicle_id = existing.id
                else:
                    year_value = vehicle_data.get("year")
                    try:
                        year_int = int(year_value) if year_value else None
                    except (ValueError, TypeError):
                        year_int = None
                    vehicle = await db.vehicle.create(data={
                        "vin": vin,
                        "year": year_int,
                        "make": vehicle_data.get("make"),
                        "model": vehicle_data.get("model"),
                        "trim": vehicle_data.get("trim"),
                        "bodyClass": vehicle_data.get("body_class"),
                        "engine": vehicle_data.get("engine"),
                        "drivetrain": vehicle_data.get("drivetrain"),
                        "fuelType": vehicle_data.get("fuel_type"),
                    })
                    vehicle_id = vehicle.id

        # Build full ContractSLA record matching every schema column
        # All prices are now in INR after conversion in llm_service
        sla_create_data = {
            "contractId":            contract_id,
            # Rates
            "aprPercent":            parse_percentage(sla_dict.get("interest_rate")),
            "moneyFactor":           parse_decimal(sla_dict.get("money_factor")),
            # Term
            "termMonths":            parse_integer(sla_dict.get("lease_term_months")),
            # Payments (now in INR)
            "monthlyPayment":        parse_decimal(sla_dict.get("monthly_payment")),
            "downPayment":           parse_decimal(sla_dict.get("down_payment")),
            "feesTotal":             parse_decimal(sla_dict.get("fees_total")),
            # Vehicle values (now in INR)
            "msrp":                  parse_decimal(sla_dict.get("msrp")),
            "capCost":               parse_decimal(sla_dict.get("cap_cost")),
            "capCostReduction":      parse_decimal(sla_dict.get("cap_cost_reduction")),
            "residualValue":         parse_decimal(sla_dict.get("residual_value")),
            "residualPercentMsrp":   parse_percentage(sla_dict.get("residual_percent_msrp")),
            # Mileage
            "mileageAllowanceYr":    parse_integer(sla_dict.get("mileage_allowance")),
            "mileageOverageFee":     parse_decimal(sla_dict.get("overage_charge")),
            # End-of-lease (now in INR)
            "earlyTerminationFee":   parse_decimal(sla_dict.get("early_termination_fee")),
            "dispositionFee":        parse_decimal(sla_dict.get("disposition_fee")),
            "purchaseOptionPrice":   parse_decimal(sla_dict.get("purchase_option")),
            # Text fields
            "insuranceRequirements": sla_dict.get("insurance_requirements"),
            "maintenanceResp":       sla_dict.get("maintenance_responsibility"),
            "warrantySummary":       sla_dict.get("warranty_coverage"),
            "lateFeePolicy":         sla_dict.get("late_fee"),
            # Raw JSON backup
            "otherTerms":            json.dumps({"raw_sla": sla_dict}),
        }

        existing_sla = await db.contractsla.find_unique(where={"contractId": contract_id})
        if existing_sla:
            await db.contractsla.update(where={"contractId": contract_id}, data=sla_create_data)
        else:
            await db.contractsla.create(data=sla_create_data)

        update_data = {"docStatus": "extracted", "contractType": "lease"}
        if vehicle_id:
            update_data["vehicleId"] = vehicle_id
        await db.contract.update(where={"id": contract_id}, data=update_data)

        updated = await db.contract.find_unique(
            where={"id": contract_id},
            include={"sla": True, "vehicle": True},
        )
        sla = updated.sla

        def _f(v):
            return float(v) if v is not None else None

        return {
            "message": "SLA extraction complete with USD→INR conversion",
            "contract_id": contract_id,
            "sla_data": sla_dict,
            "vin": vin,
            "vehicle_data": vehicle_data,
            "database_saved": {
                "contract_sla_created": True,
                "vehicle_linked": vehicle_id is not None,
                "all_prices_in_inr": True,  # ← New flag
                "fields_saved": {
                    "msrp":               _f(sla.msrp) if sla else None,
                    "cap_cost":           _f(sla.capCost) if sla else None,
                    "cap_cost_reduction": _f(sla.capCostReduction) if sla else None,
                    "residual_value":     _f(sla.residualValue) if sla else None,
                    "residual_pct_msrp":  _f(sla.residualPercentMsrp) if sla else None,
                    "apr_percent":        _f(sla.aprPercent) if sla else None,
                    "money_factor":       _f(sla.moneyFactor) if sla else None,
                    "term_months":        sla.termMonths if sla else None,
                    "monthly_payment":    _f(sla.monthlyPayment) if sla else None,
                    "down_payment":       _f(sla.downPayment) if sla else None,
                    "fees_total":         _f(sla.feesTotal) if sla else None,
                    "mileage_allowance":  sla.mileageAllowanceYr if sla else None,
                    "overage_fee":        _f(sla.mileageOverageFee) if sla else None,
                    "early_termination":  _f(sla.earlyTerminationFee) if sla else None,
                    "disposition_fee":    _f(sla.dispositionFee) if sla else None,
                    "purchase_option":    _f(sla.purchaseOptionPrice) if sla else None,
                    "insurance_req":      sla.insuranceRequirements if sla else None,
                    "maintenance_resp":   sla.maintenanceResp if sla else None,
                    "warranty_summary":   sla.warrantySummary if sla else None,
                    "late_fee_policy":    sla.lateFeePolicy if sla else None,
                },
            },
        }

    except Exception as e:
        import traceback
        print(f"Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


# ============================================================
# ENDPOINT 3: VIN LOOKUP
# ============================================================

@router.get("/vin-lookup/{vin}")
async def lookup_vin(vin: str):
    try:
        vehicle_data = VINService.lookup_vin(vin)
        if not vehicle_data:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        if "raw_data" in vehicle_data:
            del vehicle_data["raw_data"]
        return {"vin": vin, "vehicle_data": vehicle_data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"VIN lookup failed: {str(e)}")