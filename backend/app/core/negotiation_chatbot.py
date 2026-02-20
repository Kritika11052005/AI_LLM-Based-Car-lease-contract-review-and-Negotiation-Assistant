"""
Updated Negotiation Chatbot with RAG Enhancement
Now uses LangChain + ChromaDB for smarter answers

Changes:
- Full SLA fields (all schema fields) sent to LLM in ALL functions
- Market price passed to LLM for price comparison context where available
- Rate limiting: all Gemini calls are gated by LIMITERS["gemini"]
"""

import google.generativeai as genai
import os
from dotenv import load_dotenv
from typing import Dict, List, Optional

from app.core.rate_limiter import LIMITERS, RateLimitError

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# ── rate-limit helper ──────────────────────────────────────────────────────────

_RATE_LIMIT_ERROR_MSG = (
    "⚠️ The AI assistant is currently busy. Please wait a moment and try again."
)


async def _acquire_gemini_token(caller: str) -> bool:
    """
    Acquire a Gemini rate-limit token.
    Returns True if acquired, False if rate-limited.
    """
    try:
        await LIMITERS["gemini"].acquire()
        return True
    except RateLimitError as exc:
        print(f"⚠️  [{caller}] Gemini rate-limited — retry after {exc.retry_after:.1f}s")
        return False


# ── shared helpers ─────────────────────────────────────────────────────────────

def _fmt(value, suffix: str = "") -> str:
    """Format a value for LLM prompt — shows 'Not specified' if None/empty."""
    if value is None or value == "" or value == "Not specified":
        return "Not specified"
    return f"{value}{suffix}"


def _format_full_sla(sla_data: Dict) -> str:
    """
    Format ALL ContractSLA schema fields into a clean block for LLM prompts.
    Every field from the Prisma schema is included so the LLM has complete context.
    """
    return f"""FULL CONTRACT TERMS:
  Interest Rate / APR:        {_fmt(sla_data.get('interest_rate'))}
  Money Factor:               {_fmt(sla_data.get('money_factor'))}
  Monthly Payment:            {_fmt(sla_data.get('monthly_payment'))}
  Down Payment:               {_fmt(sla_data.get('down_payment'))}
  Lease / Loan Term:          {_fmt(sla_data.get('lease_term_months'), suffix=' months')}
  MSRP:                       {_fmt(sla_data.get('msrp'))}
  Cap Cost (Negotiated Price):{_fmt(sla_data.get('dealer_price'))}
  Cap Cost Reduction:         {_fmt(sla_data.get('cap_cost_reduction'))}
  Residual Value:             {_fmt(sla_data.get('residual_value'))}
  Residual % of MSRP:         {_fmt(sla_data.get('residual_percent_msrp'), suffix='%')}
  Total Fees:                 {_fmt(sla_data.get('fees_total'))}
  Mileage Allowance / yr:     {_fmt(sla_data.get('mileage_allowance'))}
  Mileage Overage Fee:        {_fmt(sla_data.get('overage_charge'), suffix='/mile')}
  Early Termination Fee:      {_fmt(sla_data.get('early_termination_fee'))}
  Disposition Fee:            {_fmt(sla_data.get('disposition_fee'))}
  Purchase Option Price:      {_fmt(sla_data.get('purchase_option_price'))}
  Late Fee Policy:            {_fmt(sla_data.get('late_fee'))}
  Insurance Requirements:     {_fmt(sla_data.get('insurance_requirements'))}
  Maintenance Responsibility: {_fmt(sla_data.get('maintenance_resp'))}
  Warranty Summary:           {_fmt(sla_data.get('warranty_summary'))}"""


