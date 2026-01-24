import os
from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI
from app.schemas import SLASchema

load_dotenv()

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=os.getenv("GEMINI_API_KEY"),
    temperature=0
)

structured_llm = llm.with_structured_output(SLASchema)

SLA_PROMPT = """
You are a contract analysis assistant.

Extract the following SLA details from the contract text:
- APR
- Lease term
- Monthly payment
- Down payment
- Residual value
- Mileage allowance
- Early termination clause
- Purchase option
- Late fees

If any value is missing, return null.

"""

def extract_sla(text: str) -> SLASchema:
    response = structured_llm.invoke(
        SLA_PROMPT + "\n\nContract text:\n" + text[:5000]
    )
    return response
     


