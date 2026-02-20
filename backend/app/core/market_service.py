"""
app/core/market_service.py

Async MarketCheck API client — with rate limiting.

Endpoints used:
  GET /v2/decode/car/{VIN}/specs   → decode_vin()
  GET /v2/search/car/active        → get_market_average()  (primary)
  GET /v2/predict/car/price        → _predict_price_fallback()  (fallback)

Auth: api_key (+ optional api_secret) as query params.

get_market_average() fallback chain:
  1. Active listings — exact year + trim
  2. Active listings — exact year, no trim   (relax trim)
  3. Active listings — no year, no trim      (relax year — catches old/rare cars)
  4. predict_price   — ML estimate           (last resort when no listings exist)

Rate limiting:
  All outbound MarketCheck requests pass through LIMITERS["marketcheck"] (token-bucket).
  If the limiter cannot grant a token within max_wait_seconds it logs a warning and
  returns None — the pipeline never crashes.

All failures are caught and return None so the pipeline never crashes.
"""

from __future__ import annotations

import logging
from typing import Optional

import httpx

import app.core.config as cfg
from app.core.rate_limiter import LIMITERS, RateLimitError

logger = logging.getLogger(__name__)


# ── helpers ────────────────────────────────────────────────────────────────────

def _auth_params() -> dict:
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


def _compute_average(listings: list) -> Optional[dict]:
    """
    Given a list of listing dicts, extract prices, remove outliers via IQR,
    and return market average + range. Returns None if no valid prices found.
    """
    prices = []
    for listing in listings:
        try:
            p = float(listing.get("price", 0))
            if p > 500:
                prices.append(p)
        except (TypeError, ValueError):
            continue

    if not prices:
        return None

    prices.sort()
    n   = len(prices)
    q1  = prices[n // 4]
    q3  = prices[(n * 3) // 4]
    iqr = q3 - q1
    lower = q1 - 1.5 * iqr
    upper = q3 + 1.5 * iqr
    clean = [p for p in prices if lower <= p <= upper] or prices  # fallback to raw

    avg  = round(sum(clean) / len(clean), 2)
    low  = round(min(clean), 2)
    high = round(max(clean), 2)

    logger.info(
        "📐 [_compute_average] IQR: Q1=%.0f Q3=%.0f | kept %d/%d prices | avg=%.2f low=%.2f high=%.2f",
        q1, q3, len(clean), len(prices), avg, low, high,
    )

    return {
        "predicted_price":  avg,
        "price_range":      {"low": low, "high": high},
        "listings_sampled": len(clean),
        "source":           "active_listings",
    }


# ── rate-limit guard ───────────────────────────────────────────────────────────

async def _acquire_marketcheck_token(caller: str) -> bool:
    """
    Acquire a rate-limit token for MarketCheck.

    Returns True if acquired, False if rate-limited (caller should return None).
    """
    try:
        await LIMITERS["marketcheck"].acquire()
        return True
    except RateLimitError as exc:
        logger.warning(
            "⛔ [%s] MarketCheck rate limit — retry after %.1fs",
            caller, exc.retry_after,
        )
        return False


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

    # ── rate limit ─────────────────────────────────────────────────────────────
    if not await _acquire_marketcheck_token("decode_vin"):
        return None

    url = f"{cfg.MARKETCHECK_BASE_URL}/decode/car/{vin.strip()}/specs"
    logger.info("🔍 [decode_vin] URL: %s | VIN: %s", url, vin.strip())

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, params=_auth_params())

        if resp.status_code == 429:
            logger.error("MarketCheck rate limit hit (decode_vin) — HTTP 429")
            return None

        resp.raise_for_status()
        data: dict = resp.json()
        logger.info("✅ [decode_vin] Raw response: %s", data)

        result = {
            "year":  _safe_int(data.get("year")),
            "make":  data.get("make"),
            "model": data.get("model"),
            "trim":  data.get("trim"),
        }
        logger.info("🚗 [decode_vin] Decoded: %s", result)
        return result

    except httpx.HTTPStatusError as exc:
        logger.error("decode_vin HTTP %s: %s", exc.response.status_code, exc)
    except httpx.RequestError as exc:
        logger.error("decode_vin request error: %s", exc)
    except Exception as exc:
        logger.exception("decode_vin unexpected error: %s", exc)

    return None


async def _fetch_active_listings(
    make: str,
    model: str,
    year: Optional[int] = None,
    trim: Optional[str] = None,
    rows: int = 50,
) -> Optional[dict]:
    """
    Internal helper — fetch active listings with given filters.
    Returns computed average dict or None.
    """
    # ── rate limit ─────────────────────────────────────────────────────────────
    if not await _acquire_marketcheck_token("_fetch_active_listings"):
        return None

    url = f"{cfg.MARKETCHECK_BASE_URL}/search/car/active"

    params: dict = {
        **_auth_params(),
        "make":  make,
        "model": model,
        "rows":  rows,
        "start": 0,
    }
    if year:
        params["year"] = year
    if trim:
        params["trim"] = trim

    logger.info(
        "📋 [active_listings] Trying → %s %s %s trim=%s",
        year or "any-year", make, model, trim or "any-trim",
    )

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(url, params=params)

        if resp.status_code == 429:
            logger.error("MarketCheck rate limit hit (active listings) — HTTP 429")
            return None

        resp.raise_for_status()
        data = resp.json()

        listings    = data.get("listings", [])
        total_found = data.get("num_found", 0)

        logger.info(
            "📋 [active_listings] Found: %d total | %d returned | params: %s",
            total_found, len(listings),
            {k: v for k, v in params.items() if k != "api_key"},
        )

        if not listings:
            return None

        result = _compute_average(listings)
        if result:
            result["listings_found"] = total_found
        return result

    except httpx.HTTPStatusError as exc:
        logger.error("active_listings HTTP %s: %s", exc.response.status_code, exc)
    except httpx.RequestError as exc:
        logger.error("active_listings request error: %s", exc)
    except Exception as exc:
        logger.exception("active_listings unexpected error: %s", exc)

    return None


async def _predict_price_fallback(
    make: str,
    model: str,
    year: Optional[int],
    trim: Optional[str] = None,
    miles: int = 50_000,
    car_type: str = "used",
) -> Optional[dict]:
    """
    Last-resort fallback — MarketCheck ML price prediction.
    Used when no active listings exist (e.g. very old or rare vehicles).
    """
    # ── rate limit ─────────────────────────────────────────────────────────────
    if not await _acquire_marketcheck_token("_predict_price_fallback"):
        return None

    url = f"{cfg.MARKETCHECK_BASE_URL}/predict/car/price"

    params: dict = {
        **_auth_params(),
        "make":     make,
        "model":    model,
        "year":     year,
        "miles":    miles,
        "car_type": car_type,
    }
    if trim:
        params["trim"] = trim

    logger.info(
        "🤖 [predict_fallback] No listings found — using ML estimate for %s %s %s trim=%s",
        year, make, model, trim or "N/A",
    )
    logger.info(
        "📤 [predict_fallback] Params: %s",
        {k: v for k, v in params.items() if k != "api_key"},
    )

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, params=params)

        if resp.status_code == 429:
            logger.error("MarketCheck rate limit hit (predict_fallback) — HTTP 429")
            return None

        resp.raise_for_status()
        data: dict = resp.json()

        logger.info("📥 [predict_fallback] Raw response: %s", data)

        predicted = _safe_float(
            data.get("price") or data.get("predicted_price") or data.get("mean")
        )
        low  = _safe_float(data.get("price_range_low")  or data.get("low_price")  or data.get("low"))
        high = _safe_float(data.get("price_range_high") or data.get("high_price") or data.get("high"))

        if not predicted:
            logger.warning("predict_fallback: no price in response for %s %s %s", year, make, model)
            return None

        # Build ±15% range as fallback when API doesn't return bounds
        if not (low and high):
            low  = round(predicted * 0.85, 2)
            high = round(predicted * 1.15, 2)
            logger.info("⚠️  [predict_fallback] No range from API — using ±15%% fallback")

        result = {
            "predicted_price":  predicted,
            "price_range":      {"low": low, "high": high},
            "listings_sampled": 0,
            "listings_found":   0,
            "source":           "ml_estimate",
        }

        logger.info("✅ [predict_fallback] Result: %s", result)
        return result

    except httpx.HTTPStatusError as exc:
        logger.error("predict_fallback HTTP %s: %s", exc.response.status_code, exc)
    except httpx.RequestError as exc:
        logger.error("predict_fallback request error: %s", exc)
    except Exception as exc:
        logger.exception("predict_fallback unexpected error: %s", exc)

    return None


