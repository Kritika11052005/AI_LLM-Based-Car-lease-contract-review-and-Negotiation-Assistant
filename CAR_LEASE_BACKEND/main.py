from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from app.routes.upload import router as upload_router
from app.routes.sla import router as sla_router

# Initialize FastAPI app
app = FastAPI(
    title="Car Lease Contract Review API",
    description="Backend for PDF upload, OCR extraction, and contract analysis",
    version="1.0.0"
)

# Configure CORS (adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    """Initialize database tables on application startup"""
    print("🚀 Starting Car Lease Backend...")
    init_db()
    print("✓ Application ready")

# Include routers
app.include_router(upload_router, prefix="/api", tags=["Upload"])
app.include_router(sla_router, prefix="/api", tags=["SLA"])

# Root endpoint
@app.get("/")
def read_root():
    """Health check endpoint"""
    return {
        "status": "running",
        "service": "Car Lease Contract Review API",
        "version": "1.0.0"
    }

# Run with: uvicorn main:app --reload --port 8000
