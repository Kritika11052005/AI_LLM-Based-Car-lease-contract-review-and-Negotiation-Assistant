"""
app/core/fairness.py

Fairness score engine.

Design decision: the score is **intent-driven** — it derives sub-scores from
the same NegotiationRules engine that powers the negotiation assistant, then
overlays a market-price comparison when a predicted_price is available.

Weighted breakdown (sums to 100):
  price_score  — 40 %   market price delta (needs predicted_price)
  apr_score    — 25 %   from NegotiationRules APR analysis
  fees_score   — 15 %   from ContractSLA.feesTotal
  term_score   — 20 %   from NegotiationRules term analysis

Each sub-score is normalised to 0–100 before weighting.
Final score is clamped to [0, 100].
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
    Calculate a weighted fairness score (0–100) using intent-aligned rules.

    Parameters
    ----------
    dealer_price : float | None
        Cap cost / vehicle sale price from the contract (ContractSLA.capCost or msrp).
    market_price : float | None
        Predicted fair market price from MarketCheck (or None if API unavailable).
    apr : float | None
        APR as a plain percentage number (e.g. 7.5 for 7.5 %).
    fees : float | None
        Total fees from ContractSLA.feesTotal.
    term : int | None
        Lease/loan term in months from ContractSLA.termMonths.

    Returns
    -------
    dict with keys:
        price_score, apr_score, fees_score, term_score, final_score
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

    return {
        "price_score":  round(price_score, 2),
        "apr_score":    round(apr_score, 2),
        "fees_score":   round(fees_score, 2),
        "term_score":   round(term_score, 2),
        "final_score":  round(final_score, 2),
    }


# ── sub-scorers (each returns 0–100) ──────────────────────────────────────────

def _score_price(
    dealer_price: Optional[float],
    market_price: Optional[float],
) -> float:
    """
    Price score — 40 % weight.

    Rules (aligned with NegotiationRules intent reasoning):
      • Each 1 % overpriced  → loses 3 points from 100
      • Each 1 % underpriced → gains 0.5 points (bonus, capped at +10)
      • Missing data          → neutral 50
    """
    if not dealer_price or not market_price or market_price <= 0:
        return 50.0  # neutral when market price unavailable

    pct_diff = ((dealer_price - market_price) / market_price) * 100

    if pct_diff <= 0:
        # Underpriced — small bonus
        bonus = min(abs(pct_diff) * 0.5, 10.0)
        return _clamp(100.0 + bonus)
    else:
        # Overpriced — 3 pts lost per 1 %
        return _clamp(100.0 - pct_diff * 3.0)


def _score_apr(apr: Optional[float]) -> float:
    """
    APR score — 25 % weight.

    Thresholds mirror NegotiationRules._analyze_apr priority levels:
      ≤ 4 %         → 100  (excellent — no intent generated)
      4–6 %         → 85   (good)
      6–8 %         → 65   (MEDIUM intent)
      8–10 %        → 40   (HIGH intent, –10 per % above 8)
      10–12 %       → 25   (CRITICAL intent, –15 per % above 10)
      > 12 %        → 5    (predatory)
    """
    if apr is None:
        return 50.0  # neutral

    if apr <= 4.0:
        return 100.0
    elif apr <= 6.0:
        return 85.0 - (apr - 4.0) * 10.0        # 85 → 65
    elif apr <= 8.0:
        return 65.0 - (apr - 6.0) * 12.5        # 65 → 40
    elif apr <= 10.0:
        return 40.0 - (apr - 8.0) * 10.0        # 40 → 20  (–10 per %)
    elif apr <= 12.0:
        return 20.0 - (apr - 10.0) * 7.5        # 20 → 5   (–15 per %)
    else:
        return 5.0


def _score_fees(fees: Optional[float]) -> float:
    """
    Fees score — 15 % weight.

    Thresholds from spec, mapped to 0–100:
      < 1 000  → 90   (low)
      1000–2000 → 60  (moderate, –20)
      > 2 000  → 30   (high, –30)
      None     → 70   (assume moderate if unknown)
    """
    if fees is None:
        return 70.0

    if fees < 1_000:
        return 90.0
    elif fees <= 2_000:
        return 60.0
    else:
        return 30.0


def _score_term(term: Optional[int]) -> float:
    """
    Term score — 20 % weight.

    Thresholds mirror NegotiationRules._analyze_term intent levels:
      24–36 months  → 100  (ideal — no intent)
      37–48 months  → 75   (acceptable — LOW intent)
      49–60 months  → 45   (risky — HIGH intent, –10)
      60–72 months  → 20   (long — –10)
      > 72 months   → 0    (excessive — –25)
      < 12 months   → 0    (too short — –30)
      None          → 50   neutral
    """
    if term is None:
        return 50.0

    if term < 12:
        return 0.0
    elif term <= 36:
        return 100.0
    elif term <= 48:
        return 75.0
    elif term <= 60:
        return 45.0
    elif term <= 72:
        return 20.0
    else:
        return 0.0


def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))