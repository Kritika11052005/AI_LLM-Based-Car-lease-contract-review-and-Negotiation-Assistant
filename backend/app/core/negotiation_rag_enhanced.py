"""
RAG-Enhanced Negotiation Chatbot
Adds LangChain + ChromaDB on top of existing Gemini chatbot
Works alongside negotiation_chatbot.py and negotiation_rules.py
"""

import os
from typing import Dict, List, Optional
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_community.vectorstores import Chroma
from langchain.schema import Document
from dotenv import load_dotenv
import json

load_dotenv()


class NegotiationRAG:
    """
    RAG system for enhanced negotiation advice
    - Stores market benchmarks and tactics in vector DB
    - Retrieves relevant context for smarter answers
    """
    
    def __init__(self):
        """Initialize RAG components"""
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=os.getenv("GEMINI_API_KEY")
        )
        
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=os.getenv("GEMINI_API_KEY"),
            temperature=0.3
        )
        
        self.knowledge_base = None
        self._initialize_knowledge_base()
    
    def _initialize_knowledge_base(self):
        """Initialize knowledge base with market data and tactics"""
        
        # Market benchmarks
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
                """
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
                """
            },
            {
                "category": "mileage",
                "content": """
MILEAGE BENCHMARKS:
- Standard: 12,000-15,000 miles/year
- Overage fee: $0.15-$0.20/mile (standard)
- Overage fee: >$0.25/mile (excessive)

NEGOTIATION: "I drive [X] miles/year. Can we increase allowance to [Y] miles or reduce overage to $0.15-0.18/mile?"
                """
            },
            {
                "category": "fees",
                "content": """
FEE BENCHMARKS:
- Early termination: $300-$500 (reasonable), >$1000 (excessive)
- Late payment: $25-$35 (standard), >$50 (excessive)
- Disposition: $300-$500 (standard)

NEGOTIATION: "Can we cap early termination at $400? The $[amount] is above industry standard."
                """
            }
        ]
        
        # Negotiation tactics
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
                """
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
                """
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
                """
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
                """
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
                """
            }
        ]
        
        # Convert to documents
        all_docs = []
        
        for item in benchmarks:
            all_docs.append(Document(
                page_content=item["content"],
                metadata={"category": item["category"], "type": "benchmark"}
            ))
        
        for item in tactics:
            all_docs.append(Document(
                page_content=item["content"],
                metadata={"scenario": item["scenario"], "type": "tactic"}
            ))
        
        # Create vector store
        self.knowledge_base = Chroma.from_documents(
            documents=all_docs,
            embedding=self.embeddings,
            collection_name="negotiation_knowledge",
            persist_directory="./chroma_db/negotiation"
        )
        
        print(f"✓ RAG knowledge base initialized with {len(all_docs)} documents")
    
    def enhance_script_generation(
        self,
        sla_data: Dict,
        negotiation_intents: List[Dict],
        analysis: Dict,
        vehicle_data: Optional[Dict] = None
    ) -> str:
        """
        Enhance script generation with RAG-retrieved tactics
        
        Uses vector DB to find relevant negotiation tactics
        """
        
        # Extract key issues to search for
        search_queries = []
        for intent in negotiation_intents[:3]:  # Top 3 intents
            field = intent.get('field', '')
            if 'interest_rate' in field or 'apr' in field:
                search_queries.append("negotiate APR interest rate")
            elif 'monthly_payment' in field:
                search_queries.append("reduce monthly payment budget")
            elif 'mileage' in field:
                search_queries.append("negotiate mileage allowance overage")
            elif 'fee' in field:
                search_queries.append("negotiate fees early termination")
        
        # Retrieve relevant tactics
        retrieved_docs = []
        for query in search_queries:
            docs = self.knowledge_base.similarity_search(query, k=1)
            retrieved_docs.extend(docs)
        
        # Format retrieved context
        rag_context = "\n\n".join([doc.page_content for doc in retrieved_docs])
        
        # Format vehicle info
        vehicle_info = "Vehicle not specified"
        if vehicle_data:
            vehicle_info = f"{vehicle_data.get('year')} {vehicle_data.get('make')} {vehicle_data.get('model')}"
        
        # Format intents
        intents_formatted = []
        for idx, intent in enumerate(negotiation_intents, 1):
            intents_formatted.append(f"""
Intent {idx} - {intent['priority']} PRIORITY:
Field: {intent['field']}
Current: {intent['current_value']}
Target: {intent['target_value']}
Benchmark: {intent['market_benchmark']}
Reasoning: {intent['reasoning']}
Leverage: {intent['negotiation_leverage']}
""")
        
        intents_summary = "\n".join(intents_formatted)
        
        # Generate script with RAG context
        prompt = f"""You are a Car Lease Negotiation Expert with 15+ years experience.

