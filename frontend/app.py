import streamlit as st
import requests
import json

API_URL = "http://127.0.0.1:8000"

st.set_page_config(
    page_title="ContractClarity AI",
    page_icon="🚗",
    layout="wide"
)

# Session state
if "contract_id" not in st.session_state:
    st.session_state.contract_id = None

if "messages" not in st.session_state:
    st.session_state.messages = []

# Sidebar
st.sidebar.title("🚗 ContractClarity")
page = st.sidebar.radio(
    "Navigation",
    ["Upload Contract", "Negotiate"]
)

# =====================
# Upload page
# =====================

if page == "Upload Contract":

    st.title("Upload Contract")

    uploaded_file = st.file_uploader(
        "Upload lease contract",
        type=["pdf"]
    )

    if uploaded_file:

        if st.button("Analyze Contract"):

            files = {
                "file": (
                    uploaded_file.name,
                    uploaded_file,
                    "application/pdf"
                )
            }

            response = requests.post(
                f"{API_URL}/upload",
                files=files
            )

            if response.status_code == 200:

                data = response.json()

                st.session_state.contract_id = data["contract_id"]

                st.success(
                    f"Contract analyzed! ID: {data['contract_id']}"
                )

                st.json(json.loads(data["analysis"]))

            else:
                st.error("Upload failed")


# =====================
# Chat page
# =====================

elif page == "Negotiate":

    st.title("AI Negotiation Assistant")

    if not st.session_state.contract_id:
        st.warning("Upload contract first")
        st.stop()

    # Display messages
    for msg in st.session_state.messages:

        if msg["role"] == "user":
            st.chat_message("user").write(msg["content"])

        else:
            st.chat_message("assistant").write(msg["content"])

    # Input
    user_input = st.chat_input(
        "Ask negotiation questions..."
    )

    if user_input:

        # Add user message
        st.session_state.messages.append({
            "role": "user",
            "content": user_input
        })

        st.chat_message("user").write(user_input)

        # Call backend
        with st.spinner("Thinking..."):

            response = requests.post(
                f"{API_URL}/chat",
                params={
                    "contract_id": st.session_state.contract_id,
                    "message": user_input
                }
            )

            if response.status_code == 200:

                reply = response.json()["reply"]

                st.session_state.messages.append({
                    "role": "assistant",
                    "content": reply
                })

                st.chat_message("assistant").write(reply)

            else:
                st.error("Chat failed")
