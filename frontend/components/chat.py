import streamlit as st
import requests

BACKEND_URL = "http://127.0.0.1:8000"


def render_chat(contract_id: int):

    st.markdown("## 💬 AI Negotiation Assistant")

    # -------------------------
    # Initialize session state
    # -------------------------

    if "messages" not in st.session_state:
        st.session_state.messages = []

    if "pending_user_message" not in st.session_state:
        st.session_state.pending_user_message = None

    if "waiting_for_ai" not in st.session_state:
        st.session_state.waiting_for_ai = False

    if "chat_initialized" not in st.session_state:

        starter = """
Hello! I'm your AI lease negotiation assistant.

I can help you:

• Analyze your lease deal  
• Identify unfair terms  
• Suggest negotiation strategies  
• Tell you exactly what to say to the dealer  

Try asking:

• Is my APR too high?  
• How can I lower my monthly payment?  
• What should I negotiate first?
"""

        st.session_state.messages.append({
            "role": "assistant",
            "content": starter
        })

        st.session_state.chat_initialized = True


    # -------------------------
    # DISPLAY CHAT HISTORY
    # -------------------------

    chat_container = st.container()

    with chat_container:

        for msg in st.session_state.messages:

            if msg["role"] == "user":

                col1, col2 = st.columns([1, 4])

                with col2:
                    with st.chat_message("user"):
                        st.markdown(msg["content"])

            else:

                col1, col2 = st.columns([4, 1])

                with col1:
                    with st.chat_message("assistant"):
                        st.markdown(msg["content"])


        # Show thinking indicator
        if st.session_state.waiting_for_ai:

            col1, col2 = st.columns([4, 1])

            with col1:
                with st.chat_message("assistant"):
                    st.markdown("Thinking...")


    # -------------------------
    # INPUT BOX (ALWAYS LAST)
    # -------------------------

    user_input = st.chat_input("Type your message...")


    # -------------------------
    # STEP 1: User sends message
    # -------------------------

    if user_input:

        # Show user message instantly
        st.session_state.messages.append({
            "role": "user",
            "content": user_input
        })

        # Set pending state
        st.session_state.pending_user_message = user_input
        st.session_state.waiting_for_ai = True

        st.rerun()


    # -------------------------
    # STEP 2: Call LLM AFTER render
    # -------------------------

    if st.session_state.waiting_for_ai and st.session_state.pending_user_message:

        user_message = st.session_state.pending_user_message

        try:

            response = requests.post(
                f"{BACKEND_URL}/chat/chat",
                params={
                    "contract_id": contract_id,
                    "message": user_message
                },
                timeout=120
            )

            if response.status_code == 200:
                reply = response.json()["reply"]
            else:
                reply = "⚠️ AI failed to respond"

        except:
            reply = "⚠️ Cannot connect to AI backend"


        # Add AI reply
        st.session_state.messages.append({
            "role": "assistant",
            "content": reply
        })

        # Reset state
        st.session_state.pending_user_message = None
        st.session_state.waiting_for_ai = False

        st.rerun()
