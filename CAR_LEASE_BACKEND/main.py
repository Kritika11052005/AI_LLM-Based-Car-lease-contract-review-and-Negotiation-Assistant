from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uvicorn
import os
from datetime import datetime

from database import get_db, create_tables, Contract
from app.routes.upload import router as upload_router

# Create FastAPI app
app = FastAPI(
    title="Car Lease Contract Review API",
    description="API for uploading and extracting text from car lease contracts",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(upload_router, prefix="/api/v1")

# Create tables on startup
@app.on_event("startup")
async def startup_event():
    create_tables()
    # Ensure contracts directory exists
    os.makedirs("contracts", exist_ok=True)
    os.makedirs("logs", exist_ok=True)

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "Car Lease Contract Review API",
        "status": "running",
        "timestamp": datetime.now().isoformat()
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

# Get all contracts endpoint
@app.get("/api/v1/contracts")
async def get_contracts(db: Session = Depends(get_db)):
    try:
        contracts = db.query(Contract).all()
        return {
            "success": True,
            "count": len(contracts),
            "contracts": [
                {
                    "id": contract.id,
                    "file_name": contract.file_name,
                    "upload_date": contract.upload_date.isoformat() if contract.upload_date else None
                }
                for contract in contracts
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching contracts: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )