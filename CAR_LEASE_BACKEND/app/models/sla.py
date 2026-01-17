from typing import Optional
from pydantic import BaseModel, Field, field_validator


class SLAData(BaseModel):
    """Pydantic model for SLA (Service Level Agreement) extracted fields from car lease contracts"""
    
    apr: Optional[str] = Field(None, description="Annual percentage rate or interest rate")
    lease_term_months: Optional[str] = Field(None, description="Total length of lease in months")
    monthly_payment: Optional[str] = Field(None, description="Regular periodic payment amount")
    down_payment: Optional[str] = Field(None, description="Upfront amount paid at lease start")
    residual_value: Optional[str] = Field(None, description="Buyout price or estimated vehicle value at lease end")
    mileage_allowance: Optional[str] = Field(None, description="Maximum allowed mileage")
    early_termination_clause: Optional[str] = Field(None, description="Rules, fees, or penalties for ending early")
    purchase_option: Optional[str] = Field(None, description="Whether and how lessee can purchase vehicle")
    late_fees: Optional[str] = Field(None, description="Penalties for late payments")
    
    @field_validator('*', mode='before')
    @classmethod
    def normalize_values(cls, value):
        """Convert to string and replace rupee symbol"""
        if value is None:
            return None
        
        # Convert to string if not already (handles int, float, etc.)
        if not isinstance(value, str):
            value = str(value)
        
        # Replace rupee symbols with "Rs "
        value = value.replace('₹', 'Rs ')
        value = value.replace('\u20b9', 'Rs ')
        
        return value
