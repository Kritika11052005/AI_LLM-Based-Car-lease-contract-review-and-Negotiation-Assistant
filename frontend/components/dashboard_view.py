import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from frontend.api import get_contract


# =========================
# UTILITIES
# =========================

def safe_number(v):
    try:
        return float(v)
    except:
        return None


def format_currency(v):
    if v is None:
        return "N/A"
    return f"₹{v:,.0f}"


def format_percent(v):
    if v is None:
        return "N/A"
    return f"{v:.2f}%"
import time

# =========================
# KPI STRIP (TYPE SAFE)
# =========================

def render_kpi_strip(dealer_price, market_avg, score):

    col1, col2, col3 = st.columns(3)

    def animated_kpi(title, value, metric_type="currency", color="#0f172a"):

        container = st.empty()

        if isinstance(value, (int, float)):

            display_val = 0
            step = value / 20 if value != 0 else 1

            for _ in range(20):
                display_val += step

                if metric_type == "currency":
                    formatted = f"₹{int(display_val):,}"
                elif metric_type == "score":
                    formatted = f"{int(display_val)}/100"
                else:
                    formatted = str(int(display_val))

                container.markdown(f"""
                <div class="kpi-card">
                    <div class="kpi-label">{title}</div>
                    <div class="kpi-value" style="color:{color};">
                        {formatted}
                    </div>
                </div>
                """, unsafe_allow_html=True)

                time.sleep(0.01)

        else:
            container.markdown(f"""
            <div class="kpi-card">
                <div class="kpi-label">{title}</div>
                <div class="kpi-value">{value}</div>
            </div>
            """, unsafe_allow_html=True)

    with col1:
        animated_kpi("Total Contract Price", dealer_price, "currency")

    with col2:
        animated_kpi("Fair Market Value", market_avg, "currency")

    with col3:
        if score is not None:
            score_color = "#16a34a" if score >= 70 else "#dc2626"
            animated_kpi("Fairness Score", score, "score", score_color)
        else:
            animated_kpi("Fairness Score", "N/A", "text")
# =========================
# DEALER VS MARKET (FINANCE STYLE)
# =========================

def render_market_comparison(dealer_price, market_avg):

    diff = dealer_price - market_avg
    percent = (diff / market_avg) * 100

    fig = go.Figure()

    fig.add_trace(go.Bar(
        y=["Dealer Price"],
        x=[dealer_price],
        orientation="h",
        marker=dict(color="#1e40af"),hovertemplate="<b>₹%{x:,.0f}</b><br><span style='color:#64748b;'>ContractClarity Benchmark</span><extra></extra>"
    ))

    fig.add_trace(go.Bar(
        y=["Market Average"],
        x=[market_avg],
        orientation="h",
        marker=dict(color="#16a34a"),hovertemplate="<b>₹%{x:,.0f}</b><br><span style='color:#64748b;'>ContractClarity Benchmark</span><extra></extra>"
    ))

    fig.update_layout(
        height=260,
        showlegend=False,
        margin=dict(l=80, r=40, t=20, b=20),
        xaxis=dict(
            showgrid=True,
            gridcolor="#e5e7eb",
            zeroline=False
        ),
        plot_bgcolor="white",
        paper_bgcolor="white",
        bargap=0.5
    )

    st.markdown("### Dealer vs Market Comparison")

    st.plotly_chart(fig, use_container_width=True)

    # Delta Annotation
    color = "#dc2626" if diff > 0 else "#16a34a"

    st.markdown(
        f"""
        <div style="
            margin-top:10px;
            font-size:14px;
            color:#64748b;
        ">
            Dealer pricing is 
            <span style="color:{color}; font-weight:600;">
                {abs(percent):.2f}% {'above' if diff > 0 else 'below'}
            </span>
            market benchmark.
        </div>
        """,
        unsafe_allow_html=True
    )

# =========================
# MARKET POSITION INDICATOR
# =========================

