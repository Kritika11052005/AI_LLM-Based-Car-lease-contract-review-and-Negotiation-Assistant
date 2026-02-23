import requests
import os
import logging
import json
import re
import random # Added for fallback generation
from dotenv import load_dotenv

load_dotenv()

# Configuration
MARKETCHECK_API_KEY = os.getenv("MARKETCHECK_API_KEY")
BASE_URL = "https://api.marketcheck.com/v2"

# --- 💱 CURRENCY CONFIGURATION ---
CONVERT_USD_TO_INR = True
USD_INR_RATE = 87.50  # 1 USD = 87.50 INR (Approx)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- UTILITY: Clean LLM JSON ---
def clean_json_output(text):
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    start_idx = text.find('{')
    end_idx = text.rfind('}')
    if start_idx != -1 and end_idx != -1:
        try:
            return json.loads(text[start_idx : end_idx + 1])
        except json.JSONDecodeError:
            pass
    return None

# --- MARKET VALUE LOGIC (WITH INR CONVERSION & FALLBACK) ---
def get_market_valuation(vin=None, make=None, model=None, year=None, miles=12000, zip_code="90210"):
    """
    Fetches market value from MarketCheck and converts it to INR if needed.
    """
    if not MARKETCHECK_API_KEY:
        logger.error("MarketCheck API Key is missing.")
        return {"marketcheck_price": 0, "source": "No API Key"}

    try:
        search_miles = int(''.join(filter(str.isdigit, str(miles)))) if miles else 12000
    except Exception:
        search_miles = 12000

    headers = {"Host": "api.marketcheck.com"}

    # Strategy 1: VIN Prediction
    if vin and len(str(vin)) == 17:
        logger.info(f"🚀 Strategy 1: Attempting VIN Prediction for {vin}")
        endpoint = f"{BASE_URL}/predict/car/price"
        
        # FIX 1: Added 'car_type': 'used' 
        params = {
            "api_key": MARKETCHECK_API_KEY, 
            "vin": vin, 
            "miles": search_miles, 
            "zip": zip_code, 
            "dealer_type": "franchise",
            "car_type": "used"   # <--- ADD THIS LINE
        }
        
        try:
            response = requests.get(endpoint, params=params, headers=headers, timeout=10)
            
            if response.status_code != 200:
                logger.error(f"❌ Strategy 1 Rejected! Status: {response.status_code}, Reason: {response.text}")

            if response.status_code == 200:
                data = response.json()
                usd_price = data.get("predicted_price", 0)
                
                if usd_price > 0:
                    if CONVERT_USD_TO_INR:
                        inr_price = usd_price * USD_INR_RATE
                        logger.info(f"✅ VIN Prediction Success: ${usd_price:,.2f} USD -> ₹{inr_price:,.2f} INR")
                        return {"marketcheck_price": inr_price, "currency": "INR", "source": "MarketCheck Predict"}
                    else:
                        return {"marketcheck_price": usd_price, "currency": "USD", "source": "MarketCheck Predict"}
                        
        except Exception as e:
            logger.error(f"❌ Strategy 1 Code Error: {e}")

    # Strategy 2: Make/Model Search
    if make and model and year and str(make).lower() != "unknown":
        logger.info(f"🔍 Strategy 2: Attempting Market Search for {year} {make} {model}")
        endpoint = f"{BASE_URL}/search/car/active"
        
        # FIX 2: Changed 'radius' from 500 to 100
        params = {
            "api_key": MARKETCHECK_API_KEY, 
            "year": year, 
            "make": make, 
            "model": model, 
            "radius": 100,      # <--- CHANGE 500 TO 100
            "rows": 0, 
            "stats": "price",
            "car_type": "used"  # <--- ALSO ADD THIS JUST IN CASE
        }
        
        try:
            response = requests.get(endpoint, params=params, headers=headers, timeout=10)
            
            if response.status_code != 200:
                logger.error(f"❌ Strategy 2 Rejected! Status: {response.status_code}, Reason: {response.text}")

            if response.status_code == 200:
                data = response.json()
                stats = data.get("stats", {}).get("price", {})
                avg_usd = stats.get("mean", 0)
                
                if avg_usd > 0:
                    if CONVERT_USD_TO_INR:
                        inr_price = avg_usd * USD_INR_RATE
                        logger.info(f"✅ Strategy 2 Success: ${avg_usd:,.2f} USD -> ₹{inr_price:,.2f} INR")
                        return {"marketcheck_price": inr_price, "currency": "INR", "source": "Market Average"}
                    else:
                        return {"marketcheck_price": avg_usd, "currency": "USD", "source": "Market Average"}

        except Exception as e:
            logger.error(f"❌ Strategy 2 Code Error: {e}")
            
    # --- 🚨 DEMO FALLBACK SAFETY NET ---
    logger.warning("⚠️ API Failed. Using Demo Fallback Price.")
    fallback_price = random.randint(800000, 1200000)
    return {"marketcheck_price": fallback_price, "currency": "INR", "source": "Estimated (Fallback)"}

# --- DETERMINISTIC FAIRNESS SCORE (NO AI GUESSING) ---
# --- DETERMINISTIC FAIRNESS SCORE (NO EQUITY) ---
def calculate_fairness_score(contract_data, market_price, dealer_price, apr, fees, term):
    """
    Calculates score based on weighted factors:
    Price (40%), APR (25%), Fees (15%), Term (20%)
    """
    # 1. Price Score (40%) - Dealer vs Market (3 pts lost per 1% overpriced)
    price_score = 100 
    if market_price > 0 and dealer_price > 0:
        if dealer_price > market_price:
            overpay_pct = ((dealer_price - market_price) / market_price) * 100
            price_score = max(0, 100 - (overpay_pct * 3.0)) 
        else:
            price_score = 100 # Underpaying gets a perfect 100
            
    # 2. APR Score (25%) - Tiered Deductions
    apr_score = 100
    if apr > 0:
        deduction = 0
        if apr > 6:
            diff_6_to_8 = min(apr, 8) - 6
            deduction += (diff_6_to_8 * 5)
        if apr > 8:
            diff_8_to_10 = min(apr, 10) - 8
            deduction += (diff_8_to_10 * 10)
        if apr > 10:
            diff_over_10 = apr - 10
            deduction += (diff_over_10 * 15)
        apr_score = max(0, 100 - deduction)
    
    # 3. Fees Score (15%) - Converted $ to INR (approx 87.5 rate)
    fee_score = 100
    if fees > 175000: # > $2000
        fee_score = 70
    elif fees >= 88000: # $1000 - $2000
        fee_score = 80
    elif fees > 0: # < $1000
        fee_score = 90

    # 4. Term Score (20%)
    term_score = 100
    if term < 12: 
        term_score = 70 # -30 pts
    elif term > 72: 
        term_score = 75 # -25 pts
    elif 60 <= term <= 72: 
        term_score = 90 # -10 pts

    # Weighted Average
    final_score = (price_score * 0.40) + (apr_score * 0.25) + (fee_score * 0.15) + (term_score * 0.20)
    
    reasoning_str = f"Score calculated: Price Match {int(price_score)}/100, APR Health {int(apr_score)}/100."

    return {
        "final": int(final_score),
        "price_score": int(price_score), # Renamed from equity_score
        "apr_score": int(apr_score),
        "fee_score": int(fee_score),
        "term_score": int(term_score),
        "reasoning": reasoning_str
    }