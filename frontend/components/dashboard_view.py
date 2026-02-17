import streamlit as st
import pandas as pd
import plotly.graph_objects as go

from frontend.api import get_contract


# ---------------- SAFE NUMBER ----------------

def safe_number(value, default=None):
    try:
        if value is None:
            return default
        return float(value)
    except:
        return default


# ---------------- DASHBOARD ----------------

def render_dashboard(contract_id: int):

    contract = get_contract(contract_id)

    if not contract:
        st.error("Failed to load contract data")
        return

    # =========================
    # SAFE EXTRACTION
    # =========================

    sla = contract.get("sla") or {}
    market_price = contract.get("market_price") or {}
    fairness = contract.get("fairness") or {}

    contract_price = safe_number(
        sla.get("purchase_option")
        or sla.get("residual_value")
        or sla.get("monthly_payment")
    )

    market_avg = safe_number(
        market_price.get("fair_market_value")
    )

    price_low = safe_number(
        market_price.get("price_range_low")
    )

    price_high = safe_number(
        market_price.get("price_range_high")
    )

    fairness_score = fairness.get("fairness_score")
    rating = fairness.get("rating")
    explanation = fairness.get("explanation")
    negotiation_power = fairness.get("negotiation_power")
    action = fairness.get("recommended_action")

    # Detect fallback fairness (old incorrect data)
    is_fallback = (
        fairness_score == 50 and
        rating in ("Unknown", None) and
        negotiation_power in ("Unknown", None)
    )

    if is_fallback:
        st.warning("Fairness score appears to be fallback. Refresh contract or re-analyze.")

    diff = None
    if contract_price is not None and market_avg is not None:
        diff = contract_price - market_avg

    # =========================
    # HEADER METRICS
    # =========================

    st.markdown("## 📊 Contract Overview")

    col1, col2, col3, col4 = st.columns(4)

    col1.metric(
        "Contract Price",
        f"₹{contract_price:,.0f}" if contract_price else "N/A"
    )

    col2.metric(
        "Market Average",
        f"₹{market_avg:,.0f}" if market_avg else "N/A"
    )

    col3.metric(
        "Price Difference",
        f"₹{diff:,.0f}" if diff is not None else "N/A"
    )

    col4.metric(
        "Fairness Score",
        f"{fairness_score}/100" if fairness_score is not None else "N/A"
    )

    st.markdown("---")

    # =========================
    # MARKET PRICE CHART
    # =========================

    st.subheader("📈 Market Price Comparison")

    chart_data = {
        "Category": [
            "Contract Price",
            "Market Average",
            "Low Range",
            "High Range"
        ],
        "Price": [
            contract_price or 0,
            market_avg or 0,
            price_low or 0,
            price_high or 0
        ]
    }

    df = pd.DataFrame(chart_data)

    fig = go.Figure()

    fig.add_trace(
        go.Bar(
            x=df["Category"],
            y=df["Price"],
            text=[
                f"₹{v:,.0f}" if v else "N/A"
                for v in df["Price"]
            ],
            textposition="outside"
        )
    )

    fig.update_layout(
        height=400,
        margin=dict(l=20, r=20, t=40, b=20)
    )

    st.plotly_chart(fig, use_container_width=True)

    # =========================
    # FAIRNESS ANALYSIS SECTION
    # =========================

    st.markdown("---")

    st.subheader("🧠 Contract Fairness Analysis")

    col1, col2 = st.columns(2)

    col1.metric(
        "Fairness Score",
        f"{fairness_score}/100" if fairness_score is not None else "N/A"
    )

    col2.metric(
        "Rating",
        rating if rating else "Unknown"
    )

    if explanation:
        st.info(explanation)

    if negotiation_power:
        st.warning(f"Negotiation Power: {negotiation_power}")

    if action:
        st.success(f"Recommended Action: {action}")

    # =========================
    # DEBUG PANEL
    # =========================

    with st.expander("🔍 Debug Data"):
        st.json(contract)