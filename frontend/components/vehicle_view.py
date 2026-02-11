import streamlit as st
import requests

BACKEND_URL = "http://127.0.0.1:8000"


def render_vehicle_view(contract_id):

    st.subheader("🚘 Vehicle Details")

    response = requests.get(
        f"{BACKEND_URL}/contract",
        params={"contract_id": contract_id}
    )

    if response.status_code != 200:
        st.error("Failed to load vehicle data")
        return

    data = response.json()

    vin = data.get("vin")
    vehicle = data.get("vehicle", {})
    recalls = data.get("recalls", {})

    # VIN display
    st.markdown(f"**VIN:** `{vin}`")

    col1, col2, col3 = st.columns(3)

    col1.metric("Make", vehicle.get("make", "N/A"))
    col2.metric("Model", vehicle.get("model", "N/A"))
    col3.metric("Year", vehicle.get("year", "N/A"))

    col1.metric("Body Class", vehicle.get("body_class", "N/A"))
    col2.metric("Fuel Type", vehicle.get("fuel_type", "N/A"))
    col3.metric("Plant Country", vehicle.get("plant_country", "N/A"))

    st.divider()

    st.subheader("Recall Information")

    if recalls and recalls.get("error") != "False":
        st.warning("Recall information unavailable")
    else:
        st.success("No active recalls found")
