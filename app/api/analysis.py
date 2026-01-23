# app/api/analysis.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.llm_extractor import extract_sla_data

router = APIRouter()

# The path is simplified to just /{contract_id} because the router 
# is likely already prefixed with "/analyze" in your main.py.
@router.post("/{contract_id}")
async def start_analysis(contract_id: int, db: Session = Depends(get_db)):
    """
    Executes the complete backend workflow[cite: 124]:
    1. Regex VIN Extraction
    2. LLM SLA Analysis
    3. NHTSA API Vehicle Lookup
    """
    result = extract_sla_data(db, contract_id)
    
    # Error handling for the integrated workflow [cite: 124]
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    # This returns the combined contract and vehicle data [cite: 123]
    return result