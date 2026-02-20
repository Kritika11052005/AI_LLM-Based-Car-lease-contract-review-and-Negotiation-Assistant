"""
LangChain + RAG Enhanced LLM Service for SLA Extraction
========================================================
Automatically converts USD prices to INR before storing in database.
NOW INCLUDES: dealer_price extraction

Rate limiting:
  - Gemini LLM calls  → LIMITERS["gemini"]      (token-bucket, 1 req/s sustained)
  - Exchange Rate API → LIMITERS["exchangerate"] (token-bucket, 1 req/5 s)
  Both limiters gracefully return fallbacks on exhaustion — no crash.

Install:
    pip install langchain-core langchain-text-splitters langchain-google-genai \
                langchain-community faiss-cpu google-generativeai python-dotenv httpx
"""

import os
import re
import json
import httpx
from typing import Optional
from dotenv import load_dotenv

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS

from app.models.sla_models import SLAData
from app.core.rate_limiter import LIMITERS, RateLimitError

load_dotenv()


# ============================================================
# USD to INR CONVERSION
# ============================================================

_CACHED_EXCHANGE_RATE: Optional[float] = None


async def fetch_usd_to_inr_rate() -> float:
    """
    Fetch live USD to INR exchange rate from exchangerate-api.com.
    Cached in memory. Fallback to 83.5 if API fails or rate-limited.
    """
    global _CACHED_EXCHANGE_RATE

    if _CACHED_EXCHANGE_RATE is not None:
        return _CACHED_EXCHANGE_RATE

    # ── rate limit ─────────────────────────────────────────────────────────────
    try:
        await LIMITERS["exchangerate"].acquire()
    except RateLimitError as exc:
        print(f"⚠️  ExchangeRate API rate-limited (retry after {exc.retry_after:.1f}s) — using fallback 83.5")
        return 83.5

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get('https://api.exchangerate-api.com/v4/latest/USD')
            resp.raise_for_status()
            data = resp.json()
            rate = float(data.get('rates', {}).get('INR', 83.5))
            _CACHED_EXCHANGE_RATE = rate
            print(f"💱 Live exchange rate: 1 USD = ₹{rate}")
            return rate
    except Exception as e:
        print(f"⚠️  Exchange rate API failed, using fallback 83.5: {e}")
        return 83.5


def detect_currency_and_parse(value_str: str) -> tuple[Optional[float], str]:
    """
    Detect currency symbol and parse amount.
    Returns: (amount, currency) where currency is 'USD', 'INR', or 'UNKNOWN'

    Examples:
        "$20,800" → (20800.0, 'USD')
        "₹9,360"  → (9360.0,  'INR')
        "572"     → (572.0,   'UNKNOWN')
        "Rs 5000" → (5000.0,  'INR')
    """
    if not value_str or not isinstance(value_str, str):
        return None, 'UNKNOWN'

    currency = 'UNKNOWN'
    if '$' in value_str:
        currency = 'USD'
    elif '₹' in value_str or 'Rs' in value_str or 'INR' in value_str.upper():
        currency = 'INR'

    cleaned = re.sub(r'[₹$,Rs\sINRUSD]', '', value_str, flags=re.IGNORECASE).strip()

    try:
        amount = float(cleaned)
        return amount, currency
    except ValueError:
        return None, currency


async def convert_to_inr(value_str: str, exchange_rate: float) -> Optional[str]:
    """
    Convert price string to INR.
    - If already in INR (₹), return as-is
    - If in USD ($), convert to INR
    - If no currency symbol, assume INR (Indian market default)

    Returns: String in format "₹X,XXX" or None
    """
    if not value_str or not isinstance(value_str, str):
        return None

    amount, currency = detect_currency_and_parse(value_str)

    if amount is None:
        return None

    if currency == 'USD':
        amount_inr = round(amount * exchange_rate, 2)
        print(f"   💵 ${amount:,.2f} → ₹{amount_inr:,.2f}")
        return f"₹{amount_inr:,.0f}"

    return f"₹{amount:,.0f}"


# ============================================================
# FIELD QUERIES
# ============================================================

