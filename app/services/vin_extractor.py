import re

VIN_REGEX = r"\b[A-HJ-NPR-Z0-9]{17}\b"

def extract_vin(text: str):
    match = re.search(VIN_REGEX, text)
    return match.group(0) if match else None
