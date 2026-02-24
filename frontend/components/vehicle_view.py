import streamlit as st
import requests
import plotly.graph_objects as go

BACKEND_URL = "http://127.0.0.1:8000"


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


# =========================
# VEHICLE HEADER (REFINED)
# =========================

def render_vehicle_header(vehicle, vin):

    st.markdown("## Vehicle & VIN Overview")

    col1, col2 = st.columns([1.5, 1])

    with col1:
        st.markdown(
            f"""
            <div style="
                padding:24px;
                border-radius:14px;
                background:#ffffff;
                border:1px solid #e5e7eb;
            ">
                <div style="font-size:12px; color:#64748b; text-transform:uppercase;">
                    Vehicle Identification
                </div>
                <div style="font-size:26px; font-weight:600; margin-top:8px;">
                    {vehicle.get('year','')} {vehicle.get('make','')} {vehicle.get('model','')}
                </div>
                <div style="margin-top:14px; font-size:12px; color:#64748b;">
                    VIN
                </div>
                <div style="font-family:monospace; font-size:14px;">
                    {vin or 'N/A'}
                </div>
            </div>
            """,
            unsafe_allow_html=True
        )

    with col2:
        st.markdown(
            f"""
            <div style="
                padding:24px;
                border-radius:14px;
                background:#ffffff;
                border:1px solid #e5e7eb;
            ">
                <div style="font-size:12px; color:#64748b; text-transform:uppercase;">
                    Manufacturing Details
                </div>
                <div style="margin-top:12px; font-size:14px; line-height:1.7;">
                    <strong>Fuel Type:</strong> {vehicle.get('fuel_type','N/A')}<br>
                    <strong>Body Class:</strong> {vehicle.get('body_class','N/A')}<br>
                    <strong>Plant Country:</strong> {vehicle.get('plant_country','N/A')}
                </div>
            </div>
            """,
            unsafe_allow_html=True
        )

    st.markdown("<div style='height:28px;'></div>", unsafe_allow_html=True)
# =========================
# SLA FINANCIAL KPIs (REFINED)
# =========================

def render_sla_financials(sla):

    st.markdown("## Lease Financial Structure")

    col1, col2, col3, col4 = st.columns(4)

    def financial_kpi(title, value):
        st.markdown(
            f"""
            <div style="
                padding:20px;
                border-radius:12px;
                background:#ffffff;
                border:1px solid #e5e7eb;
            ">
                <div style="font-size:12px; color:#64748b; text-transform:uppercase;">
                    {title}
                </div>
                <div style="font-size:22px; font-weight:600; margin-top:8px;">
                    {value}
                </div>
            </div>
            """,
            unsafe_allow_html=True
        )

    with col1:
        financial_kpi("Monthly Payment",
                      format_currency(safe_number(sla.get("monthly_payment"))))

    with col2:
        financial_kpi("Down Payment",
                      format_currency(safe_number(sla.get("down_payment"))))

    with col3:
        financial_kpi("Residual Value",
                      format_currency(safe_number(sla.get("residual_value"))))

    with col4:
        financial_kpi("Purchase Option",
                      format_currency(safe_number(sla.get("purchase_option"))))

    st.markdown("<div style='height:32px;'></div>", unsafe_allow_html=True)
# =========================
# STRUCTURED LEASE TERMS
# =========================

def render_sla_terms(sla):

    st.markdown("## 📑 Lease Terms & Conditions")

    apr = safe_number(sla.get("apr"))
    term = sla.get("lease_term_months")
    mileage = sla.get("mileage_allowance")
    late_fees = safe_number(sla.get("late_fees"))

    if apr is None:
        apr_color = "#111827"
    elif apr > 8:
        apr_color = "#dc2626"
    elif apr > 5:
        apr_color = "#f59e0b"
    else:
        apr_color = "#16a34a"

    col1, col2, col3, col4 = st.columns(4)

    def term_block(title, value, color="#111827"):
        st.markdown(
            f"""
            <div style="
                padding:18px;
                border-radius:14px;
                background:#f8fafc;
                border:1px solid #e5e7eb;
            ">
                <div style="font-size:12px; color:#64748b;">
                    {title}
                </div>
                <div style="font-size:20px; font-weight:600; margin-top:6px; color:{color};">
                    {value}
                </div>
            </div>
            """,
            unsafe_allow_html=True
        )

    with col1:
        term_block("APR", format_percent(apr), apr_color)

    with col2:
        term_block("Lease Term", f"{term} months" if term else "N/A")

    with col3:
        term_block("Mileage Allowance",
                   f"{mileage:,} km" if mileage else "N/A")

    with col4:
        term_block("Late Fees",
                   format_currency(late_fees))

    st.markdown("---")