FIELD_QUERIES = {
    "msrp": [
        "MSRP manufacturer suggested retail price dealer asking price sticker",
        "vehicle sale price market value gross cap cost",
    ],
    "dealer_price": [
        "dealer price dealer asking price selling price sale price vehicle price",
        "negotiated price agreed price final price out the door price total vehicle price",
        "purchase price contract price amount financed vehicle cost dealer cost",
    ],
    "cap_cost": [
        "capitalized cost adjusted cap cost net cap cost gross cap cost",
        "agreed upon vehicle price used for lease calculation",
    ],
    "cap_cost_reduction": [
        "capitalized cost reduction cap reduction rebate trade-in cash down",
        "amount reducing cap cost upfront payment trade allowance",
    ],
    "residual_value": [
        "residual value guaranteed future value lease end value",
        "vehicle value at end of lease term depreciation",
    ],
    "residual_percent_msrp": [
        "residual percentage percent of MSRP residual rate",
        "residual value as percentage of sticker price",
    ],
    "interest_rate": [
        "APR annual percentage rate interest rate finance charge",
        "lease interest rate money factor rent charge",
    ],
    "money_factor": [
        "money factor lease factor MF rent charge 0.00",
        "decimal money factor monthly finance charge calculation",
    ],
    "lease_term_months": [
        "lease term months duration number of payments period",
        "contract length 24 36 48 60 months",
    ],
    "monthly_payment": [
        "monthly payment total monthly obligation amount due each month",
        "base monthly payment lease installment",
    ],
    "down_payment": [
        "down payment cash due at signing drive-off initial payment",
        "upfront payment amount capitalized cost reduction cash",
    ],
    "fees_total": [
        "total fees acquisition fee documentation fee dealer fees combined",
        "total upfront fees at signing all fees sum",
    ],
    "mileage_allowance": [
        "mileage allowance annual mileage limit miles per year",
        "included miles yearly mileage 10000 12000 15000",
    ],
    "overage_charge": [
        "excess mileage charge per mile overage fee cost per mile",
        "charge for miles over allowance mileage penalty rate",
    ],
    "early_termination_fee": [
        "early termination fee penalty early exit lease break",
        "termination charge early payoff remaining payments",
    ],
    "disposition_fee": [
        "disposition fee turn-in fee lease end return fee",
        "vehicle return fee end of lease disposition charge",
    ],
    "purchase_option": [
        "purchase option price buyout price end of lease purchase",
        "option to buy vehicle residual buyout amount",
    ],
    "insurance_requirements": [
        "insurance requirements minimum coverage liability comprehensive collision",
        "required insurance deductible lessee must maintain",
    ],
    "maintenance_responsibility": [
        "maintenance responsibility who is responsible for service",
        "oil change tire rotation scheduled maintenance lessee lessor",
    ],
    "warranty_coverage": [
        "warranty coverage powertrain bumper to bumper manufacturer warranty",
        "warranty included roadside assistance deductible repair coverage",
    ],
    "late_fee": [
        "late fee late payment penalty grace period overdue",
        "late charge amount days grace period after due date",
    ],
}

FIELD_DESCRIPTIONS = {
    "msrp":                    "MSRP, dealer asking price, or sticker price (with currency symbol $ or ₹)",
    "dealer_price":            "Dealer asking price, selling price, or negotiated vehicle price — the actual price you're paying for the vehicle (with currency symbol $ or ₹)",
    "cap_cost":                "Gross or adjusted capitalized cost — agreed vehicle price (with currency symbol $ or ₹)",
    "cap_cost_reduction":      "Capitalized cost reduction — cash down, trade-in, rebates (with currency symbol $ or ₹)",
    "residual_value":          "Residual value or guaranteed future value at lease end (with currency symbol $ or ₹)",
    "residual_percent_msrp":   "Residual value as a percentage of MSRP (e.g. '45%')",
    "interest_rate":           "APR or annual percentage rate as a percentage (e.g. '10.99%')",
    "money_factor":            "Money factor or lease factor — small decimal like 0.00125 used for rent charge",
    "lease_term_months":       "Lease or loan term as integer months (e.g. 24, 36, 48, 60)",
    "monthly_payment":         "Total monthly payment due each month (with currency symbol $ or ₹)",
    "down_payment":            "Down payment or cash due at signing (with currency symbol $ or ₹)",
    "fees_total":              "Total of all fees combined at signing (with currency symbol $ or ₹)",
    "mileage_allowance":       "Annual mileage allowance in miles per year (integer or string)",
    "overage_charge":          "Per-mile charge for exceeding mileage allowance (e.g. '$0.25 per mile' or '₹3 per km')",
    "early_termination_fee":   "Fee or penalty for ending the lease early (with currency symbol $ or ₹)",
    "disposition_fee":         "Disposition or turn-in fee at lease end when returning vehicle (with currency symbol $ or ₹)",
    "purchase_option":         "Price to purchase vehicle at lease end — buyout price (with currency symbol $ or ₹)",
    "insurance_requirements":  "Minimum insurance coverage requirements (description)",
    "maintenance_responsibility": "Who is responsible for maintenance — lessee, lessor, or manufacturer (description)",
    "warranty_coverage":       "Warranty coverage summary including type and duration (description)",
    "late_fee":                "Late payment fee amount and any grace period (with currency symbol $ or ₹)",
}

