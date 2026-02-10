import re
import json
import os
from typing import Dict, List, Any, Tuple, Optional

RULE_PATH = os.path.join(
    os.path.dirname(__file__),  # services/ folder
    "..",  # app/ folder  
    "rules",  # rules/ folder
    "negotiation_rules.json"
)

def parse_value(value):
    """YOUR original parse_value function"""
    if value is None:
        return None
    
    if isinstance(value, (int, float)):
        return float(value)
    
    if isinstance(value, str):
        cleaned = value.strip()
        
        match = re.search(r'(\d+\.?\d*)', cleaned)
        if match:
            try:
                return float(match.group(1))
            except:
                pass
        
        patterns = [
            r'(\d+\.?\d*)%',
            r'\$(\d+\.?\d*)',
            r'(\d+)\s*months',
            r'(\d+)\s*years',
            r'(\d+,\d+)',
            r'(\d+)\s*miles',
            r'(\d+)\s*k\s*miles',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, cleaned, re.IGNORECASE)
            if match:
                try:
                    num_str = match.group(1).replace(',', '')
                    return float(num_str)
                except:
                    continue
        return None
    return None

def load_rules():
    """Load YOUR rules from JSON file"""
    if not os.path.exists(RULE_PATH):
        raise FileNotFoundError(f"Rules file not found at: {RULE_PATH}")
    
    with open(RULE_PATH, "r") as f:
        data = json.load(f)
        return data

def evaluate_condition(value: Any, condition: str, msrp: Optional[float] = None) -> bool:
    """Evaluate if value matches the condition"""
    if condition == "missing":
        if value is None:
            return True
        if isinstance(value, str) and value.strip().lower() in ["", "none", "null", "n/a"]:
            return True
        return False
    
    if value is None:
        return False
    if isinstance(value, str) and value.strip().lower() in ["", "none", "null", "n/a"]:
        return False
    
    if "contains" in condition.lower():
        keyword = condition.lower().replace("contains", "").strip().strip("'\"")
        if isinstance(value, str):
            return keyword in value.lower()
        return False
    
    numeric_value = parse_value(value) if not isinstance(value, (int, float)) else float(value)
    if numeric_value is None:
        return False
    
    if "% of msrp" in condition.lower():
        match = re.search(r"(\d+(?:\.\d+)?)%", condition)
        if match and msrp:
            percentage = float(match.group(1)) / 100
            threshold = msrp * percentage
            if ">" in condition:
                return numeric_value > threshold
    
    if " - " in condition:
        match = re.search(r"(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)", condition)
        if match:
            lower = float(match.group(1))
            upper = float(match.group(2))
            return lower <= numeric_value <= upper
    
    match = re.search(r"([<>]=?)\s*(\d+(?:\.\d+)?)", condition)
    if match:
        operator = match.group(1)
        threshold = float(match.group(2))
        
        if operator == ">":
            return numeric_value > threshold
        elif operator == "<":
            return numeric_value < threshold
        elif operator == ">=":
            return numeric_value >= threshold
        elif operator == "<=":
            return numeric_value <= threshold
    
    match = re.search(r"=\s*(\d+(?:\.\d+)?)", condition)
    if match:
        threshold = float(match.group(1))
        return abs(numeric_value - threshold) < 0.01
    
    return False

def evaluate_sla_rules(sla: dict):
    """YOUR original function - UPDATED to include negotiation_intent"""
    rules_config = load_rules()
    sla_rules = rules_config["sla_rules"]
    
    flags = []
    
    # Get MSRP for percentage calculations (not in your schema, but handle if present)
    msrp = parse_value(sla.get('msrp'))
    
    for rule in sla_rules:
        field = rule["field"]
        raw_value = sla.get(field) 
        
        # Parse value based on rule type
        if rule["type"] in ["range", "value_check", "percentage_check"]:
            parsed_value = parse_value(raw_value)
        else:
            parsed_value = raw_value
        
        for scenario in rule["scenarios"]:
            cond = scenario["condition"]
            
            if evaluate_condition(parsed_value, cond, msrp):
                # Build flag WITH negotiation_intent
                flag_data = {
                    "field": rule["field"],
                    "severity": scenario["severity"],
                    "issue": scenario["issue"],
                    "reason": scenario["reason"]
                }
                
                # ADD the negotiation_intent from your JSON
                if "negotiation_intent" in scenario and scenario["negotiation_intent"]:
                    flag_data["negotiation_intent"] = scenario["negotiation_intent"]
                
                flags.append(flag_data)
                break  # Only use first matching scenario

    filtered_flags = [flag for flag in flags if flag['severity'] != "none"]
    
    return filtered_flags         
    