def _format_market_context(market_data: Optional[Dict]) -> str:
    """
    Format market price data for LLM prompt.
    Returns empty string if no market data available.
    """
    if not market_data:
        return ""

    predicted  = market_data.get('predicted_price')
    price_low  = market_data.get('price_range', {}).get('low')
    price_high = market_data.get('price_range', {}).get('high')
    source     = market_data.get('source', 'unknown')
    sampled    = market_data.get('listings_sampled', 0)

    if not predicted:
        return ""

    source_label = "Real Active Listings" if source == "active_listings" else "ML Estimate"

    block = f"""
MARKET PRICE DATA ({source_label}{f', based on {sampled} listings' if sampled else ''}):
  Market Average Price:  {predicted}
  Market Price Range:    {_fmt(price_low)} – {_fmt(price_high)}"""

    dealer_price = market_data.get('dealer_price')
    if dealer_price and predicted:
        try:
            diff     = float(dealer_price) - float(predicted)
            diff_pct = (diff / float(predicted)) * 100
            status   = "OVERPRICED" if diff > 0 else "UNDERPRICED" if diff < 0 else "FAIR"
            block += f"""
  Dealer Price vs Market: {'+' if diff >= 0 else ''}{diff:,.2f} ({diff_pct:+.1f}%) — {status}"""
        except (TypeError, ValueError):
            pass

    return block


# ── main chatbot class ─────────────────────────────────────────────────────────

class NegotiationChatbot:
    """
    AI-powered negotiation assistant using Google Gemini 2.5 Flash + RAG

    Flow:
    1. Rules analyze SLA → Generate intents
    2. RAG retrieves relevant tactics from vector DB
    3. LLM creates negotiation script with full SLA + market price context
    4. User asks follow-up questions (enhanced with RAG + full context)

    All Gemini calls are gated by the shared rate limiter (LIMITERS["gemini"]).
    Rate-limited calls return a user-friendly message instead of raising.
    """

    @staticmethod
    def check_missing_fields(sla_data: Dict) -> Dict:
        """
        Check which critical fields are missing from contract.
        Returns dict with missing fields and user-friendly message.
        """
        critical_fields = {
            'interest_rate':         'Interest Rate / APR',
            'monthly_payment':       'Monthly Payment',
            'down_payment':          'Down Payment',
            'lease_term_months':     'Lease/Loan Term',
            'mileage_allowance':     'Mileage Allowance (for leases)',
            'overage_charge':        'Overage Charge per Mile',
            'early_termination_fee': 'Early Termination Fee',
            'late_fee':              'Late Payment Fee',
            'purchase_option_price': 'Purchase Option / Buyout Price',
            'residual_value':        'Residual Value',
        }

        missing = [
            display_name
            for field, display_name in critical_fields.items()
            if not sla_data.get(field)
        ]

        if missing:
            return {
                "has_missing_fields": True,
                "missing_fields":     missing,
                "message": (
                    "⚠️ Please provide the following missing contract details:\n\n"
                    + "\n".join([f"• {f}" for f in missing])
                ),
            }
        return {
            "has_missing_fields": False,
            "missing_fields":     [],
            "message":            "✓ All critical contract fields are present",
        }

    @staticmethod
    async def generate_simple_negotiation_message(
        vehicle_data: Optional[Dict],
        sla_data: Dict,
        user_intent: str,
        market_data: Optional[Dict] = None,
    ) -> str:
        """
        Generate a simple negotiation message (Quick Message Mode).
        User provides their own intent.

        Args:
            vehicle_data: Vehicle information
            sla_data:     Full contract SLA data
            user_intent:  User's negotiation goal
            market_data:  Market price context (optional)

        Returns:
            2-3 sentence professional negotiation message, or rate-limit notice.
        """
        # ── rate limit ─────────────────────────────────────────────────────────
        if not await _acquire_gemini_token("generate_simple_negotiation_message"):
            return _RATE_LIMIT_ERROR_MSG

        vehicle_info = "Unknown vehicle"
        if vehicle_data:
            vehicle_info = (
                f"{vehicle_data.get('year', 'Unknown')} "
                f"{vehicle_data.get('make', 'Unknown')} "
                f"{vehicle_data.get('model', 'Unknown')}"
            )

        sla_block    = _format_full_sla(sla_data)
        market_block = _format_market_context(market_data)

        prompt = f"""You are helping a customer negotiate a car lease/loan.

VEHICLE: {vehicle_info}

{sla_block}
{market_block}

NEGOTIATION GOAL: {user_intent}

Write a polite, professional negotiation message in 2–3 sentences the customer can use with the dealer(all prices are in INR).
Reference actual numbers from the contract. If market data is provided, use it to strengthen the argument."""

        try:
            model    = genai.GenerativeModel('gemini-2.5-flash')
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            return f"Error generating negotiation message: {str(e)}"

    @staticmethod
    async def generate_comprehensive_negotiation_script(
        sla_data: Dict,
        negotiation_intents: List[Dict],
        analysis: Dict,
        vehicle_data: Optional[Dict] = None,
        market_data: Optional[Dict] = None,
        use_rag: bool = True,
    ) -> str:
        """
        Generate comprehensive negotiation script with full SLA + market context.

        Args:
            sla_data:             Full contract SLA data
            negotiation_intents:  List of intents from NegotiationRules
            analysis:             Full analysis with fairness score and red flags
            vehicle_data:         Vehicle information
            market_data:          Market price context (optional)
            use_rag:              Whether to use RAG enhancement (default: True)

        Returns:
            Professional, detailed negotiation script, or rate-limit notice.
        """
        if use_rag:
            try:
                from app.core.negotiation_rag_enhanced import get_negotiation_rag
                rag = get_negotiation_rag()
                return await rag.enhance_script_generation(
                    sla_data=sla_data,
                    negotiation_intents=negotiation_intents,
                    analysis=analysis,
                    vehicle_data=vehicle_data,
                    market_data=market_data,
                )
            except Exception as e:
                print(f"RAG enhancement failed, falling back to standard: {e}")

        # ── rate limit (standard fallback) ─────────────────────────────────────
        if not await _acquire_gemini_token("generate_comprehensive_negotiation_script"):
            return _RATE_LIMIT_ERROR_MSG

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
  Current Value:      {intent['current_value']}
  Target Value:       {intent['target_value']}
  Market Benchmark:   {intent['market_benchmark']}
  Reasoning:          {intent['reasoning']}
  Negotiation Leverage: {intent['negotiation_leverage']}""")

        intents_summary  = "\n".join(intents_formatted)
        red_flags        = analysis.get('red_flags', [])
        red_flags_text   = "\n".join([f"• {f}" for f in red_flags]) if red_flags else "• None identified"
        sla_block        = _format_full_sla(sla_data)
        market_block     = _format_market_context(market_data)

        prompt = f"""You are a professional Car Lease Negotiation Expert with 15+ years of automotive finance experience.

