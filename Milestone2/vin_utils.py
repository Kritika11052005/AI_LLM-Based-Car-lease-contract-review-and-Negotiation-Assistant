import re
import requests

def extract_vin(text: str) -> str | None:
    pattern = r"\b[A-Z0-9]{17}\b"

    match = re.search(pattern, text.replace(" ", "").replace("\n", ""), re.IGNORECASE)
    if match:
        vin=match.group(0).upper()
        vin=vin.replace('O','0').replace('I','1').replace('Q','0')
        return vin

    return None


def decode_vin(vin: str):
      if not vin: 
          return None
      url = f"https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{vin}?format=json"
      try:

        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        if "Results" in data and len(data["Results"]) > 0:
            res = data["Results"][0]
            return {
                "make": res.get("Make"),
                "model": res.get("Model"),
                "year": res.get("ModelYear"),
                "type": res.get("VehicleType"),
            }
        else:
            print(f"No results found for VIN: {vin}")
            return None
      except Exception:
        return None

def fetch_recalls(make: str, model: str, year: str):
        """NHTSA API Lookup for Safety Recalls"""
        if not (make and model and year):
            print(f"Missing data for recall lookup: make={make}, model={model}, year={year}")
            return []
        make = make.strip()
        model = model.strip()
        year = str(year).strip()
    
        url = f"https://api.nhtsa.gov/recalls/recallsByVehicle?make={make}&model={model}&modelYear={year}&format=json"
        try:

            print(f"Fetching recalls for: {make} {model} {year}")
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
        
            recalls = []
            if "results" in data:
                for r in data["results"]:
                    recalls.append({
                        "component": r.get("Component", ""),
                        "summary": r.get("Summary", "")[:200] + "..." if r.get("Summary") else "",
                    "recall_number": r.get("NHTSACampaignNumber", ""),
                    "consequence": r.get("Conequence", "")
                })
            print(f"Found {len(recalls)} recalls")
            return recalls
        except Exception as e:
            print(f"Error fetching recalls: {e}")
            return []