async def get_market_average(
    make: str,
    model: str,
    year: Optional[int] = None,
    trim: Optional[str] = None,
    miles: int = 50_000,
) -> Optional[dict]:
    """
    Fetch real market average price using a progressive fallback chain.

    Fallback chain (stops at first success):
      Step 1 — Active listings: exact year + trim
      Step 2 — Active listings: exact year, no trim    (relax trim)
      Step 3 — Active listings: no year, no trim       (relax year — for old/rare cars)
      Step 4 — ML prediction fallback                  (last resort)

    Each step consumes one MarketCheck rate-limit token. If the limiter is
    exhausted before a step runs, that step returns None and the chain
    continues (or terminates gracefully).

    Returns:
        {
            "predicted_price":  float,
            "price_range":      {"low": float, "high": float},
            "listings_sampled": int,
            "listings_found":   int,
            "source":           "active_listings" | "ml_estimate"
        }
        or None if all steps fail.
    """
    if not (make and model):
        logger.warning("get_market_average: make/model required — make=%s model=%s", make, model)
        return None

    logger.info(
        "🚗 [get_market_average] Starting fallback chain → %s %s %s | trim=%s | miles=%s",
        year or "any", make, model, trim or "N/A", miles,
    )

    # ── Step 1: Active listings — exact year + trim ────────────────────────────
    if year and trim:
        result = await _fetch_active_listings(make, model, year=year, trim=trim)
        if result:
            logger.info("✅ [get_market_average] Step 1 succeeded (year+trim)")
            return result
        logger.info("⚠️  [get_market_average] Step 1 failed — relaxing trim")

    # ── Step 2: Active listings — exact year, no trim ──────────────────────────
    if year:
        result = await _fetch_active_listings(make, model, year=year, trim=None)
        if result:
            logger.info("✅ [get_market_average] Step 2 succeeded (year only)")
            return result
        logger.info("⚠️  [get_market_average] Step 2 failed — relaxing year")

    # ── Step 3: Active listings — no year, no trim (broadest search) ──────────
    result = await _fetch_active_listings(make, model, year=None, trim=None)
    if result:
        logger.info("✅ [get_market_average] Step 3 succeeded (make+model only)")
        return result
    logger.info("⚠️  [get_market_average] Step 3 failed — falling back to ML estimate")

    # ── Step 4: ML prediction fallback ────────────────────────────────────────
    result = await _predict_price_fallback(make, model, year=year, trim=trim, miles=miles)
    if result:
        logger.info("✅ [get_market_average] Step 4 succeeded (ML fallback)")
        return result

    logger.error(
        "❌ [get_market_average] All steps failed for %s %s %s — returning None",
        year, make, model,
    )
    return None


# ── backward compat alias ──────────────────────────────────────────────────────
predict_price = get_market_average