VEHICLE: {vehicle_info}

CONTRACT ANALYSIS:
  Fairness Score: {analysis.get('fairness_score', 'N/A')}/100 ({analysis.get('rating', 'Unknown')})

RED FLAGS:
{red_flags_text}

NEGOTIATION INTENTS (address in order: CRITICAL → HIGH → MEDIUM → LOW):
{intents_summary}

{sla_block}
{market_block}

TASK: Generate a complete, professional negotiation script the customer can use directly with the dealer(all prices are in INR).

REQUIREMENTS:
1. Polite but firm — professional and assertive
2. Address ALL intents in priority order
3. For each negotiation point:
   - State the current term clearly with its number
   - Cite the market benchmark
   - Make a concrete counter-offer using the target value
   - If market price is available, use the price comparison to strengthen the argument
4. Structure:
   - Opening: Professional greeting
   - Issues: Each point grouped by priority
   - Counter-offers: Specific proposals with numbers
   - Closing: Next steps
5. Ready to use (5-7 paragraphs)

Generate the script:"""

        try:
            model    = genai.GenerativeModel('gemini-2.5-flash')
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            return f"Error generating negotiation script: {str(e)}"

    @staticmethod
    async def answer_followup_question(
        user_question: str,
        sla_data: Dict,
        negotiation_intents: List[Dict],
        analysis: Dict,
        vehicle_data: Optional[Dict] = None,
        conversation_history: Optional[List[Dict]] = None,
        market_data: Optional[Dict] = None,
        use_rag: bool = True,
    ) -> str:
        """
        Answer follow-up questions with full SLA + market context.

        Args:
            user_question:        User's question
            sla_data:             Full contract SLA data
            negotiation_intents:  Generated intents
            analysis:             Analysis results
            vehicle_data:         Vehicle info
            conversation_history: Previous messages
            market_data:          Market price context (optional)
            use_rag:              Whether to use RAG (default: True)

        Returns:
            Helpful, specific answer, or rate-limit notice.
        """
        if use_rag:
            try:
                from app.core.negotiation_rag_enhanced import get_negotiation_rag
                rag = get_negotiation_rag()
                return await rag.enhance_answer(
                    user_question=user_question,
                    sla_data=sla_data,
                    negotiation_intents=negotiation_intents,
                    analysis=analysis,
                    vehicle_data=vehicle_data,
                    conversation_history=conversation_history,
                    market_data=market_data,
                )
            except Exception as e:
                print(f"RAG enhancement failed, falling back to standard: {e}")

        # ── rate limit (standard fallback) ─────────────────────────────────────
        if not await _acquire_gemini_token("answer_followup_question"):
            return _RATE_LIMIT_ERROR_MSG

        import re
        income_match = re.search(
            r'\$?\s*(\d+(?:,\d+)?)\s*(?:per month|monthly|/month|a month)',
            user_question.lower(),
        )
        user_income           = None
        affordability_context = ""

        if income_match:
            user_income     = float(income_match.group(1).replace(',', ''))
            monthly_payment = sla_data.get('monthly_payment')
            if monthly_payment:
                try:
                    from app.core.negotiation_rules import NegotiationRules
                    payment_amount = NegotiationRules._extract_number(monthly_payment)
                    if payment_amount:
                        payment_pct = (payment_amount / user_income) * 100
                        affordability_context = f"""
