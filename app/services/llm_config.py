import os
from langchain_groq import ChatGroq
from dotenv import load_dotenv

load_dotenv(override=True)

# Llama 3.3 70B is great for complex extraction tasks
llm_extraction = ChatGroq(
    model_name="llama-3.3-70b-versatile",
    groq_api_key=os.getenv("GROQ_API_KEY"),
    temperature=0
)

# Llama 3.1 8B is perfect for fast, conversational chat
chat_llm = ChatGroq(
    model_name="llama-3.1-8b-instant",
    groq_api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.5
)