FIELD_EXTRACTION_PROMPT = PromptTemplate(
    input_variables=["field_name", "field_description", "context"],
    template="""You are an expert car lease contract analyst.
Extract ONLY the value for the specific field below from the contract text provided.
CRITICAL: Include the currency symbol ($ or ₹) in your output for all monetary fields.
Return ONLY a valid JSON object with a single key "value". Use null if not found.

Field: {field_name}
Description: {field_description}

Contract sections:
---
{context}
---

Valid output examples:
- {{"value": "$20,800"}}      ← Include $ symbol
- {{"value": "₹9,360"}}       ← Include ₹ symbol
- {{"value": "36"}}
- {{"value": "0.00125"}}
- {{"value": "45%"}}
- {{"value": "Lessee responsible for all scheduled maintenance"}}
- {{"value": null}}

Return ONLY the JSON. No explanation, no markdown."""
)

# Fields that contain monetary values and need USD→INR conversion
MONETARY_FIELDS = {
    "msrp", "dealer_price", "cap_cost", "cap_cost_reduction", "residual_value",
    "monthly_payment", "down_payment", "fees_total",
    "early_termination_fee", "disposition_fee", "purchase_option"
}


class RAGSLAExtractor:
    """
    RAG-based extractor: builds a FAISS index from the contract text,
    then runs per-field targeted retrieval + Gemini extraction.
    Automatically converts USD prices to INR.

    Each LLM call is gated by LIMITERS["gemini"] (token-bucket).
    If the Gemini limiter is exhausted the field is skipped (returns None)
    and extraction continues for remaining fields.
    """

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not set in environment")

        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=api_key,
            temperature=0.0,
        )
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001",
            google_api_key=api_key,
        )
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=600,
            chunk_overlap=120,
            separators=["\n\n", "\n", "|", "  ", " ", ""],
        )
        self.chain = FIELD_EXTRACTION_PROMPT | self.llm | StrOutputParser()

    def _build_index(self, text: str) -> FAISS:
        chunks = self.text_splitter.split_text(text)
        docs = [Document(page_content=c, metadata={"i": i}) for i, c in enumerate(chunks)]
        print(f"📄 Indexed {len(docs)} chunks")
        return FAISS.from_documents(docs, self.embeddings)

    def _retrieve(self, index: FAISS, queries: list, k: int = 3) -> str:
        seen, results = set(), []
        for q in queries:
            for doc in index.similarity_search(q, k=k):
                idx = doc.metadata.get("i")
                if idx not in seen:
                    seen.add(idx)
                    results.append(doc.page_content)
        return "\n---\n".join(results)

    async def _extract_one(self, field: str, context: str) -> Optional[str]:
        """
        Invoke the Gemini chain for a single field.
        Gated by the 'gemini' rate limiter — returns None if rate-limited.
        """
        # ── rate limit ─────────────────────────────────────────────────────────
        try:
            await LIMITERS["gemini"].acquire()
        except RateLimitError as exc:
            print(f"⚠️  [{field}] Gemini rate-limited (retry after {exc.retry_after:.1f}s) — skipping field")
            return None

        desc = FIELD_DESCRIPTIONS.get(field, field)
        try:
            raw = self.chain.invoke({
                "field_name":        field,
                "field_description": desc,
                "context":           context,
            }).strip()
            raw = re.sub(r"^```json\s*", "", raw)
            raw = re.sub(r"^```\s*",     "", raw)
            raw = re.sub(r"\s*```$",     "", raw)
            val = json.loads(raw).get("value")
            if isinstance(val, str) and val.lower() in ("null", "none", "n/a", ""):
                return None
            return val
        except Exception as e:
            print(f"⚠️  [{field}] extraction failed: {e}")
            return None

    async def extract(self, contract_text: str) -> SLAData:
        print("🔍 Building vector index...")
        index = self._build_index(contract_text)

        # Fetch exchange rate once at the beginning
        exchange_rate = await fetch_usd_to_inr_rate()

        results = {}
        for field, queries in FIELD_QUERIES.items():
            context = self._retrieve(index, queries)
            value   = await self._extract_one(field, context)

            # Convert monetary fields from USD to INR if needed
            if value and field in MONETARY_FIELDS:
                value = await convert_to_inr(value, exchange_rate)

            results[field] = value
            print(f"   ✅ {field}: {value}")

        sla = SLAData(**results)
        print(f"✅ Extraction complete: {sla.model_dump()}")
        return sla


class LLMService:
    """Drop-in replacement — same interface as original LLMService."""

    _extractor: Optional[RAGSLAExtractor] = None

    @classmethod
    def _get_extractor(cls) -> RAGSLAExtractor:
        if cls._extractor is None:
            cls._extractor = RAGSLAExtractor()
        return cls._extractor

    @staticmethod
    async def extract_sla_details(contract_text: str) -> SLAData:
        """
        Extract SLA details with automatic USD → INR conversion.
        NOTE: This is async due to exchange rate API call + Gemini rate limiting.
        """
        return await LLMService._get_extractor().extract(contract_text)