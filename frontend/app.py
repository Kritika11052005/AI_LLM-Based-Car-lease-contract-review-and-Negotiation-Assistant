import streamlit as st

from components.upload import render_upload
from components.chat import render_chat
from components.contract_view import render_contract_view
from components.vehicle_view import render_vehicle_view


# ---------------- PAGE CONFIG ----------------

st.set_page_config(
    page_title="ContractClarity AI",
    page_icon="🚗",
    layout="wide"
)


# ---------------- SESSION STATE INIT ----------------

if "contract_id" not in st.session_state:
    st.session_state.contract_id = None

if "contract_filename" not in st.session_state:
    st.session_state.contract_filename = None

if "messages" not in st.session_state:
    st.session_state.messages = []


# ---------------- SIDEBAR ----------------

st.sidebar.title("🚗 ContractClarity AI")

page = st.sidebar.radio(
    "Navigation",
    [
        "Upload Contract",
        "Negotiate"
    ]
)


# ---------------- ACTIVE CONTRACT BANNER ----------------

if st.session_state.contract_filename:

    st.success(
        f"📄 Active Contract: "
        f"{st.session_state.contract_filename} "
        f"(ID: {st.session_state.contract_id})"
    )


# ---------------- UPLOAD PAGE ----------------

if page == "Upload Contract":

    st.title("Upload Contract")

    render_upload()


# ---------------- NEGOTIATE PAGE ----------------

elif page == "Negotiate":

    contract_id = st.session_state.contract_id

    if not contract_id:

        st.warning("Please upload and analyze a contract first.")

        st.info(
            "Go to 'Upload Contract' from sidebar to begin."
        )

        st.stop()


    st.title("Contract Intelligence Dashboard")


    # -------- Tabs Layout --------

    tab1, tab2, tab3 = st.tabs([
        "📄 Contract Intelligence",
        "🚘 VIN Details",
        "💬 AI Negotiation Assistant"
    ])


    # -------- Contract View --------

    with tab1:

        render_contract_view(contract_id)


    # -------- Vehicle View --------

    with tab2:

        render_vehicle_view(contract_id)


    # -------- Chat View --------

    with tab3:

        render_chat(contract_id)
