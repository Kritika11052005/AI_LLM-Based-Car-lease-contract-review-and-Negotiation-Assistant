import logging
import json
import re
import ast
from app import models
# Use the centralized config
from app.services.llm_config import llm_extraction, chat_llm

# Setup logging
logger = logging.getLogger(__name__)

# --- HELPER FUNCTIONS ---
def to_float(value, default=0.0):
    """Safely converts currency strings to floats."""
    try:
        if value is None:
            return default
        if isinstance(value, (int, float)):
            return float(value)
        # Remove currency symbols and commas
        clean_str = str(value).replace('$', '').replace('₹', '').replace(',', '').strip()
        return float(clean_str)
    except (ValueError, TypeError):
        return default

def clean_json_output(text):
    """
    Robust JSON extraction that handles Markdown, single quotes, and text wrapping.
    """
    try:
        # 1. Try direct parsing
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 2. Extract content between { }
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        json_str = match.group(0)
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            # 3. Handle Python Dicts (Single Quotes) common in LLM output
            try:
                # ast.literal_eval safely evaluates a string containing a Python literal
                return ast.literal_eval(json_str)
            except (ValueError, SyntaxError):
                pass
            
            # 4. Brute force fix for single quotes (risky but often works for simple JSON)
            try:
                fixed_str = json_str.replace("'", '"')
                return json.loads(fixed_str)
            except json.JSONDecodeError:
                pass
                
    logger.error(f"Failed to parse JSON content: {text[:100]}...")
    return None

# --- 🚀 UPDATED: ROBUST FINANCIAL EXTRACTION (WITH "SUITABLE VALUE" LOGIC) ---
# --- 🚀 UPDATED: ROBUST FINANCIAL EXTRACTION (AGGRESSIVE SUITABLE VALUE LOGIC) ---
# --- 🚀 UPDATED: ROBUST FINANCIAL EXTRACTION (WITH MATH FALLBACK) ---
def extract_financials_robust(raw_text):
    """
    Uses LLM to find Dealer Price. If hidden, forces the LLM to calculate the Implied Price.
    """
    try:
        prompt = f"""
        You are a strict financial contract extraction engine.
        
        Extract the vehicle's total upfront cost ('dealer_price') and the end-of-lease buyout price ('buyout_price').
        
        Rules:
        - Return ONLY valid JSON
        - No markdown formatting (do not use ```json wrappers)
        - Remove currency symbols ($, ₹) and commas
        
        Search Criteria for 'dealer_price' (Aggressive Search & Calculate):
        1. Priority A (Exact Terms): Look for "Gross Capitalized Cost", "Agreed Value", "Selling Price", "Total Purchase Price", or "Vehicle Cost".
        2. Priority B (Suitable Proxy): Search for "Insured Declared Value", "MSRP", "Ex-Showroom Price", or "Asset Value".
        3. Priority C (Mathematical Fallback): If the dealer completely hid the total price from the text, YOU MUST CALCULATE IT. 
           Use the implied cost formula: (Monthly Payment * Lease Term) + Down Payment + Residual Value. 
           Scan the text for these 4 numbers, do the math, and return the calculated result as the 'dealer_price'.
        
        Search Criteria for 'buyout_price':
        Look for the end-of-lease purchase cost. Target keywords: "Purchase Option Price", "Buyout Price", or "Residual Value".
        
        Format:
        {{
          "dealer_price": 3460000,
          "buyout_price": 850000
        }}
        
        Contract text:
        \"\"\"{raw_text[:35000]}\"\"\"
        """
        
        # Use the configured extraction model (Gemini/Llama)
        response = llm_extraction.invoke(prompt)
        content = response.content
        
        # Clean JSON using the robust function
        data = clean_json_output(content)
        
        if data:
            d_price = to_float(data.get("dealer_price"))
            b_price = to_float(data.get("buyout_price"))
            
            logger.info(f"💰 Extracted Financials: Dealer=₹{d_price}, Buyout=₹{b_price}")
            return {
                "dealer_price": d_price,
                "buyout_price": b_price
            }
        else:
            logger.warning("LLM returned unparseable JSON for financials.")
            return {"dealer_price": 0.0, "buyout_price": 0.0}

    except Exception as e:
        logger.error(f"Financial Extraction Failed: {e}")
        return {"dealer_price": 0.0, "buyout_price": 0.0}
    
