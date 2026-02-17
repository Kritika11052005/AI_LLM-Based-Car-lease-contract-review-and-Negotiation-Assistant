import streamlit as st
from pathlib import Path

from frontend.components.upload import render_upload
from frontend.components.dashboard_view import render_dashboard
from frontend.components.vehicle_view import render_vehicle_view
from frontend.components.chat import render_chat


# ---------------- PAGE CONFIG ----------------

st.set_page_config(
    page_title="ContractClarity",
    page_icon="🚗",
    layout="wide"
)


# ---------------- LOAD CSS ----------------

def load_css():

    css_file = Path(__file__).parent / "styles.css"

    if css_file.exists():

        with open(css_file, "r", encoding="utf-8") as f:

            css = f.read()

        st.markdown(f"<style>{css}</style>", unsafe_allow_html=True)


load_css()


# ---------------- SESSION STATE INIT ----------------

if "contract_id" not in st.session_state:

    st.session_state["contract_id"] = None

if "contract_filename" not in st.session_state:

    st.session_state["contract_filename"] = None


# ---------------- SIDEBAR ----------------

with st.sidebar:

    st.markdown("## 🚗 ContractClarity")

    st.markdown("Enterprise Lease Intelligence")

    if st.session_state.get("contract_filename"):

        st.markdown("---")

        st.markdown(
            f"**Analyzed Contract:**\n\n"
            f"{st.session_state.contract_filename}"
        )

    page = st.radio(
        "Navigation",
        [
            "Upload Contract",
            "Dashboard",
            "Vehicle Intelligence",
            "AI Assistant"
        ],
        label_visibility="collapsed"
    )


# ---------------- HEADER ----------------

st.markdown("### Contract Intelligence Platform")

st.markdown(
    "AI-powered contract analysis, pricing intelligence, and negotiation"
)

st.markdown("---")


# ---------------- ROUTING ----------------

if page == "Upload Contract":

    render_upload()

elif page == "Dashboard":

    if st.session_state.contract_id:

        render_dashboard(st.session_state.contract_id)

    else:

        st.info("Upload and analyze a contract first")

elif page == "Vehicle Intelligence":

    if st.session_state.contract_id:

        render_vehicle_view(st.session_state.contract_id)

    else:

        st.info("Upload and analyze a contract first")

elif page == "AI Assistant":

    if st.session_state.contract_id:

        render_chat(st.session_state.contract_id)

    else:

        st.info("Upload and analyze a contract first")