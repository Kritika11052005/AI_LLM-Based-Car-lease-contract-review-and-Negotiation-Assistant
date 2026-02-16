from fastapi import FastAPI
import logging
from app.database import db
from fastapi.middleware.cors import CORSMiddleware 
from app.routes.upload import router as upload_router
from app.routes.vin import router as vin_router
from app.routes.negotiation_routes import router as negotiation_router
from app.routes.fairness import router as fairness_router
from app.generated.prisma.engine.errors import EngineConnectionError
from app.routes import price_estimation  # TODO: Implement price estimation routes

app = FastAPI(title="Car Contract Analysis API")

# ← ADD CORS MIDDLEWARE HERE
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.on_event("startup")
async def startup():
    """
   Attempt to connect to the database on startup.
    If the Prisma engine cannot reach the database (e.g. Neon URL down or
    network issue), log the error but allow the API process to start so that
    non‑DB endpoints can still function.
    """
    try:
        await db.connect()
    except EngineConnectionError as exc:
        logging.error("Database connection failed: %s", exc)


@app.on_event("shutdown")
async def shutdown():
    try:
        await db.disconnect()
    except Exception:
         #Best-effort disconnect; ignore errors on shutdown
        pass


app.include_router(upload_router, prefix="/api")
app.include_router(vin_router, prefix="/api")
app.include_router(negotiation_router, prefix="/api/negotiation")
app.include_router(fairness_router, prefix="/api/fairness", tags=["fairness"])
app.include_router(price_estimation.router, prefix="/api/price", tags=["price"])  # TODO: Implement

@app.get("/")
def root():
    return {"status": "Backend running"}