# =========================
# RISK ANALYSIS
# =========================

def render_risk_analysis(sla):

    issues = []
    high = 0
    medium = 0

    apr = safe_number(sla.get("apr"))
    late_fees = safe_number(sla.get("late_fees"))
    term = safe_number(sla.get("lease_term_months"))
    monthly = safe_number(sla.get("monthly_payment"))

    if apr and apr > 8:
        issues.append(("High APR Exposure", "High"))
        high += 1

    if late_fees and late_fees > 2000:
        issues.append(("Excessive Late Fee Structure", "High"))
        high += 1

    if term and term > 60:
        issues.append(("Extended Lease Duration", "Medium"))
        medium += 1

    if monthly and monthly > 50000:
        issues.append(("Elevated Monthly Payment", "Medium"))
        medium += 1

    risk_score = max(0, 100 - (high * 25 + medium * 15))

    st.markdown("## 🚨 Lease Risk Assessment")

    col1, col2 = st.columns([1, 2])

    with col1:
        fig = go.Figure(go.Indicator(
            mode="gauge+number",
            value=risk_score,
            number={'font': {'size': 28}},
            gauge={
                'axis': {'range': [0, 100]},
                'bar': {'color': "#dc2626" if risk_score < 60 else "#16a34a"},
                'steps': [
                    {'range': [0, 50], 'color': "#fee2e2"},
                    {'range': [50, 75], 'color': "#fef3c7"},
                    {'range': [75, 100], 'color': "#dcfce7"}
                ]
            }
        ))
        fig.update_layout(height=250)
        st.plotly_chart(fig, use_container_width=True)

    with col2:
        if not issues:
            st.markdown(
            """
            <div style="
                padding:18px;
                background:#ecfdf5;
                border-left:4px solid #16a34a;
                border-radius:8px;
                font-size:14px;
            ">
                No significant financial risk indicators detected.
            </div>
            """,
            unsafe_allow_html=True
        )
        else:
            for issue, level in issues:
                color = "#dc2626" if level == "High" else "#f59e0b"
                st.markdown(
                f"""
                <div style="
                    padding:14px;
                    margin-bottom:10px;
                    border-radius:8px;
                    background:#ffffff;
                    border:1px solid #e5e7eb;
                    border-left:4px solid {color};
                    font-size:14px;
                ">
                    <strong>{issue}</strong><br>
                    Severity: {level}
                </div>
                """,
                unsafe_allow_html=True
            )

    st.markdown("---")

    return risk_score, issues


# =========================
# EXECUTIVE SUMMARY
# =========================

def render_executive_summary(risk_score, issues):

    st.markdown("## Executive Lease Summary")

    if issues:
        summary_text = (
            f"This lease structure presents {len(issues)} financial risk indicator(s). "
            f"Overall risk score: {risk_score}/100. "
            "Primary exposure relates to financing structure and cost alignment."
        )
    else:
        summary_text = (
            "This lease structure shows no material financial risk indicators. "
            "The agreement appears commercially balanced."
        )

    st.markdown(
        f"""
        <div style="
            padding:22px;
            background:#ffffff;
            border-radius:12px;
            border:1px solid #e5e7eb;
            font-size:14px;
            line-height:1.7;
        ">
            {summary_text}
        </div>
        """,
        unsafe_allow_html=True
    )

    st.markdown("<div style='height:28px;'></div>", unsafe_allow_html=True)
# =========================
# ACTION PLAN
# =========================

def render_action_plan(issues):

    st.markdown("## 🎯 Strategic Action Plan")

    if issues:
        recommendations = [
            "Renegotiate APR terms",
            "Request reduction or cap on late fees",
            "Evaluate lease duration flexibility",
            "Benchmark monthly payment against alternatives"
        ]
    else:
        recommendations = [
            "Maintain negotiation leverage",
            "Confirm service and warranty coverage",
            "Validate recall-free vehicle status"
        ]

    for rec in recommendations:
        st.markdown(f"- {rec}")

    st.markdown("---")


# =========================
# RECALL STATUS
# =========================

def render_recall_status(recalls):

    st.markdown("## 🔧 Recall Status")

    if recalls and recalls.get("error") != "False":
        st.warning("Recall information currently unavailable.")
    else:
        st.success("No active recalls found.")

    st.markdown("---")

