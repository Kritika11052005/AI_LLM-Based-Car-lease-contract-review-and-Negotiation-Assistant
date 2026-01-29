from pydantic import BaseModel
from typing import Optional

class SLASchema(BaseModel):
    interest_rate_apr: Optional[float]
    lease_term_months: Optional[int]
    monthly_payment: Optional[int]
    down_payment: Optional[int]
    residual_value: Optional[int]
    mileage_allowance: Optional[int]
    overage_charge_per_mile: Optional[float]
    early_termination_fee: Optional[int]
    purchase_option_price: Optional[int]
    maintenance_responsibility: Optional[str]
    warranty_insurance: Optional[str]
    penalties_or_late_fees: Optional[str]
