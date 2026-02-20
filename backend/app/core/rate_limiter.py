"""
app/core/rate_limiter.py

Shared async rate limiting for all external API calls.

Provides:
  - RateLimiter       — token-bucket limiter per named API
  - RateLimitError    — raised when rate limit is exhausted and no retry available
  - rate_limited      — decorator for async functions
  - LIMITERS          — pre-configured instances for each service

Token-bucket algorithm:
  - Tokens refill at a fixed rate (tokens_per_second).
  - Each call consumes one token.
  - When no tokens remain the caller either waits (up to max_wait_seconds)
    or raises RateLimitError immediately.

Usage:
    from app.core.rate_limiter import LIMITERS, rate_limited

    # 1. Direct (async with):
    async with LIMITERS["marketcheck"]:
        resp = await client.get(url, params=params)

    # 2. Decorator:
    @rate_limited("gemini")
    async def call_gemini(...):
        ...

    # 3. Manual:
    await LIMITERS["exchangerate"].acquire()
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from functools import wraps
from typing import Callable, Optional

logger = logging.getLogger(__name__)


# ── exceptions ─────────────────────────────────────────────────────────────────

class RateLimitError(Exception):
    """Raised when the rate limiter cannot grant a token within the allowed wait window."""

    def __init__(self, api_name: str, retry_after: float):
        self.api_name    = api_name
        self.retry_after = retry_after
        super().__init__(
            f"Rate limit exceeded for '{api_name}'. "
            f"Retry after {retry_after:.1f}s."
        )


# ── core limiter ───────────────────────────────────────────────────────────────

@dataclass
class RateLimiter:
    """
    Async token-bucket rate limiter.

    Args:
        name:               Human-readable API name for logging.
        max_calls:          Max calls allowed per `period_seconds`.
        period_seconds:     Time window for `max_calls` (default 1.0 = per-second).
        max_wait_seconds:   How long to block waiting for a token (0 = never block).
        burst:              Extra tokens allowed above `max_calls` for brief bursts.
                            Set to 0 to disable bursting.
    """

    name:             str
    max_calls:        int
    period_seconds:   float = 1.0
    max_wait_seconds: float = 30.0
    burst:            int   = 0

    # internal state — initialised in __post_init__
    _tokens:     float         = field(init=False, repr=False, default=0.0)
    _last_refill: float        = field(init=False, repr=False, default=0.0)
    _lock:        asyncio.Lock = field(init=False, repr=False, default_factory=asyncio.Lock)

    def __post_init__(self) -> None:
        self._tokens      = float(self.max_calls + self.burst)
        self._last_refill = time.monotonic()

    # ── properties ─────────────────────────────────────────────────────────────

    @property
    def tokens_per_second(self) -> float:
        return self.max_calls / self.period_seconds

    @property
    def max_tokens(self) -> float:
        return float(self.max_calls + self.burst)

    # ── internal helpers ───────────────────────────────────────────────────────

    def _refill(self) -> None:
        """Add tokens proportional to elapsed time since last refill."""
        now     = time.monotonic()
        elapsed = now - self._last_refill
        added   = elapsed * self.tokens_per_second
        self._tokens      = min(self._tokens + added, self.max_tokens)
        self._last_refill = now

    def _seconds_until_token(self) -> float:
        """Seconds until the next token becomes available."""
        if self._tokens >= 1.0:
            return 0.0
        deficit = 1.0 - self._tokens
        return deficit / self.tokens_per_second

    # ── public interface ───────────────────────────────────────────────────────

    async def acquire(self) -> None:
        """
        Block until a token is available (or raise RateLimitError).

        Raises:
            RateLimitError: if the required wait exceeds `max_wait_seconds`.
        """
        async with self._lock:
            self._refill()
            wait_needed = self._seconds_until_token()

            if wait_needed > self.max_wait_seconds:
                logger.warning(
                    "⛔ [%s] Rate limit hit — need %.1fs but max_wait=%.1fs",
                    self.name, wait_needed, self.max_wait_seconds,
                )
                raise RateLimitError(api_name=self.name, retry_after=wait_needed)

            if wait_needed > 0:
                logger.info(
                    "⏳ [%s] Throttling — waiting %.2fs for token",
                    self.name, wait_needed,
                )
                await asyncio.sleep(wait_needed)
                self._refill()

            self._tokens -= 1.0
            logger.debug("🪙 [%s] Token consumed (%.1f remaining)", self.name, self._tokens)

    async def __aenter__(self) -> "RateLimiter":
        await self.acquire()
        return self

    async def __aexit__(self, *_) -> None:
        pass  # nothing to release in a token-bucket model

    # ── diagnostics ────────────────────────────────────────────────────────────

    @property
    def available_tokens(self) -> float:
        """Current token count (approximate, without lock)."""
        now     = time.monotonic()
        elapsed = now - self._last_refill
        return min(self._tokens + elapsed * self.tokens_per_second, self.max_tokens)

    def status(self) -> dict:
        return {
            "api":              self.name,
            "max_calls":        self.max_calls,
            "period_seconds":   self.period_seconds,
            "max_wait_seconds": self.max_wait_seconds,
            "available_tokens": round(self.available_tokens, 2),
            "tokens_per_second": round(self.tokens_per_second, 4),
        }


# ── decorator ──────────────────────────────────────────────────────────────────

def rate_limited(
    api_name: str,
    *,
    fallback_return=None,
    reraise: bool = False,
) -> Callable:
    """
    Decorator that applies the named rate limiter before calling the function.

    Args:
        api_name:        Key into `LIMITERS` dict.
        fallback_return: Value to return when rate-limited (default None).
        reraise:         If True, re-raise RateLimitError instead of returning fallback.

    Example:
        @rate_limited("marketcheck")
        async def decode_vin(vin: str) -> Optional[dict]:
            ...
    """
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        async def wrapper(*args, **kwargs):
            limiter = LIMITERS.get(api_name)
            if limiter is None:
                logger.warning("rate_limited: unknown API name '%s' — skipping limit", api_name)
                return await fn(*args, **kwargs)
            try:
                await limiter.acquire()
            except RateLimitError as exc:
                logger.error("🚫 rate_limited decorator: %s", exc)
                if reraise:
                    raise
                return fallback_return
            return await fn(*args, **kwargs)
        return wrapper
    return decorator


# ── per-service configuration ──────────────────────────────────────────────────
#
#  Tune these to match your actual API plan quotas.
#
#  MarketCheck free plan  : 100 req/day  → ~0.001 req/s.
#  MarketCheck basic plan : 1 000 req/day → ~0.012 req/s.
#  Gemini free tier       : 60 req/min   → 1 req/s.
#  Gemini paid tier       : 360 req/min  → 6 req/s.
#  ExchangeRate-API free  : 1 500/month  → effectively no burst limit here.
#
#  `max_wait_seconds` is how long we're willing to block a single request.
#  For user-facing endpoints keep this low (5-10 s); for background jobs raise it.

LIMITERS: dict[str, RateLimiter] = {
    # ── MarketCheck ─────────────────────────────────────────────────────────────
    # Basic plan: 1 000 req/day ≈ 0.012 req/s.
    # We allow up to 2 req/s in quick succession (burst=2) for UX smoothness,
    # but the long-run average stays within quota.
    "marketcheck": RateLimiter(
        name             = "MarketCheck",
        max_calls        = 1,          # sustained: 1 call/second
        period_seconds   = 1.0,
        max_wait_seconds = 10.0,       # block up to 10 s before giving up
        burst            = 2,          # allow a quick burst of 3 calls total
    ),

    # ── Gemini LLM ──────────────────────────────────────────────────────────────
    # Free tier: 60 req/min = 1 req/s.
    # Paid tier: up to 6 req/s — adjust `max_calls` accordingly.
    "gemini": RateLimiter(
        name             = "Gemini",
        max_calls        = 1,          # 1 req/s sustained (free tier)
        period_seconds   = 1.0,
        max_wait_seconds = 30.0,       # LLM calls are slow; wait up to 30 s
        burst            = 3,
    ),

    # ── Exchange Rate API ────────────────────────────────────────────────────────
    # We cache the result in memory, so this barely ever fires.
    # 1 500 req/month on free plan.
    "exchangerate": RateLimiter(
        name             = "ExchangeRate",
        max_calls        = 1,
        period_seconds   = 5.0,        # 1 call per 5 s is plenty
        max_wait_seconds = 10.0,
        burst            = 0,
    ),
}


# ── convenience helpers ────────────────────────────────────────────────────────

async def acquire_marketcheck() -> None:
    await LIMITERS["marketcheck"].acquire()

async def acquire_gemini() -> None:
    await LIMITERS["gemini"].acquire()

async def acquire_exchangerate() -> None:
    await LIMITERS["exchangerate"].acquire()


def get_limiter_status() -> list[dict]:
    """Return a snapshot of all limiter states (useful for /health endpoints)."""
    return [lim.status() for lim in LIMITERS.values()]