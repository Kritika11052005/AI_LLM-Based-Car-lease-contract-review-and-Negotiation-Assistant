from fastapi import FastAPI
from app.database import engine
from app.models import Base
from ocr.upload_api import router as upload_router

app = FastAPI(title="Car Lease Contract Review API")

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)

app.include_router(upload_router)

@app.get("/")
def root():
    return {"status": "running"}

@app.get("/health")
def health():
    return {"status": "healthy"}