# --- MAIN ANALYSIS LOGIC ---
def generate_negotiation_plan(sla_raw_data, vehicle_details=None, market_price=0):
    """
    Analyzes contract terms to generate Red Flags (report).
    Returns: (report: list, score: int) - Score is 0 here as main.py handles it.
    """
    report = []

    def get_val(attr):
        return sla_raw_data.get(attr)

    # Detect currency context for rule thresholds
    raw_late_fee = str(get_val('late_fee_policy') or "").upper()
    raw_payment = str(get_val('monthly_payment') or "").upper()
    is_inr = any(curr in (raw_late_fee + raw_payment) for curr in ["INR", "RUPEE", "RS"])

    def add_flag(field, severity, issue, reason, intent):
        if not intent: return
        report.append({
            "field": field, 
            "severity": severity, 
            "issue": issue,
            "reason": reason, 
            "negotiation_intent": intent
        })

    # --- 11 RULE-BASED FLAGS (PRESERVED) ---
    
    # 1. APR Analysis
    apr = to_float(get_val('apr_percent'))
    if apr is None or apr == 0:
        add_flag("apr", "critical", "APR / Money Factor Undisclosed", "The finance rate is not explicitly stated.", "Ask: 'What is the exact Money Factor or APR used to calculate this payment?'")
    elif apr < 5.0:
        add_flag("apr", "none", "Excellent Interest Rate", "This rate is below the current market average.", None)
    elif 5.0 <= apr <= 8.5:
        add_flag("apr", "low", "Standard Market Rate", "Reflects average APR for prime borrowers.", "Ask if there are any loyalty incentives to lower the rate further.")
    else:
        add_flag("apr", "high", "High Interest Rate", "The rate is significantly higher than market average.", "Negotiate the rate down based on credit score.")

    # 2. Lease Term
    term = to_float(get_val('term_months'))
    if term == 0:
        add_flag("lease_term_months", "medium", "Lease term not specified", "Duration is unclear.", "Request strict clarification of the lease term.")
    elif term < 24:
        add_flag("lease_term_months", "medium", "Short Lease Term", "Higher monthly payments.", "Compare against a 36-month term.")
    elif 24 <= term <= 39:
        add_flag("lease_term_months", "none", "Standard Lease Term", "Warranty sweet spot.", None)
    else:
        add_flag("lease_term_months", "high", "Term Exceeds Warranty", "Risk paying repairs on a car you do not own.", "Strongly recommend reducing the term to 36 months.")

    # 3. Monthly Payment
    if not get_val('monthly_payment'):
        add_flag("monthly_payment", "critical", "Monthly Payment Unclear", "Final obligation not stated.", "Confirm final monthly payment including all taxes.")

    # 4. Down Payment (With INR Logic)
    dp = to_float(get_val('down_payment'))
    dp_high_limit = 150000 if is_inr else 2000 
    if dp == 0:
        add_flag("down_payment", "none", "Zero Down Payment", "Ideal structure.", None)
    elif 1 <= dp <= (dp_high_limit - 1):
        add_flag("down_payment", "low", "Standard Down Payment", "Common, but $0 is safer.", "Ask to roll this amount into the monthly payments.")
    elif dp >= dp_high_limit:
        add_flag("down_payment", "high", "High Cap Cost Reduction", "Risky if car is totaled.", "Negotiate $0 down payment.")

    # 5. Residual Value
    rv = to_float(get_val('residual_value'))
    if rv == 0:
        add_flag("residual_value", "critical", "Residual Value Missing", "Cannot calculate deal fairness.", "Request the Residual Value amount.")
    
    # 6. Mileage Allowance
    ma = to_float(get_val('mileage_allowance_yr'))
    if ma == 0:
        add_flag("mileage_allowance", "critical", "Mileage Limit Missing", "Creates liability.", "Define the annual mileage limit.")
    elif ma < 10000:
        add_flag("mileage_allowance", "high", "Restrictive Mileage Limit", "High overage risk.", "Request increase to 12,000 miles.")

    # 7. Overage Charges (With INR Logic)
    oc = to_float(get_val('mileage_overage_fee'))
    oc_high_limit = 10 if is_inr else 0.25
    if oc == 0:
        add_flag("overage_charges", "high", "Overage Fee Hidden", "Surprise bills.", "Clarify specific cost per excess mile.")
    elif oc > oc_high_limit:
        add_flag("overage_charges", "medium", "High Overage Penalty", "Above industry standard.", "Negotiate overage fee down.")

    # 8. Early Termination
    et = str(get_val('early_termination_fee') or "").lower()
    if not et or et == "none":
        add_flag("early_termination_clause", "medium", "Termination Policy Unclear", "Exit conditions unknown.", "Clarify early termination penalties.")

    # 9. Purchase Option
    po = str(get_val('purchase_option_price') or "").lower()
    if not po or po == "none":
        add_flag("purchase_option", "medium", "Buyout Price Unclear", "Price at end unknown.", "Confirm Residual Value acts as Buyout Price.")
    elif any(k in po for k in ['fee', 'option']):
        add_flag("purchase_option", "low", "Purchase Option Fee Included", "Extra fee to buy the car.", "Ask if Purchase Option Fee can be waived.")

    # 10. Maintenance
    maint = str(get_val('maintenance_resp') or "").lower()
    if any(k in maint for k in ['customer', 'lessee']):
        add_flag("maintenance_responsibilities", "low", "Customer Pays Maintenance", "Competitors offer free service.", "Ask for complimentary scheduled maintenance.")

    # 11. Warranty
    warr = str(get_val('warranty_summary') or "").lower()
    if not warr or warr == "none":
        add_flag("warranty_coverage", "critical", "Warranty Coverage Unclear", "High risk.", "Verify factory warranty covers lease term.")

    return report, 0 

