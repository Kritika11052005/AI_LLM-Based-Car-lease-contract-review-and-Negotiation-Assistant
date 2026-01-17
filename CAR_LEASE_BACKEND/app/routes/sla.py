import json
from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from database import SessionLocal
from app.services.sla_extraction import extract_sla_fields
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
