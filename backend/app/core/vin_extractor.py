import re
from typing import Optional

class VINExtractor:
    """Utility class for extracting VIN from contract text using regex"""
    
    # VIN regex pattern - matches 17 alphanumeric characters (excluding I, O, Q)
    # VINs are exactly 17 characters and don't contain I, O, or Q to avoid confusion
    VIN_PATTERN = r'\b[A-HJ-NPR-Z0-9]{17}\b'
    
    @staticmethod
    def extract_vin(text: str) -> Optional[str]:
        """
        Extract VIN from contract text using regex
        Returns the first valid VIN found, or None if no VIN is found
        """
        if not text:
            return None
        
        # Search for VIN pattern
        matches = re.findall(VINExtractor.VIN_PATTERN, text, re.IGNORECASE)
        
        if matches:
            # Return the first match (uppercase)
            return matches[0].upper()
        
        return None
    
    @staticmethod
    def extract_all_vins(text: str) -> list:
        """
        Extract all potential VINs from contract text
        Returns list of all VINs found
        """
        if not text:
            return []
        
        matches = re.findall(VINExtractor.VIN_PATTERN, text, re.IGNORECASE)
        return [vin.upper() for vin in matches]