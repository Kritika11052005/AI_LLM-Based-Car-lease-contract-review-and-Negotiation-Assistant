from pydantic import BaseModel, Field, field_validator
from typing import Optional
import re
from decimal import Decimal


class SLAData(BaseModel):
    """
    Pydantic model for SLA contract data.
    All fields match ContractSLA Prisma schema columns.
    Monetary fields stored as Decimal for database precision.
    """

    # ── Core financial ───────────────────────────────────────────────────
    interest_rate: Optional[str] = Field(None, description="APR percentage (e.g. '10.99%')")
    money_factor: Optional[str] = Field(None, description="Money factor / lease factor (e.g. '0.00125')")

    # ── Term & payments ──────────────────────────────────────────────────
    lease_term_months: Optional[int] = Field(None, description="Lease duration in months")
    monthly_payment: Optional[str] = Field(None, description="Monthly payment amount in INR")
    down_payment: Optional[str] = Field(None, description="Down payment in INR")
    fees_total: Optional[str] = Field(None, description="Total fees in INR")

    # ── Vehicle value fields ─────────────────────────────────────────────
    msrp: Optional[str] = Field(None, description="MSRP in INR")
    dealer_price: Optional[str] = Field(None, description="Dealer asking/selling price in INR")  # ✅ NEW FIELD
    cap_cost: Optional[str] = Field(None, description="Capitalized cost in INR")
    cap_cost_reduction: Optional[str] = Field(None, description="Cap cost reduction in INR")
    residual_value: Optional[str] = Field(None, description="Residual value in INR")
    residual_percent_msrp: Optional[str] = Field(None, description="Residual as % of MSRP (e.g. '55%')")

    # ── Mileage ──────────────────────────────────────────────────────────
    mileage_allowance: Optional[str] = Field(None, description="Annual mileage allowance")
    overage_charge: Optional[str] = Field(None, description="Per-mile/km charge over limit")

    # ── End-of-lease fees ────────────────────────────────────────────────
    early_termination_fee: Optional[str] = Field(None, description="Early termination penalty in INR")
    disposition_fee: Optional[str] = Field(None, description="Disposition fee in INR")
    purchase_option: Optional[str] = Field(None, description="Buyout price in INR")

    # ── Obligations & coverage ───────────────────────────────────────────
    insurance_requirements: Optional[str] = Field(None, description="Minimum insurance requirements")
    maintenance_responsibility: Optional[str] = Field(None, description="Who handles maintenance")
    warranty_coverage: Optional[str] = Field(None, description="Warranty details")
    late_fee: Optional[str] = Field(None, description="Late payment fee")

    # ── Validators ───────────────────────────────────────────────────────

    @field_validator('lease_term_months', mode='before')
    @classmethod
    def validate_lease_term(cls, v):
        """Convert string months to int if needed"""
        if v is None or v == "null":
            return None
        if isinstance(v, str):
            match = re.search(r'\d+', v)
            if match:
                return int(match.group())
            return None
        return v

    def to_prisma_dict(self) -> dict:
        """
        Convert SLAData to Prisma-compatible dict with Decimal values.
        Parses INR strings like "₹9,360" to Decimal.
        """
        def parse_inr_to_decimal(value: Optional[str]) -> Optional[Decimal]:
            """Parse '₹9,360' or '9360' to Decimal"""
            if not value:
                return None
            # Remove currency symbols, commas, spaces
            cleaned = re.sub(r'[₹$,\s]', '', str(value)).strip()
            try:
                return Decimal(cleaned)
            except:
                return None

        def parse_percentage(value: Optional[str]) -> Optional[Decimal]:
            """Parse '10.99%' to Decimal 10.99"""
            if not value:
                return None
            cleaned = re.sub(r'[%\s]', '', str(value)).strip()
            try:
                return Decimal(cleaned)
            except:
                return None

        def parse_money_factor(value: Optional[str]) -> Optional[Decimal]:
            """Parse '0.00125' to Decimal"""
            if not value:
                return None
            try:
                return Decimal(str(value).strip())
            except:
                return None

        return {
            # Percentages
            "aprPercent": parse_percentage(self.interest_rate),
            "moneyFactor": parse_money_factor(self.money_factor),
            "residualPercentMsrp": parse_percentage(self.residual_percent_msrp),
            
            # Integer
            "termMonths": self.lease_term_months,
            
            # Monetary (INR Decimals)
            "monthlyPayment": parse_inr_to_decimal(self.monthly_payment),
            "downPayment": parse_inr_to_decimal(self.down_payment),
            "feesTotal": parse_inr_to_decimal(self.fees_total),
            "msrp": parse_inr_to_decimal(self.msrp),
            "dealerPrice": parse_inr_to_decimal(self.dealer_price),  # ✅ NEW FIELD
            "capCost": parse_inr_to_decimal(self.cap_cost),
            "capCostReduction": parse_inr_to_decimal(self.cap_cost_reduction),
            "residualValue": parse_inr_to_decimal(self.residual_value),
            "earlyTerminationFee": parse_inr_to_decimal(self.early_termination_fee),
            "dispositionFee": parse_inr_to_decimal(self.disposition_fee),
            "purchaseOptionPrice": parse_inr_to_decimal(self.purchase_option),
            
            # Mileage (special parsing)
            "mileageAllowanceYr": self._parse_mileage(self.mileage_allowance),
            "mileageOverageFee": self._parse_overage_fee(self.overage_charge),
            
            # Text fields
            "insuranceRequirements": self.insurance_requirements,
            "maintenanceResp": self.maintenance_responsibility,
            "warrantySummary": self.warranty_coverage,
            "lateFeePolicy": self.late_fee,
        }

    def _parse_mileage(self, value: Optional[str]) -> Optional[int]:
        """Parse '12,000 miles/year' or '12000' to int"""
        if not value:
            return None
        match = re.search(r'(\d+(?:,\d+)*)', str(value))
        if match:
            return int(match.group(1).replace(',', ''))
        return None

    def _parse_overage_fee(self, value: Optional[str]) -> Optional[Decimal]:
        """Parse '$0.25 per mile' or '₹3 per km' to Decimal"""
        if not value:
            return None
        # Extract first number (the fee amount)
        match = re.search(r'([\d.]+)', str(value))
        if match:
            try:
                return Decimal(match.group(1))
            except:
                return None
        return None

    class Config:
        extra = "ignore"

        json_schema_extra = {
            "example": {
                "interest_rate": "10.99%",
                "money_factor": "0.00125",
                "lease_term_months": 24,
                "monthly_payment": "₹47,776",  # Converted from $572
                "down_payment": "₹4,88,080",   # Converted from $5,843
                "msrp": "₹17,36,800",          # Converted from $20,800
                "dealer_price": "₹16,50,000",  # ✅ NEW - Dealer asking price
                "cap_cost": "₹16,28,250",      # Converted from $19,500
                "cap_cost_reduction": "₹1,25,250",
                "residual_value": "₹7,81,560",
                "residual_percent_msrp": "45%",
                "mileage_allowance": "12,000 miles/year",
                "overage_charge": "₹20.875 per mile",  # Converted from $0.25
                "early_termination_fee": "₹70,975",
                "disposition_fee": "₹32,983",
                "purchase_option": "₹7,81,560",
                "fees_total": "₹1,00,200",
                "insurance_requirements": "Minimum ₹100k liability coverage required",
                "maintenance_responsibility": "lessee",
                "warranty_coverage": "Powertrain 5yr/60k, bumper-to-bumper 3yr/36k",
                "late_fee": "₹2,923 flat fee after 10-day grace period",
            }
        }