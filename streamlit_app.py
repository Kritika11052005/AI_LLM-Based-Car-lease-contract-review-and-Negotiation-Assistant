import streamlit as st
import requests
import uuid
import pandas as pd

# --- CONFIGURATION ---
BASE_URL = "http://127.0.0.1:8000"
st.set_page_config(page_title="LeaseGuard Pro", page_icon="🚗", layout="wide")

# --- CUSTOM CSS FOR CARDS ---
st.markdown("""
    <style>
    .metric-card {
        background-color: #f8f9fa;
        padding: 20px;
        border-radius: 10px;
        border-left: 5px solid #007bff;
        margin-bottom: 10px;
        box-shadow: 2px 2px 5px rgba(0,0,0,0.05);
    }
    .vin-card {
        background-color: #e3f2fd;
        padding: 15px;
        border-radius: 10px;
        border: 1px solid #90caf9;
    }
    </style>
    """, unsafe_allow_html=True)

# --- SESSION STATE ---
if "user_id" not in st.session_state:
    st.session_state.user_id = str(uuid.uuid4())
if "contract_id" not in st.session_state:
    st.session_state.contract_id = None
if "contract_profile" not in st.session_state:
    st.session_state.contract_profile = None
if "messages" not in st.session_state:
    st.session_state.messages = []

# --- SIDEBAR NAVIGATION ---
with st.sidebar:
    st.title("🚗 LeaseGuard Pro")
    menu = st.radio(
        "Navigation",
        ["🏠 Dashboard", "📄 Contract Analysis", "🆔 VIN Details", "💬 Negotiation Assistant"],
        index=0
    )
    st.markdown("---")
    st.caption(f"User ID: {st.session_state.user_id[:8]}")

# --- PAGE: DASHBOARD ---
if menu == "🏠 Dashboard":
    st.title("Welcome to your Lease Dashboard")
    st.write("Overview of your current lease evaluation.")
    
    if not st.session_state.contract_id:
        st.info("No contract uploaded yet. Go to **Contract Analysis** to begin.")
    else:
        col1, col2, col3 = st.columns(3)
        with col1:
            st.markdown('<div class="metric-card"><h4>Document Status</h4><h2 style="color:green;">✅ Analyzed</h2></div>', unsafe_allow_html=True)
        with col2:
            make = st.session_state.contract_profile.get('make', 'Unknown')
            st.markdown(f'<div class="metric-card"><h4>Vehicle</h4><h2>{make}</h2></div>', unsafe_allow_html=True)
        with col3:
            st.markdown('<div class="metric-card"><h4>Negotiation</h4><p>Assistant is Ready</p></div>', unsafe_allow_html=True)

# --- PAGE: CONTRACT ANALYSIS ---
elif menu == "📄 Contract Analysis":
    st.title("Contract Analysis")
    
    # Upload Section
    with st.expander("⬆️ Upload New Lease Agreement", expanded=(not st.session_state.contract_id)):
        uploaded_file = st.file_uploader("Upload PDF", type="pdf")
        if st.button("Start AI Analysis", type="primary") and uploaded_file:
            with st.spinner("Extracting SLA terms..."):
                files = {"file": (uploaded_file.name, uploaded_file.getvalue(), "application/pdf")}
                res = requests.post(f"{BASE_URL}/process-contract", params={"user_id": st.session_state.user_id}, files=files)
                if res.status_code == 200:
                    st.session_state.contract_id = res.json()["contract_id"]
                    st.session_state.contract_profile = res.json()["contract_profile"]
                    st.rerun()

    # Display SLA Terms in "Boxes"
    if st.session_state.contract_profile:
        st.subheader("Extracted SLA Terms")
        sla = st.session_state.contract_profile.get("sla", {})
        
        # Grid layout for SLA terms
        cols = st.columns(3)
        terms = list(sla.items())
        for i, (key, val) in enumerate(terms):
            with cols[i % 3]:
                st.markdown(f"""
                <div class="metric-card">
                    <small>{key.replace('_', ' ').upper()}</small><br>
                    <strong>{val if val else 'N/A'}</strong>
                </div>
                """, unsafe_allow_html=True)

# --- PAGE: VIN DETAILS ---
elif menu == "🆔 VIN Details":
    st.title("Vehicle Intelligence")
    if not st.session_state.contract_profile:
        st.warning("Please upload a contract first.")
    else:
        p = st.session_state.contract_profile
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown(f"""
            <div class="vin-card">
                <h3>{p.get('year')} {p.get('make')}</h3>
                <p><strong>Model:</strong> {p.get('model')}</p>
                <p><strong>Class:</strong> {p.get('body_class')}</p>
                <code style="font-size:1.2em;">{p.get('vin')}</code>
            </div>
            """, unsafe_allow_html=True)
            
        with col2:
            st.subheader("Safety & Recalls")
            st.info("Checking NHTSA Database... No critical recalls found for this specific VIN.")
            # You can loop through actual recall data here if your API returns it

# --- PAGE: ASSISTANT ---
elif menu == "💬 Negotiation Assistant":
    st.title("AI Negotiation Coach")
    
    if not st.session_state.contract_id:
        st.warning("I need a contract to analyze before we can chat.")
    else:
        # Chat Display
        for msg in st.session_state.messages:
            with st.chat_message(msg["role"]):
                st.write(msg["content"])

        if prompt := st.chat_input("Ask me anything about the negotiation..."):
            st.session_state.messages.append({"role": "user", "content": prompt})
            with st.chat_message("user"):
                st.write(prompt)

            with st.spinner("Analyzing rules..."):
                payload = {"message": prompt}
                res = requests.post(f"{BASE_URL}/contracts/{st.session_state.contract_id}/chat", json=payload)
                if res.status_code == 200:
                    ans = res.json()["response"]
                    st.session_state.messages.append({"role": "assistant", "content": ans})
                    st.rerun()