AFFORDABILITY ANALYSIS:
  Monthly Income:    ${user_income:,.0f}
  Monthly Payment:   ${payment_amount:.2f}
  % of Income:       {payment_pct:.1f}%
  Recommended Max:   15% (${user_income * 0.15:,.2f})
  Status:            {'✓ AFFORDABLE' if payment_pct <= 15 else '⚠️ OVER BUDGET'}"""
                except Exception:
                    pass

        intents_text = "\n".join([
            f"- {i['field']}: Current {i['current_value']}, "
            f"Target {i['target_value']} (Market: {i['market_benchmark']})"
            for i in negotiation_intents[:5]
        ])

        history_text = ""
        if conversation_history:
            recent       = conversation_history[-3:]
            history_text = "\nRECENT CONVERSATION:\n" + "\n".join([
                f"{m.get('role', 'user').upper()}: {m.get('content', '')}"
                for m in recent
            ])

        sla_block    = _format_full_sla(sla_data)
        market_block = _format_market_context(market_data)

        vehicle_str = (
            f"{vehicle_data.get('year', '')} "
            f"{vehicle_data.get('make', '')} "
            f"{vehicle_data.get('model', '')}"
        ) if vehicle_data else "Unknown vehicle"

        prompt = f"""You are a car lease/loan negotiation expert.

VEHICLE: {vehicle_str}

{sla_block}
{market_block}

CONTRACT ANALYSIS:
  Fairness Score: {analysis.get('fairness_score', 'N/A')}/100 ({analysis.get('rating', 'N/A')})

KEY NEGOTIATION INTENTS:
{intents_text}
{affordability_context}
{history_text}

QUESTION: {user_question}

Provide a specific, actionable answer (2-5 sentences).
Reference actual contract numbers and market data where relevant.(all prices are in INR)"""

        try:
            model    = genai.GenerativeModel('gemini-2.5-flash')
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            return f"Error: {str(e)}"

    @staticmethod
    async def explain_intent(
        intent: Dict,
        market_data: Optional[Dict] = None,
    ) -> str:
        """
        Explain a single negotiation intent in user-friendly language.
        Includes market comparison context if available.
        """
        # ── rate limit ─────────────────────────────────────────────────────────
        if not await _acquire_gemini_token("explain_intent"):
            return _RATE_LIMIT_ERROR_MSG

        market_block = _format_market_context(market_data)

        prompt = f"""Explain this negotiation point to a customer in simple, friendly language:

  Field:            {intent['field']}
  Current Value:    {intent['current_value']}
  Target Value:     {intent['target_value']}
  Market Benchmark: {intent['market_benchmark']}
  Reasoning:        {intent['reasoning']}
{market_block}

Write 2-3 sentences explaining:
1. What this term means
2. Why the current value is problematic (use market data if available)
3. What they should ask for instead

Be encouraging and practical.(all prices are in INR)"""

        try:
            model    = genai.GenerativeModel('gemini-2.5-flash')
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            return f"Error: {str(e)}"