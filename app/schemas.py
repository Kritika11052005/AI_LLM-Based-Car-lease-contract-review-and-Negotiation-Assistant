from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional, List, Any, Dict

# 1. Extraction schema for the LLM
class ContractSLA(BaseModel):
    apr_percent: Optional[Any] = Field(None, description="The APR, Interest Rate, Money Factor, or Lease Rate.")
    term_months: Optional[Any] = Field(None, description="The duration of the lease in months.")
    monthly_payment: Optional[Any] = Field(None, description="The base monthly payment amount.")
    down_payment: Optional[Any] = Field(None, description="Total amount due at signing or Capitalized Cost Reduction.")
    residual_value: Optional[Any] = Field(None, description="The estimated value of the vehicle at the end of the lease.")
    purchase_option_price: Optional[Any] = Field(None, description="The price to buy the vehicle at the end of the lease.")
    mileage_allowance_yr: Optional[Any] = Field(None, description="The annual mileage limit.")
    mileage_overage_fee: Optional[Any] = Field(None, description="The cost per mile if the user goes over the mileage limit.")
    early_termination_fee: Optional[Any] = Field(None, description="Penalties or fees for ending the lease early.")
    maintenance_resp: Optional[Any] = Field(None, description="Who is responsible for maintenance (e.g., Lessee).")
    
    # --- THIS FIXES THE LATE FEE BUG ---
    late_fee_policy: Optional[str] = Field(None, description="EXTRACT EXACTLY. Look for 'Late Fee', 'Default Penalty', 'Overdue Amount', or 'Past Due'. Extract the full sentence, e.g., 'INR 2,500 or 2% whichever is higher'.")
    
    warranty_summary: Optional[Any] = Field(None, description="Summary of the warranty coverage.")

# 2. Public response schema
# Dict[str, Any] allows the nested "breakdown" and "sla" objects to pass through
class ProcessContractResponse(BaseModel):
    status: str
    contract_id: UUID
    contract_profile: Dict[str, Any]

    class Config:
        from_attributes = True

# 3. Negotiation Logic
class NegotiationPoint(BaseModel):
    field: str
    value_found: Optional[str] = None
    severity: str  # "critical", "high", "medium", "low", "none"
    issue: str
    negotiation_intent: str
    generated_chat_message: str

# 3. Negotiation Logic (Updated to include the LLM Summary)
class NegotiationStrategy(BaseModel):
    fairness_score: int
    llm_summary: Optional[str] = None # The "Why" behind the score
    risk_analysis: List[NegotiationPoint]