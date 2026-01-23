import json
from datetime import datetime
from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from database import SessionLocal
from app.services.sla_extraction import extract_sla_fields
from app.services.extraction import (
    extract_vin_from_text,
    fetch_vehicle_data_from_nhtsa,
    combine_sla_and_vehicle_data
)
from app.models.sla import SLAData

router = APIRouter()

@router.post("/sla/extract/{document_id}", response_model=dict)
async def extract_sla(document_id: int):
    """
    Extract SLA fields from a contract document using Gemini LLM.
    
    Returns validated SLA data as JSON and stores it in the database.
    """
    db = SessionLocal()

    try:
        record = db.execute(
            text("SELECT raw_text FROM contracts WHERE id = :id"),
            {"id": document_id},
        ).fetchone()

        if not record:
            raise HTTPException(status_code=404, detail="Document not found")

        contract_text = record[0] or ""
        if not contract_text.strip():
            raise HTTPException(status_code=400, detail="Document has no extracted text")

        try:
            sla_data: SLAData = extract_sla_fields(contract_text)
        except ValueError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        # Convert Pydantic model to dict for database storage
        sla_dict = sla_data.model_dump()
        
        db.execute(
            text("UPDATE contracts SET sla_data = :sla WHERE id = :id"),
            {"sla": json.dumps(sla_dict), "id": document_id},
        )
        db.commit()

        return {"documentId": document_id, "slaData": sla_dict}

    finally:
        db.close()


@router.post("/vehicle/extract/{document_id}", response_model=dict)
async def extract_vehicle_data(document_id: int):
    """
    Extract VIN from contract text and fetch vehicle data from NHTSA API.
    
    Returns vehicle details including make, model, year, and any recalls.
    """
    db = SessionLocal()

    try:
        record = db.execute(
            text("SELECT raw_text FROM contracts WHERE id = :id"),
            {"id": document_id},
        ).fetchone()

        if not record:
            raise HTTPException(status_code=404, detail="Document not found")

        contract_text = record[0] or ""
        if not contract_text.strip():
            raise HTTPException(status_code=400, detail="Document has no extracted text")

        # Extract VIN from contract text
        vin = extract_vin_from_text(contract_text)
        
        if not vin:
            return {
                "documentId": document_id,
                "vin": None,
                "vehicleData": {"error": "No valid VIN found in document"},
                "message": "Could not find a valid 17-character VIN in the contract"
            }

        # Fetch vehicle data from NHTSA API
        vehicle_data = fetch_vehicle_data_from_nhtsa(vin)
        
        # Store vehicle data in database
        db.execute(
            text("UPDATE contracts SET vehicle_data = :vehicle WHERE id = :id"),
            {"vehicle": json.dumps(vehicle_data), "id": document_id},
        )
        db.commit()

        return {
            "documentId": document_id,
            "vin": vin,
            "vehicleData": vehicle_data
        }

    finally:
        db.close()


@router.post("/combined/extract/{document_id}", response_model=dict)
async def extract_combined_data(document_id: int):
    """
    Extract both SLA and vehicle data from a contract document.
    
    Combines:
    - SLA fields extracted using Gemini LLM
    - Vehicle details from NHTSA API (via VIN extraction)
    
    Returns combined JSON and stores both in the database.
    """
    db = SessionLocal()

    try:
        record = db.execute(
            text("SELECT raw_text, sla_data, vehicle_data FROM contracts WHERE id = :id"),
            {"id": document_id},
        ).fetchone()

        if not record:
            raise HTTPException(status_code=404, detail="Document not found")

        contract_text = record[0] or ""
        existing_sla = record[1]
        existing_vehicle = record[2]
        
        if not contract_text.strip():
            raise HTTPException(status_code=400, detail="Document has no extracted text")

        # Extract SLA data (use existing if available)
        if existing_sla:
            sla_dict = existing_sla if isinstance(existing_sla, dict) else json.loads(existing_sla)
        else:
            try:
                sla_data: SLAData = extract_sla_fields(contract_text)
                sla_dict = sla_data.model_dump()
            except ValueError as exc:
                sla_dict = {"error": str(exc)}

        # Extract vehicle data (use existing if available)
        if existing_vehicle:
            vehicle_dict = existing_vehicle if isinstance(existing_vehicle, dict) else json.loads(existing_vehicle)
        else:
            vin = extract_vin_from_text(contract_text)
            if vin:
                vehicle_dict = fetch_vehicle_data_from_nhtsa(vin)
            else:
                vehicle_dict = {"error": "No valid VIN found in document", "vin": None}

        # Combine SLA and vehicle data
        combined_data = combine_sla_and_vehicle_data(sla_dict, vehicle_dict)
        combined_data["combined_at"] = datetime.utcnow().isoformat()

        # Store both in database
        db.execute(
            text("""
                UPDATE contracts 
                SET sla_data = :sla, vehicle_data = :vehicle 
                WHERE id = :id
            """),
            {
                "sla": json.dumps(sla_dict),
                "vehicle": json.dumps(vehicle_dict),
                "id": document_id
            },
        )
        db.commit()

        return {
            "documentId": document_id,
            "combinedData": combined_data
        }

    finally:
        db.close()


@router.get("/contract/{document_id}/full", response_model=dict)
async def get_full_contract_data(document_id: int):
    """
    Get all extracted data for a contract (SLA + Vehicle).
    
    Returns stored data without re-extracting.
    """
    db = SessionLocal()

    try:
        record = db.execute(
            text("SELECT filename, sla_data, vehicle_data, created_at FROM contracts WHERE id = :id"),
            {"id": document_id},
        ).fetchone()

        if not record:
            raise HTTPException(status_code=404, detail="Document not found")

        return {
            "documentId": document_id,
            "filename": record[0],
            "slaData": record[1] if record[1] else None,
            "vehicleData": record[2] if record[2] else None,
            "createdAt": str(record[3]) if record[3] else None
        }

    finally:
        db.close()
