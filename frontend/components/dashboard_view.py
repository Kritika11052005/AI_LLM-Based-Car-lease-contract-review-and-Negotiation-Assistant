import streamlit as st
import pandas as pd
import plotly.graph_objects as go

from frontend.api import get_contract


# =========================================================
# UTILITIES
# =========================================================

def safe_number(value):
    try:
        if value is None:
            return None
        return float(value)
    except:
        return None


def format_currency(value):
    if value is None:
        return "N/A"
    return f"₹{value:,.0f}"


def format_percent(value):
    if value is None:
        return "N/A"
    return f"{value:.2f}%"


def get_score_color(score):
    if score is None:
        return "#64748b"
    if score >= 80:
        return "#16a34a"
    elif score >= 60:
        return "#f59e0b"
    else:
        return "#dc2626"


def get_score_label(score):
    if score is None:
        return "Unknown"
    if score >= 85:
        return "Excellent Deal"
    elif score >= 70:
        return "Good Deal"
    elif score >= 50:
        return "Average Deal"
    else:
        return "Poor Deal"


# =========================================================
# EXECUTIVE HEADER
# =========================================================

def render_vehicle_header(contract):

    vehicle = contract.get("vehicle") or {}
    vin = contract.get("vin")

    make = vehicle.get("make")
    model = vehicle.get("model")
    year = vehicle.get("year")

    st.markdown("## 🚘 Vehicle Overview")

    col1, col2 = st.columns([3, 1])

    with col1:
        st.markdown(f"### {year or ''} {make or ''} {model or ''}")
        if vin:
            st.caption(f"VIN: {vin}")

    with col2:
        st.markdown(
            """
            <div class="status-pill success-pill">
                Analysis Complete
            </div>
            """,
            unsafe_allow_html=True
        )


# =========================================================
# EXECUTIVE SUMMARY CARD
# =========================================================

def render_executive_summary(score, dealer_price, market_avg):

    st.markdown("## 🧠 Executive Summary")

    label = get_score_label(score)
    color = get_score_color(score)

    diff = None
    percent = None

    if dealer_price and market_avg:
        diff = dealer_price - market_avg
        percent = (diff / market_avg) * 100

    st.markdown(
        f"""
        <div class="summary-card">
            <div class="summary-score" style="color:{color}">
                {score if score else 'N/A'}/100
            </div>
            <div class="summary-text">
                <strong>{label}</strong><br>
                {'Overpriced by ' + str(round(percent,1)) + '%' if diff and diff > 0 else 'Underpriced compared to market'}
            </div>
        </div>
        """,
        unsafe_allow_html=True
    )


# =========================================================
# KPI SECTION
# =========================================================

def render_kpis(dealer_price, market_avg, score):

    st.markdown("## 📊 Financial Metrics")

    diff = None
    percent = None

    if dealer_price and market_avg:
        diff = dealer_price - market_avg
        percent = (diff / market_avg) * 100

    col1, col2, col3, col4 = st.columns(4)

    col1.metric("Dealer Price", format_currency(dealer_price))
    col2.metric("Market Average", format_currency(market_avg))

    if diff is not None:
        col3.metric("Difference", format_currency(diff), f"{percent:.1f}%")
    else:
        col3.metric("Difference", "N/A")

    col4.metric("Fairness Score", f"{score}/100" if score else "N/A")


# =========================================================
# PRICE POSITION METER
# =========================================================

def render_price_position(dealer_price, market_avg):

    if dealer_price is None or market_avg is None:
        return

    percent = (dealer_price / market_avg) * 100

    fig = go.Figure(go.Indicator(
        mode="gauge",
        value=percent,
        gauge={
            'axis': {'range': [50, 150]},
            'bar': {'color': "#3b82f6"},
        }
    ))

    fig.update_layout(height=250)
    st.plotly_chart(fig, use_container_width=True)


# =========================================================
# FAIRNESS BREAKDOWN
# =========================================================

def render_score_breakdown(fairness):

    breakdown = fairness.get("score_breakdown")
    if not breakdown:
        return

    st.markdown("## 📈 Score Breakdown")

    df = pd.DataFrame({
        "Component": ["Price", "APR", "Fees", "Term"],
        "Score": [
            breakdown.get("price_score"),
            breakdown.get("apr_score"),
            breakdown.get("fees_score"),
            breakdown.get("term_score")
        ]
    })

    fig = go.Figure(go.Bar(
        x=df["Score"],
        y=df["Component"],
        orientation="h",
        marker_color="#3b82f6",
        text=[f"{s}/100" for s in df["Score"]],
        textposition="inside"
    ))

    fig.update_layout(height=300, xaxis=dict(range=[0, 100]))
    st.plotly_chart(fig, use_container_width=True)


# =========================================================
# NEGOTIATION PANEL
# =========================================================

def render_negotiation_panel(fairness):

    st.markdown("## 🤝 Negotiation Strategy")

    action = fairness.get("recommended_action")
    power = fairness.get("negotiation_power")

    col1, col2 = st.columns(2)

    col1.metric("Negotiation Power", power)
    col2.metric("Primary Focus", action)


# =========================================================
# SLA SECTION
# =========================================================

def render_sla_section(sla):

    st.markdown("## 📄 Lease Terms")

    col1, col2, col3, col4 = st.columns(4)

    col1.metric("APR", format_percent(safe_number(sla.get("apr"))))
    col2.metric("Lease Term", f"{sla.get('lease_term_months')} months" if sla.get("lease_term_months") else "N/A")
    col3.metric("Monthly Payment", format_currency(safe_number(sla.get("monthly_payment"))))
    col4.metric("Down Payment", format_currency(safe_number(sla.get("down_payment"))))

    col5, col6, col7, col8 = st.columns(4)

    col5.metric("Residual Value", format_currency(safe_number(sla.get("residual_value"))))
    col6.metric("Purchase Option", format_currency(safe_number(sla.get("purchase_option"))))
    col7.metric("Late Fees", format_currency(safe_number(sla.get("late_fees"))))
    col8.metric("Mileage", f"{sla.get('mileage_allowance'):,} km" if sla.get("mileage_allowance") else "N/A")

    if sla.get("early_termination_clause"):
        st.markdown("### Early Termination Clause")
        st.info(sla.get("early_termination_clause"))


# =========================================================
# MAIN DASHBOARD
# =========================================================

def render_dashboard(contract_id):

    contract = get_contract(contract_id)
    if not contract:
        st.error("Failed to load contract")
        return

    sla = contract.get("sla") or {}
    market = contract.get("market_price") or {}
    fairness = contract.get("fairness") or {}

    dealer_price = safe_number(contract.get("dealer_price"))
    market_avg = safe_number(market.get("fair_market_value"))
    score = safe_number(fairness.get("fairness_score"))

    render_vehicle_header(contract)
    st.divider()

    render_executive_summary(score, dealer_price, market_avg)
    st.divider()

    render_kpis(dealer_price, market_avg, score)
    st.divider()

    render_price_position(dealer_price, market_avg)
    st.divider()

    render_score_breakdown(fairness)
    st.divider()

    render_negotiation_panel(fairness)
    st.divider()

    render_sla_section(sla)

    with st.expander("Debug Data"):
        st.json(contract)