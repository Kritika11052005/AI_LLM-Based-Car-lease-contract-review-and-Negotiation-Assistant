import streamlit as st
import time
from frontend.api import upload_contract


def render_upload():

    st.markdown("## Upload Lease Contract")
    st.markdown("Secure AI-powered contract analysis")

    st.markdown("<div class='section-space'></div>", unsafe_allow_html=True)

    col1, col2 = st.columns([2, 1])

    # =========================================================
    # LEFT SIDE – UPLOAD CARD
    # =========================================================

    with col1:

        st.markdown(
            """
            <div class="upload-card">
                <div class="upload-title">
                    Drag & Drop Lease Agreement
                </div>
                <div class="upload-sub">
                    Supported format: PDF • Max size: 20MB
                </div>
            </div>
            """,
            unsafe_allow_html=True
        )

        uploaded_file = st.file_uploader(
            " ",
            type=["pdf"],
            label_visibility="collapsed"
        )

        if uploaded_file:

            st.markdown("<div class='section-space'></div>", unsafe_allow_html=True)

            if st.button("Analyze Contract", use_container_width=True):

                progress_bar = st.progress(0)

                for i in range(1, 101):
                    time.sleep(0.01)
                    progress_bar.progress(i)

                with st.spinner("AI is analyzing your contract..."):

                    result = upload_contract(uploaded_file)

                if not result:
                    st.error("Upload failed. Backend error.")
                    return

                contract_id = result.get("contract_id")

                if not contract_id:
                    st.error("Backend did not return contract ID.")
                    return

                # Save session state
                st.session_state["contract_id"] = contract_id
                st.session_state["contract_filename"] = uploaded_file.name

                st.success("Contract successfully analyzed.")

                time.sleep(1)
                st.rerun()

    # =========================================================
    # RIGHT SIDE – FILE PREVIEW & INFO
    # =========================================================

    with col2:

        st.markdown(
            """
            <div class="section-card">
                <div class="section-title">Why ContractClarity?</div>
                <ul style="padding-left:18px; line-height:1.8;">
                    <li>Automated lease term extraction</li>
                    <li>Market price intelligence</li>
                    <li>Fairness scoring engine</li>
                    <li>Negotiation recommendations</li>
                </ul>
            </div>
            """,
            unsafe_allow_html=True
        )

        st.markdown("<div class='section-space'></div>", unsafe_allow_html=True)

        if st.session_state.get("contract_filename"):

            st.markdown(
                f"""
                <div class="section-card">
                    <div class="section-title">Current Contract</div>
                    <strong>{st.session_state.contract_filename}</strong>
                </div>
                """,
                unsafe_allow_html=True
            )