def render_market_position(dealer_price, market_avg):

    if not dealer_price or not market_avg:
        return

    diff = dealer_price - market_avg
    percent = (diff / market_avg) * 100

    color = "#dc2626" if diff > 0 else "#16a34a"

    st.markdown("### 📉 Market Positioning")

    st.markdown(
        f"""
        <div style="
            padding:18px;
            border-radius:12px;
            background:#f8fafc;
        ">
            <div style="font-size:14px; color:#64748b;">
                Deviation from Market
            </div>
            <div style="font-size:32px; font-weight:700; color:{color};">
                {percent:.2f}%
            </div>
        </div>
        """,
        unsafe_allow_html=True
    )


# =========================
# FINANCIAL IMPACT (REFINED EXECUTIVE STYLE)
# =========================

def render_financial_impact(dealer_price, market_avg):

    if not dealer_price or not market_avg:
        return

    difference = dealer_price - market_avg

    if difference > 0:
        status = "Over Market"
        color = "#dc2626"
    elif difference < 0:
        status = "Below Market"
        color = "#16a34a"
    else:
        status = "At Market"
        color = "#f59e0b"

    st.markdown("<div class='enterprise-card'>", unsafe_allow_html=True)
    st.markdown("### Financial Impact")

    st.markdown(
        f"""
        <div style="
            padding:28px;
            background:#ffffff;
            border-radius:14px;
            border:1px solid #e5e7eb;
        ">
            <div style="font-size:12px; color:#64748b; text-transform:uppercase;">
                Pricing Exposure
            </div>
            <div style="font-size:36px; font-weight:600; margin-top:8px; color:{color};">
                {format_currency(abs(difference))}
            </div>
            <div style="margin-top:10px; font-size:14px; color:#64748b;">
                Current contract is <strong>{status}</strong> relative to fair market value.
            </div>
        </div>
        """,
        unsafe_allow_html=True
    )

    st.markdown("</div>", unsafe_allow_html=True)

# =========================
# SCORE BREAKDOWN (ANALYTICAL STYLE)
# =========================

def render_score_breakdown(fairness):

    breakdown = fairness.get("score_breakdown")
    if not breakdown:
        return

    st.markdown("<div class='enterprise-card'>", unsafe_allow_html=True)
    st.markdown("### Fairness Score Breakdown")

    items = {
        "Price Score": breakdown.get("price_score"),
        "APR Score": breakdown.get("apr_score"),
        "Fees Score": breakdown.get("fees_score"),
        "Term Score": breakdown.get("term_score")
    }

    for label, value in items.items():
        if value is not None:

            color = "#16a34a" if value >= 70 else "#dc2626" if value < 50 else "#f59e0b"

            st.markdown(
                f"""
                <div style="
                    display:flex;
                    justify-content:space-between;
                    padding:14px 0;
                    border-bottom:1px solid #e5e7eb;
                ">
                    <div style="font-size:14px; color:#475569;">
                        {label}
                    </div>
                    <div style="font-weight:600; color:{color};">
                        {value}/100
                    </div>
                </div>
                """,
                unsafe_allow_html=True
            )

    st.markdown("</div>", unsafe_allow_html=True)



# =========================
# RISK CLASSIFICATION (EXECUTIVE BADGE)
# =========================

def render_risk_badge(score):

    if score is None:
        return

    st.markdown("<div class='enterprise-card'>", unsafe_allow_html=True)
    st.markdown("### Risk Classification")

    if score < 50:
        label = "High Risk Structure"
        badge_class = "badge-danger"
    elif score < 70:
        label = "Moderate Risk"
        badge_class = "badge-warning"
    else:
        label = "Healthy Structure"
        badge_class = "badge-success"

    st.markdown(
        f"""
        <div style="margin-top:10px;">
            <span class="score-badge {badge_class}">
                {label}
            </span>
        </div>
        """,
        unsafe_allow_html=True
    )

    st.markdown("</div>", unsafe_allow_html=True)
# =========================
# CONTRACT EXPOSURE INDEX (EXPLAINED)
# =========================

