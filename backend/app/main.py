from fastapi import FastAPI
import logging
from app.database import db
from fastapi.middleware.cors import CORSMiddleware
from app.routes.upload import router as upload_router
from app.routes.vin import router as vin_router
from app.routes.negotiation_routes import router as negotiation_router
from app.routes.fairness import router as fairness_router
from app.routes.market import router as market_router          # ← Week 7
from app.generated.prisma.engine.errors import EngineConnectionError


app = FastAPI(title="Car Contract Analysis API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
@app.on_event("startup")
async def startup():
    await db.connect()
    print("DB CONNECTED SUCCESSFULLY")


@app.on_event("shutdown")
async def shutdown():
    try:
        await db.disconnect()
    except Exception:
        pass


# ── existing routers (unchanged) ────────────────────────────────────────────────
app.include_router(upload_router,      prefix="/api")
app.include_router(vin_router,         prefix="/api")
app.include_router(negotiation_router, prefix="/api/negotiation")


# ── Week 7: market price + enriched fairness ────────────────────────────────────
app.include_router(fairness_router, prefix="/api/fairness", tags=["fairness"])
app.include_router(market_router,      prefix="/api/market",   tags=["market"])


@app.get("/")
def root():
    return {"status": "Backend running"}