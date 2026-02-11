import streamlit as st
from frontend.api import get_contract


def render_contract_view(contract_id):

    contract = get_contract(contract_id)

    if not contract:
        st.error("Failed to load contract data")
        return

    sla = contract.get("sla", {})

    st.subheader("📊 Contract Summary")

    col1, col2, col3 = st.columns(3)

    col1.metric("APR (%)", sla.get("apr", "N/A"))
    col2.metric("Lease Term", sla.get("lease_term_months", "N/A"))
    col3.metric("Monthly Payment", f"₹{sla.get('monthly_payment', 'N/A')}")

    col1.metric("Down Payment", f"₹{sla.get('down_payment', 'N/A')}")
    col2.metric("Residual Value", f"₹{sla.get('residual_value', 'N/A')}")
    col3.metric("Purchase Option", f"₹{sla.get('purchase_option', 'N/A')}")

    col1.metric("Mileage Allowance", sla.get("mileage_allowance", "N/A"))
    col2.metric("Late Fees", sla.get("late_fees", "N/A"))
    col3.metric(
        "Early Termination",
        sla.get("early_termination_clause") or "Not specified"
    )