def render_contract_exposure(score):

    if score is None:
        return

    exposure = 100 - score

    st.markdown("<div class='enterprise-card'>", unsafe_allow_html=True)
    st.markdown("### Contract Exposure Index")

    fig = go.Figure(go.Indicator(
        mode="gauge+number",
        value=exposure,
        number={'font': {'size': 32}},
        gauge={
            'axis': {'range': [0, 100]},
            'bar': {'color': "#dc2626" if exposure > 50 else "#16a34a"},
            'steps': [
                {'range': [0, 40], 'color': "#dcfce7"},
                {'range': [40, 70], 'color': "#fef3c7"},
                {'range': [70, 100], 'color': "#fee2e2"}
            ]
        }
    ))

    fig.update_layout(
        height=260,
        margin=dict(l=30, r=30, t=10, b=10),
        paper_bgcolor="white",
        plot_bgcolor="white"
    )

    st.plotly_chart(fig, use_container_width=True)

    # Executive Explanation
    if exposure < 40:
        interpretation = "Low exposure — pricing and terms are aligned with market benchmarks."
        action = "Minimal negotiation pressure required."
    elif exposure < 70:
        interpretation = "Moderate exposure — certain financial components may be overpriced."
        action = "Targeted renegotiation recommended."
    else:
        interpretation = "High exposure — contract structure significantly deviates from fair benchmarks."
        action = "Strong renegotiation leverage advised."

    st.markdown(
        f"""
        <div style="
            margin-top:10px;
            padding:16px;
            background:#f8fafc;
            border-radius:10px;
            font-size:14px;
            color:#475569;
        ">
            <strong>What this means:</strong><br>
            The Contract Exposure Index represents your financial risk relative 
            to fair market conditions. Higher values indicate greater pricing 
            or structural imbalance.<br><br>
            <strong>Interpretation:</strong> {interpretation}<br>
            <strong>Recommended Action:</strong> {action}
        </div>
        """,
        unsafe_allow_html=True
    )

    st.markdown("</div>", unsafe_allow_html=True)
# =========================
# MAIN DASHBOARD
# =========================

def render_dashboard(contract_id):
    placeholder = st.empty()
    placeholder.markdown('<div class="shimmer" style="height:120px;"></div>', unsafe_allow_html=True)

    contract = get_contract(contract_id)

    placeholder.empty()

    if not contract:
        st.error("Failed to load contract")
        return

    market = contract.get("market_price") or {}
    fairness = contract.get("fairness") or {}

    dealer_price = safe_number(contract.get("dealer_price"))
    market_avg = safe_number(market.get("fair_market_value"))
    score = safe_number(fairness.get("fairness_score"))

    # ======================================================
    # 1. KPI STRIP (Executive Summary Metrics)
    # ======================================================

    render_kpi_strip(dealer_price, market_avg, score)

    # ======================================================
    # 2. MARKET COMPARISON CHART
    # ======================================================

    if dealer_price and market_avg:

        st.markdown("<div class='enterprise-card'>", unsafe_allow_html=True)
        st.markdown("### 📊 Dealer vs Market Comparison")

        render_market_comparison(dealer_price, market_avg)

        st.markdown("</div>", unsafe_allow_html=True)

    # ======================================================
    # 3. MARKET POSITION INDICATOR
    # ======================================================

    render_market_position(dealer_price, market_avg)

    # ======================================================
    # 4. FINANCIAL IMPACT
    # ======================================================

    render_financial_impact(dealer_price, market_avg)

    # ======================================================
    # 5. SCORE BREAKDOWN
    # ======================================================

    render_score_breakdown(fairness)

    # ======================================================
    # 6. RISK CLASSIFICATION
    # ======================================================

    render_risk_badge(score)
    render_contract_exposure(score)

    # ======================================================
    # 7. NEGOTIATION INSIGHT (Minimal, Clean)
    # ======================================================

    st.markdown("<div class='enterprise-card'>", unsafe_allow_html=True)
    st.markdown("### 🤝 Negotiation Insight")

    negotiation_power = fairness.get("negotiation_power", "N/A")

    st.markdown(
        f"""
        <div style="font-size:18px; font-weight:500;">
            Negotiation Power: <strong>{negotiation_power}</strong>
        </div>
        <div style="margin-top:8px; color:#64748b; font-size:14px;">
            Higher fairness scores generally indicate stronger leverage.
        </div>
        """,
        unsafe_allow_html=True
    )

    st.markdown("</div>", unsafe_allow_html=True)