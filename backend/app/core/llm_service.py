import google.generativeai as genai
import os
import json
import re
from dotenv import load_dotenv
from app.models.sla_models import SLAData

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

class LLMService:
    """Service for extracting SLA details using Google Gemini"""
    
    @staticmethod
    def extract_sla_details(contract_text: str) -> SLAData:
        """
        Extract key SLA fields from contract text using Gemini
        Returns validated SLAData model
        """
        
        prompt = f"""
You are an expert contract analyzer. Extract the following information from this car lease/loan contract.
Return ONLY valid JSON with these exact fields (use null for missing values, not the string "null"):

{{
  "interest_rate": "APR percentage or null",
  "lease_term_months": 36,
  "monthly_payment": "dollar amount or null",
  "down_payment": "dollar amount or null",
  "residual_value": "dollar amount or null",
  "mileage_allowance": "miles per year or null",
  "overage_charge": "cost per mile or null",
  "early_termination_fee": "fee amount or null",
  "purchase_option": "buyout price or null",
  "maintenance_responsibility": "who is responsible or null",
  "warranty_coverage": "description or null",
  "late_fee": "fee amount or null"
}}

IMPORTANT:
- For lease_term_months, return an integer number (e.g., 36) or null
- For missing fields, use null (not the string "null")
- Return ONLY the JSON object, no explanations

Contract Text:
{contract_text[:4000]}
"""
        
        try:
            model = genai.GenerativeModel('gemini-2.0-flash-exp')
            response = model.generate_content(prompt)
            
            # Parse JSON from response
            response_text = response.text.strip()
            
            # Remove markdown code blocks if present
            response_text = re.sub(r'^```json\s*', '', response_text)
            response_text = re.sub(r'^```\s*', '', response_text)
            response_text = re.sub(r'\s*```$', '', response_text)
            response_text = response_text.strip()
            
            print(f"LLM Response: {response_text}")  # Debug logging
            
            # Parse JSON
            sla_dict = json.loads(response_text)
            
            # Convert any "null" strings to actual None
            for key, value in sla_dict.items():
                if isinstance(value, str) and value.lower() == "null":
                    sla_dict[key] = None
            
            # Validate with Pydantic model
            sla_data = SLAData(**sla_dict)
            
            print(f"Validated SLA Data: {sla_data.model_dump()}")  # Debug logging
            
            return sla_data
            
        except json.JSONDecodeError as e:
            raise Exception(f"Failed to parse LLM response as JSON: {str(e)}. Response was: {response_text[:200]}")
        except Exception as e:
            raise Exception(f"SLA extraction failed: {str(e)}")