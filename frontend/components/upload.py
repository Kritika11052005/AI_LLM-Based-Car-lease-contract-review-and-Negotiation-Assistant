import streamlit as st
from frontend.api import upload_contract


def render_upload():

    st.markdown("## 📄 Upload Contract")

    # Show currently analyzed contract
    if st.session_state.get("contract_filename"):

        st.success(
            f"Currently analyzed contract: "
            f"{st.session_state.contract_filename}"
        )

    uploaded_file = st.file_uploader(
        "Upload lease contract",
        type=["pdf"]
    )

    if uploaded_file:

        st.write(f"Selected: {uploaded_file.name}")

        if st.button("Analyze Contract"):

            with st.spinner("Analyzing contract..."):

                result = upload_contract(uploaded_file)

                print("UPLOAD RESULT:", result)

                if not result:

                    st.error("Upload failed. Backend error.")
                    return

                contract_id = result.get("contract_id")

                if not contract_id:

                    st.error("Backend did not return contract_id")
                    return

                # Save session state
                st.session_state["contract_id"] = contract_id
                st.session_state["contract_filename"] = uploaded_file.name

                st.success(
                    f"Contract analyzed successfully: {uploaded_file.name}"
                )

                st.rerun()