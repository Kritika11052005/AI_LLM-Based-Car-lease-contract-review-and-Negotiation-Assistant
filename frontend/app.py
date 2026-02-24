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

    # Logo / Branding
    st.markdown("## ContractClarity")
    st.caption("AI Negotiation Platform")

    st.markdown("---")

    # Navigation
    st.markdown("### Navigation")

    page = st.radio(
        "",
        [
            "Upload Contract",
            "Dashboard",
            "Vehicle Intelligence",
            "AI Assistant"
        ],
        label_visibility="collapsed"
    )

    st.markdown("---")

    # Session Info Card (Enterprise Style)
    st.markdown("### Session Info")

    session_html = f"""
    <div class="sidebar-session">
        <div><strong>Contract ID:</strong> {st.session_state.get("contract_id") or "None"}</div>
        <div><strong>File:</strong> {st.session_state.get("contract_filename") or "None"}</div>
    </div>
    """

    st.markdown(session_html, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # Reset button styled
    if st.button("Reset Session"):
        st.session_state["contract_id"] = None
        st.session_state["contract_filename"] = None
        st.rerun()
# ---------------- HEADER ----------------

st.markdown("## 🚗 ContractClarity")
st.caption("Enterprise Lease Intelligence Platform")

st.divider()


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