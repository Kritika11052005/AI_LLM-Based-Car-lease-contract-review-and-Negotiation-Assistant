from pydantic import BaseModel, Field, field_validator
from typing import Optional

class SLAData(BaseModel):
    """Pydantic model for SLA contract data"""
    
    interest_rate: Optional[str] = Field(None, description="APR percentage")
    lease_term_months: Optional[int] = Field(None, description="Lease duration in months")
    monthly_payment: Optional[str] = Field(None, description="Monthly payment amount")
    down_payment: Optional[str] = Field(None, description="Down payment amount")
    residual_value: Optional[str] = Field(None, description="Residual value at end of lease")
    mileage_allowance: Optional[str] = Field(None, description="Annual mileage allowance")
    overage_charge: Optional[str] = Field(None, description="Cost per mile over limit")
    early_termination_fee: Optional[str] = Field(None, description="Early termination penalty")
    purchase_option: Optional[str] = Field(None, description="Buyout price")
    maintenance_responsibility: Optional[str] = Field(None, description="Who handles maintenance")
    warranty_coverage: Optional[str] = Field(None, description="Warranty details")
    late_fee: Optional[str] = Field(None, description="Late payment fee")
    
    @field_validator('lease_term_months', mode='before')
    @classmethod
    def validate_lease_term(cls, v):
        """Convert string months to int if needed"""
        if v is None or v == "null":
            return None
        if isinstance(v, str):
            try:
                return int(v)
            except ValueError:
                return None
        return v
    
    class Config:
        # Allow extra fields to be ignored
        extra = "ignore"
        
        json_schema_extra = {
            "example": {
                "interest_rate": "4.5%",
                "lease_term_months": 36,
                "monthly_payment": "$350",
                "down_payment": "$2000",
                "mileage_allowance": "12000 miles/year"
            }
        }