"""
app/core/fairness.py

Fairness score engine — aligned to product spec.

Weighted breakdown (sums to 100):
  price_score  — 40%   market price delta
  apr_score    — 25%   interest rate penalty
  fees_score   — 15%   total fees penalty
  term_score   — 20%   loan/lease term penalty

Each sub-score is normalised to 0–100 before weighting.
Final score is clamped to [0, 100].

Spec rules:
  Price : each 1% overpayment → -3 pts; underpaying → +0.5 pts/% (cap +10)
  APR   : ≤6% no major penalty; 6–8% → -5/%; 8–10% → -10/%; >10% → -15/%
  Fees  : <$1k → 90; $1–2k → 80; >$2k → 70; None → 75
  Term  : <12m → 70; 24–36m → 100; 37–48m → 90; 49–60m → 80; 60–72m → 90; >72m → 75
"""

from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)


# ── public entry point ─────────────────────────────────────────────────────────

def calculate_fairness_score(
    dealer_price: Optional[float],
    market_price: Optional[float],
    apr: Optional[float],
    fees: Optional[float],
    term: Optional[int],
) -> dict:
    """
    Calculate a weighted fairness score (0–100).

    Parameters
    ----------
    dealer_price : float | None
        Cap cost / vehicle sale price from the contract.
    market_price : float | None
        Real market average from active listings (or None if unavailable).
    apr : float | None
        APR as a plain percentage number (e.g. 7.5 for 7.5%).
    fees : float | None
        Total fees from ContractSLA.feesTotal.
    term : int | None
        Lease/loan term in months.

    Returns
    -------
    dict with keys: price_score, apr_score, fees_score, term_score, final_score
    """
    price_score = _score_price(dealer_price, market_price)
    apr_score   = _score_apr(apr)
    fees_score  = _score_fees(fees)
    term_score  = _score_term(term)

    final_score = _clamp(
        price_score * 0.40
        + apr_score  * 0.25
        + fees_score * 0.15
        + term_score * 0.20
    )

    logger.info(
        "📊 [fairness] price=%.1f (×0.40) | apr=%.1f (×0.25) | fees=%.1f (×0.15) | term=%.1f (×0.20) → final=%.1f",
        price_score, apr_score, fees_score, term_score, final_score,
    )

    return {
        "price_score": round(price_score, 2),
        "apr_score":   round(apr_score,   2),
        "fees_score":  round(fees_score,  2),
        "term_score":  round(term_score,  2),
        "final_score": round(final_score, 2),
    }


# ── sub-scorers (each returns 0–100) ──────────────────────────────────────────

def _score_price(
    dealer_price: Optional[float],
    market_price: Optional[float],
) -> float:
    """
    Price score — 40% weight.

    Rules:
      • Each 1% overpriced  → -3 pts from 100
      • Each 1% underpriced → +0.5 pts (capped at +10)
      • Missing data         → neutral 50
    """
    if not dealer_price or not market_price or market_price <= 0:
        logger.info("💰 [price_score] Missing data → neutral 50")
        return 50.0

    pct_diff = ((dealer_price - market_price) / market_price) * 100

    if pct_diff <= 0:
        # Underpriced — small bonus
        bonus = min(abs(pct_diff) * 0.5, 10.0)
        score = _clamp(100.0 + bonus)
        logger.info(
            "💰 [price_score] dealer=%.2f market=%.2f → %.1f%% underpriced → bonus=%.1f → score=%.1f",
            dealer_price, market_price, abs(pct_diff), bonus, score,
        )
    else:
        # Overpriced — 3 pts lost per 1%
        score = _clamp(100.0 - pct_diff * 3.0)
        logger.info(
            "💰 [price_score] dealer=%.2f market=%.2f → %.1f%% overpriced → score=%.1f",
            dealer_price, market_price, pct_diff, score,
        )

    return score


def _score_apr(apr: Optional[float]) -> float:
    """
    APR score — 25% weight.

    Spec rules (deductions from 100):
      ≤ 4%    → 100  (excellent)
      4–6%    → -5 pts per % above 4  (100 → 90)
      6–8%    → -5 pts per % above 6  (90 → 80)
      8–10%   → -10 pts per % above 8  (80 → 60)
      > 10%   → -15 pts per % above 10 (60 → 0)
      None    → neutral 50
    """
    if apr is None:
        logger.info("📈 [apr_score] No APR → neutral 50")
        return 50.0

    if apr <= 4.0:
        score = 100.0
    elif apr <= 6.0:
        score = _clamp(100.0 - (apr - 4.0) * 5.0)   # 100 → 90
    elif apr <= 8.0:
        score = _clamp(90.0  - (apr - 6.0) * 5.0)   # 90 → 80
    elif apr <= 10.0:
        score = _clamp(80.0  - (apr - 8.0) * 10.0)  # 80 → 60
    else:
        score = _clamp(60.0  - (apr - 10.0) * 15.0) # 60 → 0

    logger.info("📈 [apr_score] APR=%.2f%% → score=%.1f", apr, score)
    return score


def _score_fees(fees: Optional[float]) -> float:
    """
    Fees score — 15% weight.

    Spec rules (deductions from 100):
      < $1,000    → -10 → 90
      $1–2k       → -20 → 80
      > $2,000    → -30 → 70
      None        → neutral 75
    """
    if fees is None:
        logger.info("💸 [fees_score] No fees data → neutral 75")
        return 75.0

    if fees < 1_000:
        score = 90.0
    elif fees <= 2_000:
        score = 80.0
    else:
        score = 70.0

    logger.info("💸 [fees_score] fees=%.2f → score=%.1f", fees, score)
    return score


def _score_term(term: Optional[int]) -> float:
    """
    Term score — 20% weight.

    Spec rules (deductions from 100):
      < 12 months  → -30 → 70   (too short)
      12–24 months → 90         (short but acceptable)
      24–36 months → 100        (ideal)
      37–48 months → 90         (acceptable)
      49–60 months → 80         (slight risk)
      60–72 months → -10 → 90  (spec says -10, mapped to 90)
      > 72 months  → -25 → 75  (spec says -25)
      None         → neutral 50
    """
    if term is None:
        logger.info("📅 [term_score] No term data → neutral 50")
        return 50.0

    if term < 12:
        score = 70.0    # -30 per spec
    elif term <= 24:
        score = 90.0    # short but workable
    elif term <= 36:
        score = 100.0   # ideal
    elif term <= 48:
        score = 90.0    # acceptable
    elif term <= 60:
        score = 80.0    # slight risk
    elif term <= 72:
        score = 90.0    # -10 per spec
    else:
        score = 75.0    # -25 per spec

    logger.info("📅 [term_score] term=%d months → score=%.1f", term, score)
    return score


# ── utility ────────────────────────────────────────────────────────────────────

def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))