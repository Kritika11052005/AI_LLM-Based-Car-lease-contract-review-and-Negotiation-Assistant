SLA_PROMPT = """
You are a legal contract analysis AI.

Extract the following SLA fields from the contract.
If a field is missing, return null.

Fields:
- apr
- lease_term_months
- monthly_payment
- down_payment
- residual_value
- mileage_allowance
- early_termination_clause
- purchase_option
- late_fees
- maintenance_responsibilities
- warranty_and_insurance
- penalties

Return strictly valid JSON matching this schema.

Contract:
\"\"\"{text}\"\"\"
"""
