import os
import requests


OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OLLAMA_URL = "http://localhost:11434/api/generate"

OPENROUTER_HEADERS = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "Content-Type": "application/json",
}

OPENROUTER_MODELS = [
    "mistralai/mistral-small-3.1-24b-instruct"
]

OLLAMA_MODEL = "llama3"



def call_llm(prompt: str) -> str:
    
    print("\nStarting LLM request...")


    if OPENROUTER_API_KEY:

        for model in OPENROUTER_MODELS:

            payload = {
                "model": model,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a contract analysis assistant. Always return clean JSON when requested."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0,
                "max_tokens": 1200
            }

            try:
                print(f"Trying OpenRouter model: {model}")

                response = requests.post(
                    OPENROUTER_URL,
                    headers=OPENROUTER_HEADERS,
                    json=payload,
                    timeout=60
                )

                if response.status_code == 200:

                    content = response.json()["choices"][0]["message"]["content"]

                    print("✅ OpenRouter success")

                    return content

                else:

                    print(f"⚠️ OpenRouter failed: {response.text}")

            except Exception as e:

                print(f"⚠️ OpenRouter crashed: {e}")

    else:
        print("⚠️ No OPENROUTER_API_KEY found. Skipping OpenRouter.")





    print("🔁 Falling back to Ollama...")

    try:

        ollama_payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0
            }
        }

        response = requests.post(
            OLLAMA_URL,
            json=ollama_payload,
            timeout=120
        )

        if response.status_code == 200:

            result = response.json().get("response")

            if result:
                print("✅ Ollama success")
                return result

            else:
                print("⚠️ Ollama returned empty response")

        else:
            print("⚠️ Ollama failed:", response.text)

    except Exception as e:

        print("⚠️ Ollama crashed:", e)



    print("❌ All LLM providers failed. Returning safe fallback JSON.")

    return """
{
  "fairness_score": 50,
  "rating": "Unknown",
  "explanation": "LLM providers unavailable. Fallback response used.",
  "negotiation_power": "Unknown",
  "recommended_action": "Retry later or check LLM configuration."
}
"""