VEHICLE: {vehicle_info}

ANALYSIS:
Fairness Score: {analysis.get('fairness_score')}/100 ({analysis.get('rating')})
Red Flags: {', '.join(analysis.get('red_flags', []))}

NEGOTIATION PRIORITIES:
{intents_summary}

CONTRACT TERMS:
- APR: {sla_data.get('interest_rate', 'Not specified')}
- Monthly Payment: {sla_data.get('monthly_payment', 'Not specified')}
- Term: {sla_data.get('lease_term_months', 'Not specified')} months
- Down Payment: {sla_data.get('down_payment', 'Not specified')}
- Mileage: {sla_data.get('mileage_allowance', 'Not specified')}
- Overage: {sla_data.get('overage_charge', 'Not specified')}

PROVEN TACTICS (Retrieved from Knowledge Base):
{rag_context}

TASK: Generate a professional negotiation script addressing all intents (CRITICAL → HIGH → MEDIUM → LOW).

STRUCTURE:
1. Professional opening
2. Present each issue with market benchmarks
3. Make specific counter-offers using target values
4. Use proven tactics from above
5. Professional closing with next steps

Keep it ready-to-use (5-7 paragraphs). Use actual numbers and tactics provided.

Generate the script:"""
        
        try:
            response = self.llm.predict(prompt)
            return response
        except Exception as e:
            return f"Error generating script: {str(e)}"
    
    def enhance_answer(
        self,
        user_question: str,
        sla_data: Dict,
        negotiation_intents: List[Dict],
        analysis: Dict,
        vehicle_data: Optional[Dict] = None,
        conversation_history: Optional[List[Dict]] = None
    ) -> str:
        """
        Enhance Q&A with RAG-retrieved context
        
        Searches vector DB for relevant tactics/benchmarks
        """
        
        # Retrieve relevant knowledge
        relevant_docs = self.knowledge_base.similarity_search(user_question, k=3)
        rag_context = "\n\n".join([doc.page_content for doc in relevant_docs])
        
        # Extract income if mentioned
        import re
        income_match = re.search(r'\$?\s*(\d+(?:,\d+)?)\s*(?:per month|monthly|/month|a month)', user_question.lower())
        user_income = None
        affordability_info = ""
        
        if income_match:
            user_income = float(income_match.group(1).replace(',', ''))
            monthly_payment = sla_data.get('monthly_payment')
            if monthly_payment and isinstance(monthly_payment, (int, float)):
                payment_pct = (monthly_payment / user_income) * 100
                affordability_info = f"\nAFFORDABILITY: Payment is {payment_pct:.1f}% of income ({'AFFORDABLE' if payment_pct <= 15 else 'OVER BUDGET'})"
        
        # Build conversation history
        history_text = ""
        if conversation_history:
            recent = conversation_history[-3:]
            history_text = "\nRECENT CONVERSATION:\n" + "\n".join([
                f"{msg.get('role', 'user').upper()}: {msg.get('content', '')}"
                for msg in recent
            ])
        
        # Format intents
        intents_summary = []
        for intent in negotiation_intents[:5]:
            intents_summary.append(
                f"- {intent['field']}: Current {intent['current_value']}, "
                f"Target {intent['target_value']}"
            )
        intents_text = "\n".join(intents_summary)
        
        prompt = f"""You are a car lease/loan negotiation expert.

VEHICLE: {vehicle_data.get('year', '')} {vehicle_data.get('make', '')} {vehicle_data.get('model', '')}

CONTRACT:
- APR: {sla_data.get('interest_rate', 'Not specified')}
- Payment: {sla_data.get('monthly_payment', 'Not specified')}
- Term: {sla_data.get('lease_term_months', 'Not specified')} months
- Fairness: {analysis.get('fairness_score', 'N/A')}/100{affordability_info}

KEY INTENTS:
{intents_text}

RELEVANT KNOWLEDGE (Retrieved from Database):
{rag_context}

{history_text}

QUESTION: {user_question}

Provide a specific, actionable answer (2-5 sentences). Reference the tactics and benchmarks provided above.

Answer:"""
        
        try:
            response = self.llm.predict(prompt)
            return response
        except Exception as e:
            return f"Error: {str(e)}"


# Global instance
_rag_instance = None

def get_negotiation_rag():
    """Get or create RAG instance (singleton)"""
    global _rag_instance
    if _rag_instance is None:
        _rag_instance = NegotiationRAG()
    return _rag_instance