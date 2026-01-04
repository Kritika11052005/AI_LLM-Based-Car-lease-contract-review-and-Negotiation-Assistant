from fastapi import FastAPI
from app.routes.upload import upload_contract

app = FastAPI(
    title="Car Contract AI",
    description="Milestone 1: Robust PDF ingestion",
    version="1.0"
)

app.post("/upload")(upload_contract)


@app.get("/")
def health():
    return {"status": "running", "milestone": 1}