# --- CHAT LOGIC ---
# --- CHAT LOGIC ---
def chat_with_negotiator(db, contract_id: str, user_message: str, history: list):
    """
    Handles the conversation by summarizing intent, score, and flags into a coaching narrative.
    """
    sla = db.query(models.ContractSLA).filter(models.ContractSLA.contract_id == contract_id).first()
    contract = db.query(models.Contract).filter(models.Contract.id == contract_id).first()
    
    if not sla:
        return "I can't find the contract details. Please scan a document first."

    all_intents = sla.negotiation_report 
    fairness_score = sla.fairness_score
    market_val = contract.market_value if (contract and contract.market_value) else 0
    dealer_price = sla.dealer_price if sla.dealer_price else 0
    residual_val = sla.residual_value if sla.residual_value else 0
    equity = float(market_val) - float(residual_val)
    strategy = "BUYOUT STRATEGY" if equity > 0 else "RETURN STRATEGY"

    # --- TEAM LEAD'S STRICT NEGOTIATION INTENT LOGIC ---
    
    # 1. Price Intent
    price_ratio = (dealer_price / market_val) if market_val > 0 else 1.0
    if price_ratio <= 1.05:
        price_rule = "NULL INTENT: The price is excellent. Tell the user NOT to negotiate the price."
    elif price_ratio <= 1.15:
        price_rule = "REDUCE SLIGHTLY: Price is a bit high. Give a soft script to ask for a minor discount."
    else:
        price_rule = "NEGOTIATE FULLY: Massive overcharge. Give an aggressive script to call out the markup."

    # 2. APR Intent
    try: apr_num = float(sla.apr_percent)
    except: apr_num = 0.0
    
    if 0 < apr_num <= 6.0:
        apr_rule = "NULL INTENT: APR is great. Tell the user NOT to negotiate the interest rate."
    elif apr_num <= 9.0:
        apr_rule = "REDUCE SLIGHTLY: APR is average. Give a soft script to ask for rate buy-downs."
    else:
        apr_rule = "NEGOTIATE FULLY: APR is terrible. Give a firm script threatening to use outside financing."

    # --- INJECT INTO AI BRAIN ---
    system_context = f"""
    You are LeaseGuard, a professional Auto Lease Negotiation Coach.
    
    CURRENT CONTRACT CONTEXT:
    - Vehicle: {contract.vehicle_year if contract else ''} {contract.vehicle_make if contract else ''} {contract.vehicle_model if contract else ''}
    - Fairness Score: {fairness_score}/100
    - Market Value: ₹{market_val:,.2f}
    - Dealer Price: ₹{dealer_price:,.2f}
    - Buyout Price: ₹{residual_val:,.2f}
    - Equity Position: ₹{equity:,.2f} ({strategy})
    
    STRICT BEHAVIOR RULES (DO NOT DEVIATE):
    - Price Rule: {price_rule}
    - APR Rule: {apr_rule}
    
    YOUR GOAL:
    1. Answer the user's specific question using EXACT SCRIPTS they can read out loud.
    2. You MUST obey the Price Rule and APR Rule. If a rule says NULL INTENT, you must refuse to give a negotiation script for that term and tell the user it is already a good deal.
    3. Be concise and direct. Do not invent numbers.
    """
    
    full_prompt = f"SYSTEM: {system_context}\n"
    for msg in history:
        role = "ASSISTANT" if msg.get('role') in ["assistant", "ai"] else "USER"
        content = str(msg.get('content', '')).replace('{', '{{').replace('}', '}}')
        full_prompt += f"{role}: {content}\n"
    
    full_prompt += f"USER: {user_message}\nASSISTANT:"
    
    try:
        response = chat_llm.invoke(full_prompt)
        return response.content.strip()
    except Exception as e:
        logger.error(f"Chat Error: {e}")
        return "I'm having trouble connecting to my brain right now. Please try again in a moment."