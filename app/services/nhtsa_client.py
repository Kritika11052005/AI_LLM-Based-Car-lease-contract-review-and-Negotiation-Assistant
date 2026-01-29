import requests

VPIC_URL = "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended"
RECALL_URL = "https://api.nhtsa.gov/recalls/recallsByVehicle"


def decode_vin(vin: str):
    url = f"{VPIC_URL}/{vin}?format=json"
    r = requests.get(url, timeout=10)

    if r.status_code != 200:
        return {"error": "VIN decode failed"}

    data = r.json()
    if not data.get("Results"):
        return {"error": "No vehicle data"}

    v = data["Results"][0]

    return {
        "vin": vin,
        "make": v.get("Make"),
        "model": v.get("Model"),
        "year": v.get("ModelYear"),
        "body_class": v.get("BodyClass"),
        "fuel_type": v.get("FuelTypePrimary"),
        "plant_country": v.get("PlantCountry"),
    }


def get_recalls(vin: str):
    url = f"{RECALL_URL}?vin={vin}&format=json"
    r = requests.get(url, timeout=10)

    if r.status_code != 200:
        return {"error": "False"}

    data = r.json()
    return data.get("results", [])
