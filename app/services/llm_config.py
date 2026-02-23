import os
from langchain_google_genai import ChatGoogleGenerativeAI

# --- CONFIGURATION ---
# UPDATED: Using Gemini 2.5 Flash (Current Stable Model in 2026)
# Context: 1M+ Tokens | Rate Limits: High

llm_extraction = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",  # <--- UPDATE TO 2.5
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0
)

chat_llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",  # <--- UPDATE TO 2.5
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0.7
)