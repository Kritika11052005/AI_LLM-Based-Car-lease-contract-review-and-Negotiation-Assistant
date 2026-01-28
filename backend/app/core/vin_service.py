import requests
from typing import Optional, Dict

class VINService:
    """Service for looking up vehicle information using NHTSA API"""
    
    NHTSA_DECODE_URL = "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{vin}?format=json"
    NHTSA_RECALL_URL = "https://api.nhtsa.gov/recalls/recallsByVehicle?make={make}&model={model}&modelYear={year}"
    
    @staticmethod
    def lookup_vin(vin: str) -> Dict:
        """
        Lookup vehicle information by VIN using NHTSA API
        Returns vehicle details including make, model, year, and more complete data
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
            
            # Call NHTSA DecodeVinValues API (more detailed than DecodeVin)
            url = VINService.NHTSA_DECODE_URL.format(vin=vin)
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Parse the response
            if "Results" in data and len(data["Results"]) > 0:
                result = data["Results"][0]
                
                # Extract comprehensive information
                vehicle_info = {
                    "vin": vin,
                    "make": result.get("Make"),
                    "model": result.get("Model"),
                    "year": result.get("ModelYear"),
                    "manufacturer": result.get("Manufacturer"),
                    "vehicle_type": result.get("VehicleType"),
                    "body_class": result.get("BodyClass"),
                    "engine": result.get("EngineModel"),
                    "engine_cylinders": result.get("EngineCylinders"),
                    "displacement_l": result.get("DisplacementL"),
                    "transmission": result.get("TransmissionStyle"),
                    "fuel_type": result.get("FuelTypePrimary"),
                    "drive_type": result.get("DriveType"),
                    "doors": result.get("Doors"),
                    "plant_city": result.get("PlantCity"),
                    "plant_state": result.get("PlantState"),
                    "plant_country": result.get("PlantCountry"),
                    "trim": result.get("Trim"),
                    "series": result.get("Series"),
                    "error_code": result.get("ErrorCode"),
                    "error_text": result.get("ErrorText")
                }
                
                # Clean up null strings and "Not Applicable"
                for key, value in vehicle_info.items():
                    if value in ["", "Not Applicable", "N/A"]:
                        vehicle_info[key] = None
                
                # Try to get recall data if we have make, model, and year
                if vehicle_info.get("make") and vehicle_info.get("model") and vehicle_info.get("year"):
                    recalls = VINService.get_recalls(
                        vehicle_info["make"],
                        vehicle_info["model"],
                        vehicle_info["year"]
                    )
                    vehicle_info["recalls"] = recalls
                
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
    def get_recalls(make: str, model: str, year: str) -> Dict:
        """
        Get recall information for a vehicle
        """
        try:
            url = VINService.NHTSA_RECALL_URL.format(
                make=make,
                model=model,
                year=year
            )
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if "results" in data and len(data["results"]) > 0:
                return {
                    "count": data.get("count", 0),
                    "recalls": data["results"][:5]  # Limit to first 5 recalls
                }
            else:
                return {
                    "count": 0,
                    "message": "No recalls found"
                }
                
        except Exception as e:
            return {
                "error": f"Failed to fetch recalls: {str(e)}"
            }