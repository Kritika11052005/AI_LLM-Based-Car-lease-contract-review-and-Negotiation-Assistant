import requests

def get_vehicle_details(vin: str):
    url = f"https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{vin}?format=json"
    try:
        response = requests.get(url, timeout=10)
        data = response.json()
        results = data['Results'][0]
        
        return {
            "make": results.get("Make"),
            "model": results.get("Model"),
            "year": results.get("ModelYear"),
            "body_class": results.get("BodyClass"),
        }
    except Exception as e:
        return {"error": f"NHTSA Lookup Failed: {str(e)}"}