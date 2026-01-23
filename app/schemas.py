# app/schemas.py
from pydantic import BaseModel, Field
from typing import Optional

class ContractSLA(BaseModel):
    apr: Optional[float] = Field(description="Annual percentage rate or interest rate")
    lease_term_months: Optional[int] = Field(description="Total duration of the lease in months")
    monthly_payment: Optional[float] = Field(description="Regular monthly payment amount")
    down_payment: Optional[float] = Field(description="Upfront payment amount")
    residual_value: Optional[float] = Field(description="The estimated value of the car at the end of the lease")
    mileage_allowance: Optional[str] = Field(description="Total miles allowed per year or over the term")
    overage_charges: Optional[str] = Field(description="Cost per mile if the allowance is exceeded")
    early_termination_clause: Optional[str] = Field(description="Penalties or conditions for ending the lease early")
    purchase_option: Optional[str] = Field(description="Terms for buying the vehicle at end of lease")
    maintenance_responsibilities: Optional[str] = Field(description="Who is responsible for repairs and service")
    warranty_coverage: Optional[str] = Field(description="Details of included warranty or insurance")
    late_fees: Optional[str] = Field(description="Penalties for late payments")
