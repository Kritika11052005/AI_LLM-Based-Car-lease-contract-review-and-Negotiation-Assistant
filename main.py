from fastapi import FastAPI
from db import engine
import models
from routes import upload

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Car Lease Contract Assistant")

# Include routers
app.include_router(upload.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Car Lease Contract Assistant API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
