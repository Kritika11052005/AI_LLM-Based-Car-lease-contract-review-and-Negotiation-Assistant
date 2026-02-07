from pydantic import BaseModel
from uuid import UUID
from typing import Optional, List, Any, Dict

# 1. Extraction schema for the LLM
class ContractSLA(BaseModel):
    apr_percent: Optional[float] = None
    term_months: Optional[int] = None
    monthly_payment: Optional[float] = None
    down_payment: Optional[float] = None
    residual_value: Optional[float] = None
    purchase_option_price: Optional[float] = None
    mileage_allowance_yr: Optional[int] = None
    mileage_overage_fee: Optional[float] = None
    early_termination_fee: Optional[float] = None
    maintenance_resp: Optional[str] = None
    late_fee_policy: Optional[str] = None
    warranty_summary: Optional[str] = None

# 2. Public response schema (Hides negotiation_summary)
class ProcessContractResponse(BaseModel):
    status: str
    contract_id: UUID
    contract_profile: Dict[str, Any]

    class Config:
        from_attributes = True

# 3. Negotiation Logic (Internal use)
class NegotiationPoint(BaseModel):
    field: str
    value_found: Optional[str] = None
    severity: str  # "critical", "high", "medium", "low", "none"
    issue: str
    negotiation_intent: str
    generated_chat_message: str

class NegotiationStrategy(BaseModel):
    fairness_score: int
    risk_analysis: List[NegotiationPoint]