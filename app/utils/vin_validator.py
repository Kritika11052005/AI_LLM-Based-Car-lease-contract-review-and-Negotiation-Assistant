import re
def extract_vin_with_regex(text: str):
    # Search for any 17-character alphanumeric string
    vin_pattern = r'\b[A-Z0-9]{17}\b'
    match = re.search(vin_pattern, text)
    if match:
        vin = match.group(0)
        # Clean common OCR mistakes: O -> 0, I -> 1, Q -> 0
        return vin.replace('O', '0').replace('I', '1').replace('Q', '0')
    return None