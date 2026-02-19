"""
app/core/market_service.py

Async MarketCheck API client.

Endpoints used:
  GET /v2/decode/car/{VIN}/specs   → decode_vin()
  GET /v2/predict/car/price        → predict_price()

Auth: api_key (+ optional api_secret) as query params.
All failures are caught and return None so the contract pipeline never crashes.
"""

from __future__ import annotations

import logging
from typing import Optional

import httpx

import app.core.config as cfg

logger = logging.getLogger(__name__)


# ── helpers ────────────────────────────────────────────────────────────────────

def _auth_params() -> dict:
    """Build MarketCheck auth query params from config."""
    params: dict = {"api_key": cfg.MARKETCHECK_API_KEY}
    if cfg.MARKETCHECK_API_SECRET:
        params["api_secret"] = cfg.MARKETCHECK_API_SECRET
    return params


def _safe_float(v) -> Optional[float]:
    try:
        return round(float(v), 2)
    except (TypeError, ValueError):
        return None


def _safe_int(v) -> Optional[int]:
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


# ── public async functions ─────────────────────────────────────────────────────

async def decode_vin(vin: str) -> Optional[dict]:
    """
    Call /v2/decode/car/{VIN}/specs.

    Returns:
        {"year": int, "make": str, "model": str, "trim": str}
        or None on any failure.
    """
    if not vin or not vin.strip():
        logger.warning("decode_vin: empty VIN supplied")
        return None

    url = f"{cfg.MARKETCHECK_BASE_URL}/decode/car/{vin.strip()}/specs"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, params=_auth_params())

        if resp.status_code == 429:
            logger.error("MarketCheck rate limit hit (decode_vin)")
            return None

        resp.raise_for_status()
        data: dict = resp.json()

        return {
            "year":  _safe_int(data.get("year")),
            "make":  data.get("make"),
            "model": data.get("model"),
            "trim":  data.get("trim"),
        }

    except httpx.HTTPStatusError as exc:
        logger.error("decode_vin HTTP %s: %s", exc.response.status_code, exc)
    except httpx.RequestError as exc:
        logger.error("decode_vin request error: %s", exc)
    except Exception as exc:
        logger.exception("decode_vin unexpected error: %s", exc)

    return None


async def predict_price(
    make: Optional[str],
    model: Optional[str],
    year: Optional[int],
    trim: Optional[str] = None,
    miles: int = 50_000,
    car_type: str = "used",  # ✅ FIX: Required by MarketCheck API
) -> Optional[dict]:
    """
    Call /v2/predict/car/price.

    Args:
        make: Vehicle make (required)
        model: Vehicle model (required)
        year: Vehicle year (required)
        trim: Vehicle trim (optional)
        miles: Mileage for valuation (default: 50,000)
        car_type: "used" or "new" (default: "used")

    Returns:
        {
            "predicted_price": float,
            "price_range": {"low": float, "high": float}
        }
        or None on any failure.
    """
    if not (make and model and year):
        logger.warning(
            "predict_price: incomplete vehicle data — make=%s model=%s year=%s",
            make, model, year,
        )
        return None

    url = f"{cfg.MARKETCHECK_BASE_URL}/predict/car/price"

    params: dict = {
        **_auth_params(),
        "make":  make,
        "model": model,
        "year":  year,
        "miles": miles,
        "car_type": car_type,  # ✅ FIX: Added required parameter
    }
    if trim:
        params["trim"] = trim

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, params=params)

        if resp.status_code == 429:
            logger.error("MarketCheck rate limit hit (predict_price)")
            return None

        resp.raise_for_status()
        data: dict = resp.json()

        # MarketCheck field names vary — handle both conventions
        predicted = _safe_float(
            data.get("price") or data.get("predicted_price") or data.get("mean")
        )
        low  = _safe_float(data.get("price_range_low")  or data.get("low_price")  or data.get("low"))
        high = _safe_float(data.get("price_range_high") or data.get("high_price") or data.get("high"))

        if not predicted:
            logger.warning("predict_price: no price returned for %s %s %s", year, make, model)
            return None

        # Build ±15 % range as fallback when API doesn't return bounds
        if not (low and high):
            low  = round(predicted * 0.85, 2)
            high = round(predicted * 1.15, 2)

        return {
            "predicted_price": predicted,
            "price_range": {"low": low, "high": high},
        }

    except httpx.HTTPStatusError as exc:
        logger.error("predict_price HTTP %s: %s", exc.response.status_code, exc)
    except httpx.RequestError as exc:
        logger.error("predict_price request error: %s", exc)
    except Exception as exc:
        logger.exception("predict_price unexpected error: %s", exc)

    return None