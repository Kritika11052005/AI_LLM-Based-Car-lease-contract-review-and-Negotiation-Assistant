import httpx
import asyncio
import time

# Use the ID from your most recent Swagger success
CONTRACT_ID = "1e58ceff-15d7-47e3-bf63-a9b33e42a0fa" 

async def terminal_negotiator():
    chat_history = [] 
    print("--- 🤖 Car Lease Negotiator: Connected ---")
    
    while True:
        user_input = input("You: ")
        if user_input.lower() in ["exit", "quit"]: break

        # Loop for automatic retries
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.post(
                        f"http://localhost:8000/contracts/{CONTRACT_ID}/chat",
                        json={"message": user_input, "history": chat_history}
                    )

                    if response.status_code == 429:
                        print(f"⚠️ Limit reached. Waiting 10 seconds to retry... (Attempt {attempt+1}/3)")
                        await asyncio.sleep(10)
                        continue
                    
                    if response.status_code != 200:
                        print(f"❌ Server Error: {response.text}")
                        break

                    ai_reply = response.json()["response"]
                    print(f"\nAssistant: {ai_reply}\n")
                    
                    chat_history.append({"role": "user", "content": user_input})
                    chat_history.append({"role": "assistant", "content": ai_reply})
                    break # Success! Exit the retry loop

            except Exception as e:
                print(f"❌ Connection Error: {e}")
                break

if __name__ == "__main__":
    asyncio.run(terminal_negotiator())