from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from app.routes.upload import upload_contract
from app.routes.chat import router as chat_router

# CREATE app FIRST
app = FastAPI(
    title="Car Contract AI",
    description="Lease contract review + negotiation assistant",
    version="3.0"
)

# THEN attach routes
app.post("/upload")(upload_contract)
app.include_router(chat_router, prefix="/chat")

@app.get("/")
def health():
    return {"status": "running", "milestone": 3}
