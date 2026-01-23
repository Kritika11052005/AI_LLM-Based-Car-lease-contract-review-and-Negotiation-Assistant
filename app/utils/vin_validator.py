import re

def extract_vin_with_regex(text: str):
    # Regex for 17-character VIN (excluding I, O, Q)
    vin_pattern = r'\b[A-HJ-NPR-Z0-9]{17}\b'
    match = re.search(vin_pattern, text)
    return match.group(0) if match else None