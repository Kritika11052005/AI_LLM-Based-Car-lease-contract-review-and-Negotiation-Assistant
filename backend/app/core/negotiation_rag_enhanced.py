"""
RAG-Enhanced Negotiation Chatbot
Adds LangChain + ChromaDB on top of existing Gemini chatbot.

Changes:
- Full SLA fields (all schema fields) sent to LLM in enhance_script_generation + enhance_answer
- Market price context passed to LLM for price comparison where available
- Rate limiting: all LLM invocations gated by LIMITERS["gemini"]
"""

import os
import re
from typing import Dict, List, Optional

from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from dotenv import load_dotenv

from app.core.rate_limiter import LIMITERS, RateLimitError

load_dotenv()

# ── import shared helpers from chatbot module ──────────────────────────────────
from app.core.negotiation_chatbot import _format_full_sla, _format_market_context

_RATE_LIMIT_ERROR_MSG = (
    "⚠️ The AI assistant is currently busy. Please wait a moment and try again."
)


async def _acquire_gemini_token(caller: str) -> bool:
    """Acquire a Gemini rate-limit token. Returns False if rate-limited."""
    try:
        await LIMITERS["gemini"].acquire()
        return True
    except RateLimitError as exc:
        print(f"⚠️  [{caller}] Gemini rate-limited — retry after {exc.retry_after:.1f}s")
        return False


