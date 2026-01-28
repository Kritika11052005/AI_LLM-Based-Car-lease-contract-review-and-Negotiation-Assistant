from fastapi import APIRouter, HTTPException
from app.core.vin_service import VINService
from app.models.vin_models import VINData

router = APIRouter()

@router.get("/lookup-vin/{vin}")
async def lookup_vin(vin: str):
    """
    Lookup vehicle information by VIN using NHTSA API
    """
    try:
        # Call VIN service
        vin_data = VINService.lookup_vin(vin)
        
        # Check for errors
        if "error" in vin_data and not vin_data.get("make"):
            raise HTTPException(status_code=400, detail=vin_data["error"])
        
        # Validate with Pydantic (exclude raw_data for response)
        validated_data = {k: v for k, v in vin_data.items() if k != "raw_data"}
        vin_response = VINData(**validated_data)
        
        return {
    "message": "VIN lookup successful",
    "vehicle_data": {k: v for k, v in vin_response.model_dump().items() if v is not None}
}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"VIN lookup failed: {str(e)}")