# =========================
# LEASE CAPITAL EFFICIENCY
# =========================

def render_capital_efficiency(sla, vehicle):

    monthly = safe_number(sla.get("monthly_payment"))
    term = safe_number(sla.get("lease_term_months"))
    residual = safe_number(sla.get("residual_value"))

    if not monthly or not term:
        return

    total_paid = monthly * term
    asset_value = residual if residual else total_paid
    efficiency_ratio = total_paid / asset_value if asset_value else 0

    st.markdown("## Capital Efficiency Analysis")

    if efficiency_ratio < 1:
        status = "Efficient Structure"
        color = "#16a34a"
    elif efficiency_ratio < 1.3:
        status = "Moderate Capital Drag"
        color = "#f59e0b"
    else:
        status = "High Capital Exposure"
        color = "#dc2626"

    html = f"""
<div style="padding:22px;border-radius:12px;background:#ffffff;border:1px solid #e5e7eb;">
<div style="font-size:12px;color:#64748b;text-transform:uppercase;">
Total Lease Outflow
</div>

<div style="font-size:24px;font-weight:600;margin-top:6px;">
₹{total_paid:,.0f}
</div>

<div style="margin-top:16px;font-size:12px;color:#64748b;">
Efficiency Ratio
</div>

<div style="font-size:22px;font-weight:600;color:{color};">
{efficiency_ratio:.2f}x
</div>

<div style="margin-top:10px;font-size:14px;">
{status}
</div>
</div>
"""

    st.markdown(html, unsafe_allow_html=True)
    st.markdown("<div style='height:32px;'></div>", unsafe_allow_html=True)
# =========================
# FINANCING BURDEN INDEX
# =========================

def render_financing_burden(sla):

    apr = safe_number(sla.get("apr"))
    monthly = safe_number(sla.get("monthly_payment"))

    if not apr or not monthly:
        return

    st.markdown("## Financing Sensitivity")

    if apr > 8:
        insight = "APR is materially above typical automotive financing benchmarks."
        color = "#dc2626"
    elif apr > 5:
        insight = "APR is moderately elevated."
        color = "#f59e0b"
    else:
        insight = "APR is within competitive financing range."
        color = "#16a34a"

    st.markdown(f"""
    <div style="
        padding:20px;
        border-radius:12px;
        background:#ffffff;
        border:1px solid #e5e7eb;
    ">
        <div style="font-size:14px;">
            <strong>APR:</strong> {apr:.2f}% 
        </div>
        <div style="margin-top:10px; color:{color}; font-size:14px;">
            {insight}
        </div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("<div style='height:32px;'></div>", unsafe_allow_html=True)

# =========================
# COST STRUCTURE BREAKDOWN
# =========================

def render_cost_structure(sla):

    monthly = safe_number(sla.get("monthly_payment"))
    down = safe_number(sla.get("down_payment"))
    residual = safe_number(sla.get("residual_value"))

    if not monthly:
        return

    components = {
        "Monthly Payment": monthly,
        "Down Payment": down or 0,
        "Residual Value": residual or 0
    }

    fig = go.Figure()

    for k, v in components.items():
        fig.add_trace(go.Bar(
            x=[k],
            y=[v]
        ))

    fig.update_layout(
        height=320,
        paper_bgcolor="white",
        plot_bgcolor="white",
        showlegend=False
    )

    st.markdown("## Cost Concentration Overview")
    st.plotly_chart(fig, use_container_width=True)

    st.markdown("<div style='height:32px;'></div>", unsafe_allow_html=True)

# =========================
# MAIN VIEW
# =========================

def render_vehicle_view(contract_id):

    response = requests.get(
        f"{BACKEND_URL}/contract",
        params={"contract_id": contract_id}
    )

    if response.status_code != 200:
        st.error("Failed to load vehicle data")
        return

    data = response.json()

    vin = data.get("vin")
    vehicle = data.get("vehicle") or {}
    sla = data.get("sla") or {}
    recalls = data.get("recalls") or {}

    render_vehicle_header(vehicle, vin)
    render_sla_financials(sla)
    render_sla_terms(sla)
    render_capital_efficiency(sla, vehicle)
    render_financing_burden(sla)
    render_cost_structure(sla)

    risk_score, issues = render_risk_analysis(sla)

    render_executive_summary(risk_score, issues)
    render_action_plan(issues)
    render_recall_status(recalls)

    with st.expander("Raw Contract Data"):
        st.json(data)