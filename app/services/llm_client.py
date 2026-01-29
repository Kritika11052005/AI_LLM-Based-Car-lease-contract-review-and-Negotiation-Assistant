import os
import requests

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

URL = "https://openrouter.ai/api/v1/chat/completions"

HEADERS = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "Content-Type": "application/json",
}

MODELS = [
    "mistralai/mistral-small-3.1-24b-instruct"
]

def call_llm(prompt: str) -> str:
    last_error = None

    for model in MODELS:
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a contract analysis assistant."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0,
            "max_tokens": 1200  
        }

        try:
            response = requests.post(URL, headers=HEADERS, json=payload, timeout=60)

            if response.status_code == 200:
                return response.json()["choices"][0]["message"]["content"]

            else:
                print(f"⚠️ {model} failed: {response.text}")
                last_error = response.text

        except Exception as e:
            print(f"⚠️ {model} crashed: {e}")
            last_error = str(e)

    raise Exception(f"All models failed. Last error: {last_error}")
