# main.py
from fastapi import FastAPI
from app.database import engine, Base
from app.api import upload, analysis  # Import the new analysis router

# Create DB Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Car Contract Engine - Milestone 2")

# Register Routes
app.include_router(upload.router, prefix="/api/v1")
app.include_router(analysis.router, prefix="/api/v1")

@app.get("/")
def home():
    # Update to Week 4 to show you finished the milestone
    return {"status": "Online", "milestone": "2 - Week 4 Completed"}