import re
from app.services.llm_config import chat_llm
from app import models

def to_float(val):
    if val is None: return None
    if isinstance(val, (int, float)): return float(val)
    match = re.search(r"(\d{1,3}(?:,\d{3})*(?:\.\d+)?)", str(val))
    if match:
        clean_val = match.group(1).replace(',', '')
        try:
            return float(clean_val)
        except ValueError:
            return None
    return None

def generate_negotiation_plan(sla_raw_data, vehicle_details):
    """
    Combines SLA and Vehicle data into one JSON and runs analysis.
    """
    report = []
    base_score = 100
    weights = {"critical": 25, "high": 15, "medium": 10, "low": 5, "none": 0}

    # COMBINED DATA: VIN and SLA data merged for DB storage
    contract_data_profile = {
        **vehicle_details,
        "sla": sla_raw_data
    }

    def get_val(attr):
        return sla_raw_data.get(attr)

    raw_late_fee = str(get_val('late_fee_policy') or "").upper()
    raw_payment = str(get_val('monthly_payment') or "").upper()
    is_inr = any(curr in (raw_late_fee + raw_payment) for curr in ["INR", "RUPEE", "RS"])

    def add_flag(field, severity, issue, reason, intent):
        nonlocal base_score
        if not intent: return
        report.append({
            "field": field, 
            "severity": severity, 
            "issue": issue,
            "reason": reason, 
            "negotiation_intent": intent
        })
        base_score -= weights.get(severity, 0)

    # --- 11 SLA CONDITIONS ---
    # 1. APR Analysis
    apr = to_float(get_val('apr_percent'))
    if apr is None:
        add_flag("apr", "critical", "APR / Money Factor Undisclosed", "The finance rate is not explicitly stated.", "Ask: 'What is the exact Money Factor or APR used to calculate this payment?'")
    elif apr < 5.0:
        add_flag("apr", "none", "Excellent Interest Rate", "This rate is below the current market average.", None)
    elif 5.0 <= apr <= 8.5:
        add_flag("apr", "low", "Standard Market Rate", "Reflects average APR for prime borrowers.", "Ask if there are any loyalty incentives to lower the rate further.")
    else:
        add_flag("apr", "high", "High Interest Rate", "The rate is significantly higher than market average.", "Negotiate the rate down based on credit score.")

    # 2. Lease Term
    term = to_float(get_val('term_months'))
    if term is None:
        add_flag("lease_term_months", "medium", "Lease term not specified", "Duration is unclear.", "Request strict clarification of the lease term.")
    elif term < 24:
        add_flag("lease_term_months", "medium", "Short Lease Term", "Higher monthly payments.", "Compare against a 36-month term.")
    elif 24 <= term <= 39:
        add_flag("lease_term_months", "none", "Standard Lease Term", "Warranty sweet spot.", None)
    else:
        add_flag("lease_term_months", "high", "Term Exceeds Warranty", "Risk paying repairs on a car you do not own.", "Strongly recommend reducing the term to 36 months.")

    # 3. Monthly Payment
    if get_val('monthly_payment') is None:
        add_flag("monthly_payment", "critical", "Monthly Payment Unclear", "Final obligation not stated.", "Confirm final monthly payment including all taxes.")

    # 4. Down Payment
    dp = to_float(get_val('down_payment'))
    dp_high_limit = 150000 if is_inr else 2000 
    if dp is None:
        add_flag("down_payment", "medium", "Due at Signing Unclear", "Upfront cash not defined.", "Clarify total 'Due at Signing' amount.")
    elif dp == 0:
        add_flag("down_payment", "none", "Zero Down Payment", "Ideal structure.", None)
    elif 1 <= dp <= (dp_high_limit - 1):
        add_flag("down_payment", "low", "Standard Down Payment", "Common, but $0 is safer.", "Ask to roll this amount into the monthly payments.")
    else:
        add_flag("down_payment", "high", "High Cap Cost Reduction", "Risky if car is totaled.", "Negotiate $0 down payment.")

    # 5. Residual Value
    rv = to_float(get_val('residual_value'))
    if rv is None:
        add_flag("residual_value", "critical", "Residual Value Missing", "Cannot calculate deal fairness.", "Request the Residual Value amount.")
    elif rv < 50: 
        add_flag("residual_value", "medium", "Low Residual Value", "Car depreciates heavily.", "Consider a different vehicle model.")
    else:
        add_flag("residual_value", "none", "Strong Residual Value", "Holds value well.", None)

    # 6. Mileage Allowance
    ma = to_float(get_val('mileage_allowance_yr'))
    if ma is None:
        add_flag("mileage_allowance", "critical", "Mileage Limit Missing", "Creates liability.", "Define the annual mileage limit.")
    elif ma < 10000:
        add_flag("mileage_allowance", "high", "Restrictive Mileage Limit", "High overage risk.", "Request increase to 12,000 miles.")
    else:
        add_flag("mileage_allowance", "none", "Standard Mileage Allowance", "Fits average needs.", None)

    # 7. Overage Charges
    oc = to_float(get_val('mileage_overage_fee'))
    oc_high_limit = 10 if is_inr else 0.25
    if oc is None:
        add_flag("overage_charges", "high", "Overage Fee Hidden", "Surprise bills.", "Clarify specific cost per excess mile.")
    elif oc < (oc_high_limit * 0.6):
        add_flag("overage_charges", "none", "Low Overage Fee", "Below industry average.", None)
    elif (oc_high_limit * 0.6) <= oc <= oc_high_limit:
        add_flag("overage_charges", "low", "Standard Overage Fee", "Matches industry standard.", "Ask for a mileage grace buffer.")
    else:
        add_flag("overage_charges", "medium", "High Overage Penalty", "Above industry standard.", "Negotiate overage fee down.")

    # 8. Early Termination
    et = str(get_val('early_termination_fee') or "").lower()
    if not et or et == "none":
        add_flag("early_termination_clause", "medium", "Termination Policy Unclear", "Exit conditions unknown.", "Clarify early termination penalties.")
    elif any(k in et for k in ['remaining payments', 'acceleration', 'full balance']):
        add_flag("early_termination_clause", "high", "Strict Termination (Standard)", "Locked into balance.", "Ask about lease transfer options.")

    # 9. Purchase Option
    po = str(get_val('purchase_option_price') or "").lower()
    if not po or po == "none":
        add_flag("purchase_option", "medium", "Buyout Price Unclear", "Price at end unknown.", "Confirm Residual Value acts as Buyout Price.")
    elif any(k in po for k in ['fee', 'option']):
        add_flag("purchase_option", "low", "Purchase Option Fee Included", "Extra fee to buy the car.", "Ask if Purchase Option Fee can be waived.")

    # 10. Maintenance
    maint = str(get_val('maintenance_resp') or "").lower()
    if not maint or maint == "none":
        add_flag("maintenance_responsibilities", "medium", "Maintenance Terms Unclear", "Responsibility unknown.", "Clarify service responsibility.")
    elif any(k in maint for k in ['customer', 'lessee']):
        add_flag("maintenance_responsibilities", "low", "Customer Pays Maintenance", "Competitors offer free service.", "Ask for complimentary scheduled maintenance.")

    # 11. Warranty & Late Fees
    warr = str(get_val('warranty_summary') or "").lower()
    if not warr or warr == "none":
        add_flag("warranty_coverage", "critical", "Warranty Coverage Unclear", "High risk.", "Verify factory warranty covers lease term.")
    
    lf = to_float(get_val('late_fee_policy'))
    lf_limit = 2000 if is_inr else 50
    if lf is None:
        add_flag("late_fees", "low", "Late Fee Not Listed", "Penalty unknown.", "Confirm late payment policy.")
    elif lf > lf_limit:
        add_flag("late_fees", "medium", "High Late Fee", f"Exceeds standard cap.", "Negotiate standard late fee terms.")

    return contract_data_profile, [f for f in report if f['severity'] != "none"], max(0, base_score)

