from pydantic import BaseModel, Field
from typing import Optional

class VINData(BaseModel):
    """Pydantic model for VIN lookup data"""
    
    vin: str = Field(..., description="Vehicle Identification Number")
    make: Optional[str] = Field(None, description="Vehicle manufacturer")
    model: Optional[str] = Field(None, description="Vehicle model")
    year: Optional[str] = Field(None, description="Model year")
    manufacturer: Optional[str] = Field(None, description="Manufacturer name")
    vehicle_type: Optional[str] = Field(None, description="Type of vehicle")
    body_class: Optional[str] = Field(None, description="Body class/style")
    engine: Optional[str] = Field(None, description="Engine model")
    transmission: Optional[str] = Field(None, description="Transmission type")
    fuel_type: Optional[str] = Field(None, description="Primary fuel type")
    error_codes: Optional[str] = Field(None, description="Any error codes from lookup")
    
    class Config:
        json_schema_extra = {
            "example": {
                "vin": "1HGBH41JXMN109186",
                "make": "HONDA",
                "model": "Accord",
                "year": "2021",
                "vehicle_type": "PASSENGER CAR",
                "fuel_type": "GASOLINE"
            }
        }