import requests
from typing import Optional, Dict

class VINService:
    """Service for looking up vehicle information using NHTSA API"""
    
    NHTSA_API_URL = "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{vin}?format=json"
    
    @staticmethod
    def lookup_vin(vin: str) -> Dict:
        """
        Lookup vehicle information by VIN using NHTSA API
        Returns vehicle details including make, model, year, recalls
        """
        try:
            # Clean VIN (remove spaces, convert to uppercase)
            vin = vin.strip().upper()
            
            # Validate VIN length (should be 17 characters)
            if len(vin) != 17:
                return {
                    "error": f"Invalid VIN length. Expected 17 characters, got {len(vin)}",
                    "vin": vin
                }
            
            # Call NHTSA API
            url = VINService.NHTSA_API_URL.format(vin=vin)
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Parse the response
            if "Results" in data:
                results = data["Results"]
                
                # Extract key information
                vehicle_info = {
                    "vin": vin,
                    "make": VINService._get_value(results, "Make"),
                    "model": VINService._get_value(results, "Model"),
                    "year": VINService._get_value(results, "ModelYear"),
                    "manufacturer": VINService._get_value(results, "Manufacturer"),
                    "vehicle_type": VINService._get_value(results, "VehicleType"),
                    "body_class": VINService._get_value(results, "BodyClass"),
                    "engine": VINService._get_value(results, "EngineModel"),
                    "transmission": VINService._get_value(results, "TransmissionStyle"),
                    "fuel_type": VINService._get_value(results, "FuelTypePrimary"),
                    "error_codes": VINService._get_value(results, "ErrorCode"),
                    "raw_data": results  # Include full data for reference
                }
                
                return vehicle_info
            else:
                return {
                    "error": "No results found in NHTSA response",
                    "vin": vin
                }
                
        except requests.exceptions.Timeout:
            return {
                "error": "Request timeout - NHTSA API did not respond in time",
                "vin": vin
            }
        except requests.exceptions.RequestException as e:
            return {
                "error": f"Failed to lookup VIN: {str(e)}",
                "vin": vin
            }
        except Exception as e:
            return {
                "error": f"Unexpected error during VIN lookup: {str(e)}",
                "vin": vin
            }
    
    @staticmethod
    def _get_value(results: list, variable_name: str) -> Optional[str]:
        """Helper method to extract value from NHTSA results"""
        for item in results:
            if item.get("Variable") == variable_name:
                value = item.get("Value")
                return value if value and value.strip() else None
        return None