class NegotiationRAG:
    """
    RAG system for enhanced negotiation advice.
    - Stores market benchmarks and tactics in vector DB
    - Retrieves relevant context for smarter answers
    - Sends full SLA + market price to LLM in every prompt
    - All LLM calls are gated by LIMITERS["gemini"] (token-bucket)
    """

    def __init__(self):
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001",
            google_api_key=os.getenv("GEMINI_API_KEY"),
        )
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=os.getenv("GEMINI_API_KEY"),
            temperature=0.3,
        )
        self.knowledge_base = None
        self._initialize_knowledge_base()

    def _initialize_knowledge_base(self):
        """Initialize knowledge base with market benchmarks and negotiation tactics."""

        benchmarks = [
            {
                "category": "apr",
                "content": """
APR BENCHMARKS:
- Excellent credit (750+): 3-5%
- Good credit (700-749): 5-7%
- Fair credit (650-699): 7-9%
- Poor credit (<650): 9-12%
- Above 10% = predatory
- Above 12% = walk away

NEGOTIATION: "I've been pre-approved for [X]% at [Credit Union]. Can you match that?"
TARGET: Reduce by 1-2%
""",
            },
            {
                "category": "monthly_payment",
                "content": """
MONTHLY PAYMENT BENCHMARKS:
- Should be <15% of gross monthly income
- 10-12% is ideal
- 15-20% is stretching budget
- >20% is unaffordable

NEGOTIATION: "My budget is $[X]/month. Can we adjust down payment, term, or APR to reach that?"
""",
            },
            {
                "category": "mileage",
                "content": """
MILEAGE BENCHMARKS:
- Standard: 12,000-15,000 miles/year
- Overage fee: $0.15-$0.20/mile (standard)
- Overage fee: >$0.25/mile (excessive)

NEGOTIATION: "I drive [X] miles/year. Can we increase allowance to [Y] miles or reduce overage to $0.15-0.18/mile?"
""",
            },
            {
                "category": "fees",
                "content": """
FEE BENCHMARKS:
- Early termination: $300-$500 (reasonable), >$1000 (excessive)
- Late payment: $25-$35 (standard), >$50 (excessive)
- Disposition: $300-$500 (standard)

NEGOTIATION: "Can we cap early termination at $400? The $[amount] is above industry standard."
""",
            },
        ]

        tactics = [
            {
                "scenario": "dealer_says_best_rate",
                "content": """
SCENARIO: Dealer says "This is our best rate"

TACTIC: Pre-Approval Leverage
RESPONSE: "I've been pre-approved for [X]% at [Credit Union]. Can you match or beat that?"

WHY IT WORKS: Dealers have 0.5-2% markup flexibility
SUCCESS RATE: 80% (usually 0.5-1% reduction)

PREPARATION: Get 2-3 pre-approvals before visiting
""",
            },
            {
                "scenario": "payment_too_high",
                "content": """
SCENARIO: Monthly payment exceeds budget

TACTIC: Component Breakdown
RESPONSE: "My budget is $[X]/month. Can we adjust down payment, term, or APR?"

COMPONENTS:
- Down payment +$1,000 = -$30-40/month
- Term +12 months = -$50-80/month
- APR -1% = -$15-25/month

SUCCESS RATE: 70%
""",
            },
            {
                "scenario": "pressure_to_sign_today",
                "content": """
SCENARIO: Dealer pressures immediate decision

TACTIC: 24-Hour Rule
RESPONSE: "I need 24 hours to review. If it's truly the best deal, it will be available tomorrow."

WHY IT WORKS: Removes pressure, reveals fake urgency
SUCCESS RATE: 95% (deal available next day if legitimate)

RED FLAGS: "This price expires today", "Another buyer interested"
""",
            },
            {
                "scenario": "high_apr_for_credit_score",
                "content": """
SCENARIO: APR seems high for credit score

TACTIC: Credit Score Verification
RESPONSE: "My credit score is [X]. According to market rates, I should qualify for [Y]%. Can you explain the discrepancy?"

CREDIT TO APR:
- 750+: Should get 3-5%
- 700-750: Should get 5-7%
- 650-700: Should get 7-9%

DEALER MARKUP: Often 1-3% (negotiable)
SUCCESS RATE: 75%
""",
            },
            {
                "scenario": "last_minute_fees",
                "content": """
SCENARIO: Unexpected fees at signing

TACTIC: Walk-Away Threat
RESPONSE: "These fees weren't disclosed. I need the out-the-door price we agreed on, or I'll reconsider."

COMMON JUNK FEES:
- Doc fee >$500 (negotiate to $200-300)
- Dealer prep (should be included)
- Market adjustment (pure profit)
- VIN etching (worth $10, charged $300)

SUCCESS RATE: 90% (fees removed/reduced)
""",
            },
            {
                "scenario": "overpriced_vehicle",
                "content": """
SCENARIO: Dealer price is above market average

TACTIC: Market Data Confrontation
RESPONSE: "According to current market data, this vehicle is averaging $[market_avg]. Your price of $[dealer_price] is [X]% above market. Can we align closer to the market rate?"

WHY IT WORKS: Factual data is hard to argue against
SUCCESS RATE: 65% (typically 2-5% reduction)

PREPARATION: Have market data printed or on phone screen
""",
            },
        ]

        all_docs = []
        for item in benchmarks:
            all_docs.append(Document(
                page_content=item["content"],
                metadata={"category": item["category"], "type": "benchmark"},
            ))
        for item in tactics:
            all_docs.append(Document(
                page_content=item["content"],
                metadata={"scenario": item["scenario"], "type": "tactic"},
            ))

        self.knowledge_base = Chroma.from_documents(
            documents=all_docs,
            embedding=self.embeddings,
            collection_name="negotiation_knowledge",
            persist_directory="./chroma_db/negotiation",
        )
        print(f"✓ RAG knowledge base initialized with {len(all_docs)} documents")

    async def enhance_script_generation(
        self,
        sla_data: Dict,
        negotiation_intents: List[Dict],
        analysis: Dict,
        vehicle_data: Optional[Dict] = None,
        market_data: Optional[Dict] = None,
    ) -> str:
        """
        Generate negotiation script with RAG-retrieved tactics + full SLA + market price.
        Gated by the Gemini rate limiter.
        """
        # ── rate limit ─────────────────────────────────────────────────────────
        if not await _acquire_gemini_token("enhance_script_generation"):
            return _RATE_LIMIT_ERROR_MSG

        # Build search queries from intents
        search_queries = []
        for intent in negotiation_intents[:3]:
            field = intent.get('field', '')
            if 'interest_rate' in field or 'apr' in field:
                search_queries.append("negotiate APR interest rate")
            elif 'monthly_payment' in field:
                search_queries.append("reduce monthly payment budget")
            elif 'mileage' in field:
                search_queries.append("negotiate mileage allowance overage")
            elif 'fee' in field:
                search_queries.append("negotiate fees early termination")

        if market_data and market_data.get('predicted_price') and sla_data.get('dealer_price'):
            try:
                if float(sla_data['dealer_price']) > float(market_data['predicted_price']):
                    search_queries.append("overpriced vehicle market data")
            except (TypeError, ValueError):
                pass

        # Retrieve relevant tactics
        retrieved_docs = []
        seen           = set()
        for query in search_queries:
            docs = self.knowledge_base.similarity_search(query, k=1)
            for doc in docs:
                if doc.page_content not in seen:
                    retrieved_docs.append(doc)
                    seen.add(doc.page_content)

        rag_context = "\n\n".join([doc.page_content for doc in retrieved_docs])

        vehicle_info = "Vehicle not specified"
        if vehicle_data:
            vehicle_info = (
                f"{vehicle_data.get('year')} "
                f"{vehicle_data.get('make')} "
                f"{vehicle_data.get('model')}"
            )

        intents_formatted = []
        for idx, intent in enumerate(negotiation_intents, 1):
            intents_formatted.append(f"""
Intent {idx} - {intent['priority']} PRIORITY:
  Field:              {intent['field']}
  Current:            {intent['current_value']}
  Target:             {intent['target_value']}
  Benchmark:          {intent['market_benchmark']}
  Reasoning:          {intent['reasoning']}
  Leverage:           {intent['negotiation_leverage']}""")

        intents_summary  = "\n".join(intents_formatted)
        red_flags        = analysis.get('red_flags', [])
        red_flags_text   = "\n".join([f"• {f}" for f in red_flags]) if red_flags else "• None identified"
        sla_block        = _format_full_sla(sla_data)
        market_block     = _format_market_context(market_data)

        prompt = f"""You are a Car Lease Negotiation Expert with 15+ years experience.

VEHICLE: {vehicle_info}

CONTRACT ANALYSIS:
  Fairness Score: {analysis.get('fairness_score')}/100 ({analysis.get('rating')})

RED FLAGS:
{red_flags_text}

NEGOTIATION PRIORITIES (CRITICAL → HIGH → MEDIUM → LOW):
{intents_summary}

{sla_block}
{market_block}

PROVEN TACTICS (Retrieved from Knowledge Base):
{rag_context}

TASK: Generate a professional negotiation script addressing all intents in priority order.

STRUCTURE:
1. Professional opening
2. Present each issue with market benchmarks and actual numbers
3. Make specific counter-offers using target values
4. Use market price data to challenge overpricing where applicable
5. Use proven tactics above
6. Professional closing with next steps

Keep it ready-to-use (5-7 paragraphs). Use actual numbers from the contract.All prices are in INR.


Generate the script:"""

        try:
            response = self.llm.invoke(prompt)
            return response.content if hasattr(response, 'content') else str(response)
        except Exception as e:
            return f"Error generating script: {str(e)}"

    async def enhance_answer(
        self,
        user_question: str,
        sla_data: Dict,
        negotiation_intents: List[Dict],
        analysis: Dict,
        vehicle_data: Optional[Dict] = None,
        conversation_history: Optional[List[Dict]] = None,
        market_data: Optional[Dict] = None,
    ) -> str:
        """
        Answer follow-up questions with RAG context + full SLA + market price.
        Gated by the Gemini rate limiter.
        """
        # ── rate limit ─────────────────────────────────────────────────────────
        if not await _acquire_gemini_token("enhance_answer"):
            return _RATE_LIMIT_ERROR_MSG

        relevant_docs = self.knowledge_base.similarity_search(user_question, k=3)
        rag_context   = "\n\n".join([doc.page_content for doc in relevant_docs])

        income_match       = re.search(
            r'\$?\s*(\d+(?:,\d+)?)\s*(?:per month|monthly|/month|a month)',
            user_question.lower(),
        )
        affordability_info = ""
        if income_match:
            user_income     = float(income_match.group(1).replace(',', ''))
            monthly_payment = sla_data.get('monthly_payment')
            if monthly_payment and isinstance(monthly_payment, (int, float)):
                payment_pct        = (monthly_payment / user_income) * 100
                affordability_info = (
                    f"\nAFFORDABILITY: Payment is {payment_pct:.1f}% of income "
                    f"({'AFFORDABLE' if payment_pct <= 15 else 'OVER BUDGET'})"
                )

        history_text = ""
        if conversation_history:
            recent       = conversation_history[-3:]
            history_text = "\nRECENT CONVERSATION:\n" + "\n".join([
                f"{m.get('role', 'user').upper()}: {m.get('content', '')}"
                for m in recent
            ])

        intents_text = "\n".join([
            f"- {i['field']}: Current {i['current_value']}, "
            f"Target {i['target_value']} (Market: {i['market_benchmark']})"
            for i in negotiation_intents[:5]
        ])

        vehicle_str = (
            f"{vehicle_data.get('year', '')} "
            f"{vehicle_data.get('make', '')} "
            f"{vehicle_data.get('model', '')}"
        ) if vehicle_data else "Unknown vehicle"

        sla_block    = _format_full_sla(sla_data)
        market_block = _format_market_context(market_data)

        prompt = f"""You are a car lease/loan negotiation expert.

VEHICLE: {vehicle_str}

{sla_block}
{market_block}

CONTRACT ANALYSIS:
  Fairness Score: {analysis.get('fairness_score', 'N/A')}/100 ({analysis.get('rating', 'N/A')}){affordability_info}

KEY NEGOTIATION INTENTS:
{intents_text}

RELEVANT KNOWLEDGE (Retrieved from Database):
{rag_context}
{history_text}

QUESTION: {user_question}

Provide a specific, actionable answer (2-5 sentences).
Reference actual contract numbers, market data, and tactics where relevant.All prices are in INR.
If the question relates to a specific tactic, explain how to apply it with examples.
If no relevant information found, say "Based on the provided contract details and market data, I cannot answer that specific question.".
If the question asks about a tactic, provide the exact wording and context needed to use it effectively.

Answer:"""

        try:
            response = self.llm.invoke(prompt)
            return response.content if hasattr(response, 'content') else str(response)
        except Exception as e:
            return f"Error: {str(e)}"


# ── singleton ──────────────────────────────────────────────────────────────────

_rag_instance = None


def get_negotiation_rag() -> NegotiationRAG:
    """Get or create RAG instance (singleton)."""
    global _rag_instance
    if _rag_instance is None:
        _rag_instance = NegotiationRAG()
    return _rag_instance