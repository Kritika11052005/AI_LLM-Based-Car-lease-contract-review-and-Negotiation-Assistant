from pydantic import BaseModel
from typing import Optional,List

class SLASchema(BaseModel):
    apr: Optional[str] = None
    lease_term_months: Optional[str] = None
    monthly_payment: Optional[str] = None
    down_payment: Optional[str] = None
    residual_value: Optional[str] = None
    mileage_allowance: Optional[str] = None
    early_termination_clause: Optional[str] = None
    purchase_option: Optional[str] = None
    late_fees: Optional[str] = None


