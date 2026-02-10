from langchain_google_genai import ChatGoogleGenerativeAI
import os
from typing import List, Dict

# YOUR LLM initialization
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=os.getenv("GEMINI_API_KEY")
)

def generate_negotiation_message(flags):
    """YOUR original function"""
    issues = "\n".join(
        f"- {f['issue']}: {f['reason']}" for f in flags
    )

    prompt = f"""
You are a professional car lease negotiation assistant.

The following issues were identified:
{issues}

Combine ALL issues into ONE concise negotiation message.
Do not address issues separately.
Do not add new issues.
"""

    return llm.invoke(prompt).content

def generate_chat_response(user_message: str, negotiation_intents: List[str], chat_history: List[Dict] = None):
    """
    Generate chat response using their pattern
    """
    # Build system context like theirs
    system_context = f"""
    You are a professional Lease Negotiation Coach. 
    
    YOUR KNOWLEDGE: 
    You have analyzed the contract and found these specific negotiation points: {negotiation_intents}
    
    YOUR GOAL:
    1. Talk DIRECTLY to the user (the car buyer) as a helpful, expert coach.
    2. Provide conversational advice and specific "talking points" they can use.
    3. DO NOT write an email or letter starting with 'Dear Dealer' unless the user explicitly asks.
    4. Focus on high-severity items first.
    5. Be concise and encouraging.
    """
    
    # Build full prompt like theirs
    full_prompt = f"SYSTEM: {system_context}\n"
    
    # Add chat history if provided
    if chat_history:
        for msg in chat_history:
            role = "ASSISTANT" if msg.get('sender_role') == "ai" else "USER"
            full_prompt += f"{role}: {msg.get('body', '')}\n"
    
    # Add current user message
    full_prompt += f"USER: {user_message}\nASSISTANT:"
    
    try:
        response = llm.invoke(full_prompt)
        return response.content.strip()
    except Exception as e:
        return f"Error generating response: {str(e)}"