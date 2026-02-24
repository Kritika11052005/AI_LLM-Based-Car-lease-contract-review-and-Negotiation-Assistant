import os
import requests


OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OLLAMA_URL = "http://localhost:11434/api/generate"

OPENROUTER_HEADERS = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "Content-Type": "application/json",
}

OPENROUTER_MODEL = "mistralai/mistral-small-3.1-24b-instruct"
OLLAMA_MODEL = "llama3"



# ==========================================================
# EXTRACTION LLM (OpenRouter Only)
# ==========================================================

def call_extraction_llm(prompt: str) -> str:

    if not OPENROUTER_API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY not configured.")

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "You are a contract analysis assistant. Always return clean JSON only."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0,
        "max_tokens": 1500
    }

    try:
        response = requests.post(
            OPENROUTER_URL,
            headers=OPENROUTER_HEADERS,
            json=payload,
            timeout=60
        )

        if response.status_code == 200:
            return response.json()["choices"][0]["message"]["content"]

        raise RuntimeError(f"OpenRouter failed: {response.text}")

    except Exception as e:
        raise RuntimeError(f"OpenRouter crashed: {str(e)}")



# ==========================================================
# NEGOTIATION LLM (Ollama Only)
# ==========================================================

def call_negotiation_llm(prompt: str) -> str:

    ollama_payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.6
        }
    }

    try:
        response = requests.post(
            OLLAMA_URL,
            json=ollama_payload,
            timeout=120
        )

        if response.status_code == 200:
            result = response.json().get("response")
            if result:
                return result

        raise RuntimeError(f"Ollama failed: {response.text}")

    except Exception as e:
        raise RuntimeError(f"Ollama crashed: {str(e)}")



# ==========================================================
# OPTIONAL TASK ROUTER
# ==========================================================

def call_llm(prompt: str, task_type: str = "negotiation") -> str:

    if task_type == "extraction":
        return call_extraction_llm(prompt)

    if task_type == "negotiation":
        return call_negotiation_llm(prompt)

    raise ValueError("Invalid task_type. Use 'extraction' or 'negotiation'.")