# --- CHAT LOGIC ---
async def chat_with_negotiator(db, contract_id: str, user_message: str, history: list):
    """
    Handles the conversation by summarizing hidden intents into a persuasive narrative.
    """
    sla = db.query(models.ContractSLA).filter(models.ContractSLA.contract_id == contract_id).first()
    if not sla:
        return "Contract not found."

    all_intents = sla.negotiation_report 

    system_context = f"""
    You are a professional Lease Negotiation Coach. 
    
    YOUR KNOWLEDGE: 
    You have analyzed the contract and found these specific issues: {all_intents}
    
    YOUR GOAL:
    1. Talk DIRECTLY to the user (the car buyer) as a helpful, expert coach.
    2. Provide conversational advice and specific "talking points" they can use.
    3. DO NOT write an email or letter starting with 'Dear Dealer' unless the user explicitly asks for an email draft.
    4. Focus on high-severity items first.
    5. Be concise and encouraging.
    """
    
    full_prompt = f"SYSTEM: {system_context}\n"
    for msg in history:
        role = "ASSISTANT" if msg['role'] in ["assistant", "ai"] else "USER"
        full_prompt += f"{role}: {msg['content']}\n"
    
    full_prompt += f"USER: {user_message}\nASSISTANT:"
    
    try:
        response = chat_llm.invoke(full_prompt)
        return response.content.strip()
    except Exception as e:
        return f"Error: {str(e)}"