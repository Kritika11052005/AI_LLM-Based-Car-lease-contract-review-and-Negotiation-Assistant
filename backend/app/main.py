from fastapi import FastAPI
from prisma import Prisma
from app.routes.upload import router as upload_router

app = FastAPI(title="Car Contract Analysis API")

db = Prisma()

@app.on_event("startup")
async def startup():
    await db.connect()

@app.on_event("shutdown")
async def shutdown():
    await db.disconnect()

app.include_router(upload_router, prefix="/api")

@app.get("/")
def root():
    return {"status": "Backend running"}
