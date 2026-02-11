import streamlit as st
from frontend.api import upload_contract


def render_upload():

    st.title("📄 Upload Contract")

    file = st.file_uploader(
        "Upload lease contract",
        type=["pdf"]
    )

    if file and st.button("Analyze Contract"):

        with st.spinner("Analyzing contract..."):

            data = upload_contract(file)
            st.session_state.contract_id = data["contract_id"]
            st.session_state.contract_filename = data["filename"]


            st.success("Contract analyzed successfully!")

            st.rerun()
