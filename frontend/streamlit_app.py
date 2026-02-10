import streamlit as st
import requests
import uuid
from datetime import datetime

# --- CONFIGURATION ---
BASE_URL = "http://localhost:8000"

st.set_page_config(
    page_title="ContractClarity", 
    page_icon="📑", 
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- CUSTOM CSS ---
st.markdown("""
    <style>
    /* Main background */
    .stApp {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    /* Metric cards - gradient purple/pink */
    .metric-card {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        padding: 20px;
        border-radius: 12px;
        border-left: 6px solid #ff6b9d;
        margin-bottom: 15px;
        box-shadow: 0 8px 16px rgba(0,0,0,0.2);
        color: white;
    }
    
    .metric-card h4 {
        color: #fff;
        margin-bottom: 10px;
    }
    
    .metric-card p {
        color: rgba(255,255,255,0.95);
    }
    
    /* Upload area - vibrant cyan/blue */
    .upload-area {
        border: 3px dashed #00d4ff;
        border-radius: 12px;
        padding: 40px;
        text-align: center;
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        margin: 20px 0;
        box-shadow: 0 6px 12px rgba(0,0,0,0.15);
    }
    
    .upload-area h3 {
        color: white;
    }
    
    .upload-area p {
        color: rgba(255,255,255,0.9);
    }
    
    /* Sidebar styling */
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, #2d3748 0%, #1a202c 100%);
    }
    
    [data-testid="stSidebar"] * {
        color: white !important;
    }
    
    /* Main content area */
    .block-container {
        background: rgba(255, 255, 255, 0.95);
        border-radius: 15px;
        padding: 2rem;
        margin-top: 1rem;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    </style>
    """, unsafe_allow_html=True)

# --- SESSION STATE ---
if "user_id" not in st.session_state:
    st.session_state.user_id = str(uuid.uuid4())
if "contract_id" not in st.session_state:
    st.session_state.contract_id = None
if "contract_profile" not in st.session_state:
    st.session_state.contract_profile = None
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

# --- HELPER FUNCTION ---
def generate_demo_response(prompt):
    """Generate demo responses when backend is unavailable"""
    prompt_lower = prompt.lower()
    
    # Get actual contract data if available
    sla = {}
    if st.session_state.contract_profile:
        sla = st.session_state.contract_profile.get('sla', {})
    
    # Use actual values from contract or "Not specified"
    apr = sla.get('apr', 'Not specified')
    monthly = sla.get('monthly_payment', 'Not specified')
    mileage = sla.get('mileage_allowance', 'Not specified')
    
    if "apr" in prompt_lower or "interest" in prompt_lower:
        if apr != 'Not specified':
            return f"""Your contract shows an APR of **{apr}**, which is higher than the current market average of 3.5%-4.5% for customers with good credit. 

To negotiate this rate, start by asking the dealer which credit tier this rate corresponds to and request to see the money factor calculation. It's helpful to mention that you've received lower rate quotes from other lenders or banks. Also inquire about any manufacturer financing promotions that might be available. 

Remember that increasing your down payment can sometimes help lower the APR, and consider getting pre-approved from a credit union to use as leverage in your negotiations."""
        else:
            return """When negotiating APR, it's important to first check your credit score since rates vary significantly by credit tier. Get pre-approved from a bank or credit union before visiting the dealership so you have a baseline offer. 

Ask the dealer for the money factor (which you can multiply by 2400 to get the equivalent APR) and research current manufacturer promotions. Focus on negotiating the vehicle price first before discussing financing terms, as this gives you more flexibility. 

Consider asking about the option of making multiple security deposits, which can sometimes lower your interest rate on a lease."""
    
    elif "mileage" in prompt_lower:
        if mileage != 'Not specified':
            return f"""Your contract specifies a mileage allowance of **{mileage}** per year. 

When discussing mileage with the dealer, first calculate your actual annual driving needs including your daily commute and any planned road trips. Ask about the overage charges per mile (typically $0.15-$0.25) and inquire about the cost to increase your allowance upfront, as purchasing extra miles at signing is usually 30-50% cheaper than paying overages later. 

Some leasing companies offer mileage forgiveness programs or the option to adjust your allowance mid-lease, so it's worth asking about these possibilities."""
        else:
            return """For mileage negotiations, start by calculating your actual driving needs based on your daily commute and annual travel plans. The standard mileage options are usually 10,000, 12,000, or 15,000 miles per year. 

Ask the dealer upfront about their overage charges per mile and whether they offer any mileage forgiveness (some allow a small overage without penalty). Consider that buying extra miles at the beginning of your lease is significantly cheaper than paying per-mile overages at the end. 

If your driving patterns change during the lease, some companies allow you to adjust your mileage allowance mid-term, though there may be fees involved."""
    
    elif "monthly" in prompt_lower or "payment" in prompt_lower:
        if monthly != 'Not specified':
            return f"""Your contract shows a monthly payment of **{monthly}**. 

When negotiating payments, ask the dealer for a complete breakdown showing how this amount is calculated, including the vehicle price (capitalized cost), money factor, residual value, and all fees. Inquire which fees are negotiable, such as documentation or acquisition fees. 

Request to see payment scenarios with different down payment amounts, and ask about the option of making multiple security deposits which can sometimes lower your monthly payment. Also check if the first payment can be deferred to 45 days after signing rather than due at signing."""
        else:
            return """When discussing monthly payments, it's important to focus first on negotiating the vehicle price rather than just the payment amount. Ask the dealer to explain how payments are calculated, including the money factor and residual value percentages. 

Request a detailed breakdown showing all components of the payment. Compare different lease term lengths to see how they affect your monthly amount, and ask about any early termination conditions or fees. 

Consider whether leasing or financing makes more sense for your situation, and don't hesitate to ask the dealer to walk you through multiple payment structure options."""
    
    elif "hello" in prompt_lower or "hi" in prompt_lower:
        # Show summary if contract data exists
        summary = ""
        if sla:
            key_terms = []
            if apr != 'Not specified':
                key_terms.append(f"APR: {apr}")
            if monthly != 'Not specified':
                key_terms.append(f"Monthly Payment: {monthly}")
            if mileage != 'Not specified':
                key_terms.append(f"Mileage: {mileage}")
            
            if key_terms:
                summary = f"\n\nI can see your contract includes: {', '.join(key_terms)}. "
        
        return f"""Hello! I'm your AI negotiation assistant designed to help you get the best deal on your car lease.{summary}

I can provide guidance on negotiating various aspects of your lease agreement, including interest rates, monthly payments, mileage allowances, fees, and general negotiation strategies. 

What specific part of your lease would you like help with today?"""
    
    else:
        return f"""I understand you're asking about negotiation strategies for your car lease. 

Effective negotiation begins with thorough research - check market prices on sites like Edmunds and Kelley Blue Book, and get multiple offers from different dealerships. Know your credit score and budget limits before starting discussions. 

Focus on negotiating the vehicle price first before discussing monthly payments or financing terms. Take your time reviewing all fees and don't hesitate to ask for explanations of any charges you don't understand. 

For more specific advice, you can ask me about APR/interest rates, monthly payments, mileage allowances, or any other lease terms you'd like to negotiate."""


# --- SIDEBAR ---
with st.sidebar:
    st.markdown("""
    <div style="text-align: center; padding: 20px 0;">
        <h1 style="color: #3B82F6;">📑 ContractClarity</h1>
    </div>
    """, unsafe_allow_html=True)
    
    st.markdown("---")
    
    menu = st.radio(
        "Navigation",
        ["🏠 Dashboard", "📄 Contract Analysis", "🆔 VIN Details", "💬 Negotiation Assistant"],
        index=0
    )
    
    st.markdown("---")
    
    if st.session_state.contract_id:
        st.success("✅ Contract Uploaded")
        contract_id_str = str(st.session_state.contract_id)
        st.caption(f"ID: {contract_id_str[:8] if len(contract_id_str) >= 8 else contract_id_str}")
    else:
        st.warning("📄 No Contract")
    
    st.caption(f"User: {st.session_state.user_id[:8]}")
    st.caption(f"Date: {datetime.now().strftime('%d.%m.%Y')}")

# ==================== CONTRACT ANALYSIS ====================
if menu == "📄 Contract Analysis":
    st.title("Contract Analysis")
    
    st.markdown("### Upload your car lease or loan contract")
    
    st.markdown("""
    <div class="upload-area">
        <h3 style="color: #3B82F6;">📁 Choose a file</h3>
        <p style="color: #666;">PDF, PNG, JPG up to 10MB</p>
    </div>
    """, unsafe_allow_html=True)
    
    uploaded_file = st.file_uploader(
        "Drag and drop or click to browse",
        type=["pdf", "png", "jpg", "jpeg"],
        label_visibility="collapsed"
    )
    
    if uploaded_file:
        file_size = uploaded_file.size / (1024 * 1024)
        st.markdown(f"""
        <div class="metric-card" style="border-left-color: #10B981;">
            <h4>📄 Selected File</h4>
            <p><strong>File Name:</strong> {uploaded_file.name}</p>
            <p><strong>File Size:</strong> {file_size:.2f} MB</p>
            <p><strong>Type:</strong> {uploaded_file.type.split('/')[-1].upper()}</p>
        </div>
        """, unsafe_allow_html=True)
    
    if st.button("🚀 Analyze Contract", type="primary", disabled=not uploaded_file):
        with st.spinner("Analyzing contract terms..."):
            try:
                # Upload to backend
                files = {"file": (uploaded_file.name, uploaded_file.getvalue(), uploaded_file.type)}
                upload_response = requests.post(f"{BASE_URL}/upload", files=files, timeout=10)
                
                if upload_response.status_code == 200:
                    upload_data = upload_response.json()
                    contract_id = upload_data.get("db_id")
                    
                    if contract_id:
                        st.session_state.contract_id = contract_id
                        
                        # Get SLA terms from backend
                        sla_response = requests.post(f"{BASE_URL}/extract-sla/{contract_id}", timeout=30)
                        
                        if sla_response.status_code == 200:
                            sla_data = sla_response.json()
                            
                            # Store in session state
                            st.session_state.contract_profile = {
                                "sla": sla_data.get("sla", {}),
                                "contract_profile": sla_data.get("contract_profile", {})
                            }
                            
                            st.success("✅ Contract analysis complete!")
                            st.rerun()
                        else:
                            st.error(f"Failed to extract SLA: {sla_response.text}")
                    else:
                        st.error("No contract ID returned")
                else:
                    st.error(f"Upload failed: {upload_response.text}")
                    
            except requests.exceptions.ConnectionError:
                st.error("Cannot connect to backend. Make sure FastAPI is running on http://localhost:8000")
            except requests.exceptions.Timeout:
                st.error("Request timed out. Please try again.")
            except Exception as e:
                st.error(f"Error: {str(e)}")
    
    # ========== SHOW SLA FIELDS IN BOXES ==========
    if st.session_state.contract_profile and st.session_state.contract_profile.get('sla'):
        st.markdown("---")
        st.subheader("📋 Extracted Lease Terms")
        
        sla = st.session_state.contract_profile.get("sla", {})
        
        # Define EXACT SLA fields to show (from your requirements)
        sla_field_display = {
            "apr": "APR",
            "lease_term_months": "Lease Term",
            "monthly_payment": "Monthly Payment",
            "down_payment": "Down Payment",
            "residual_value": "Residual Value",
            "mileage_allowance": "Mileage Allowance",
            "early_termination_clause": "Early Termination",
            "purchase_option": "Purchase Option",
            "late_fees": "Late Fees",

        }
        
        # Create 3 columns for the boxes
        cols = st.columns(3)
        
        # Display each SLA field in a box
        field_count = 0
        
        for field_key, display_name in sla_field_display.items():
            # Get value from SLA data, or "N/A" if not found
            value = sla.get(field_key, "N/A")
            
            # Only show field if it has a value (not "N/A")
            if value != "N/A":
                with cols[field_count % 3]:
                    st.markdown(f"""
                    <div class="metric-card">
                        <div style="color: #666; font-size: 0.9rem; font-weight: 600; margin-bottom: 8px;">
                            {display_name.upper()}
                        </div>
                        <div style="font-size: 1.2rem; font-weight: 700; color: #1F2937;">
                            {value}
                        </div>
                    </div>
                    """, unsafe_allow_html=True)
                
                field_count += 1
        
        # If no SLA fields were found
        if field_count == 0:
            st.info("No SLA terms were extracted from the contract.")

# ==================== VIN DETAILS ====================
elif menu == "🆔 VIN Details":
    st.title("Vehicle Intelligence")
    
    if not st.session_state.contract_profile:
        st.warning("Please upload a contract first in the Contract Analysis tab.")
    else:
        p = st.session_state.contract_profile
        
        # Manual VIN lookup
        st.markdown("### Enter VIN Number")
        vin = st.text_input("17-digit VIN", placeholder="1HGCM82633A123456")
        
        if st.button("🔍 Lookup VIN", type="primary") and vin:
            if len(vin) != 17:
                st.error("VIN must be exactly 17 characters")
            elif not vin.isalnum():
                st.error("VIN must contain only letters and numbers")
            else:
                with st.spinner("Checking NHTSA database..."):
                    try:
                        response = requests.get(
                            f"https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/{vin}?format=json",
                            timeout=10
                        )
                        
                        if response.status_code == 200:
                            data = response.json()
                            results = data.get("Results", [])
                            
                            if results:
                                # Get values - will be empty string if not found
                                make = next((r["Value"] for r in results if r["Variable"] == "Make"), "")
                                model = next((r["Value"] for r in results if r["Variable"] == "Model"), "")
                                year = next((r["Value"] for r in results if r["Variable"] == "Model Year"), "")
                                vehicle_type = next((r["Value"] for r in results if r["Variable"] == "Vehicle Type"), "")
                                
                                # Show in columns
                                col1, col2, col3, col4 = st.columns(4)
                                
                                # Show N/A if value is empty (dummy VIN)
                                col1.metric("Make", make if make else "N/A")
                                col2.metric("Model", model if model else "N/A")
                                col3.metric("Year", year if year else "N/A")
                                col4.metric("Type", vehicle_type if vehicle_type else "N/A")
                                
                                # Show warning for dummy VIN
                                if not make and not model:
                                    st.warning("⚠️ This appears to be a dummy or invalid VIN")
                            else:
                                st.error("❌ No data returned for this VIN")
                                st.info("This VIN may be invalid or dummy.")
                        else:
                            st.error("Failed to connect to NHTSA database")
                            
                    except requests.exceptions.ConnectionError:
                        st.error("Cannot connect to NHTSA database. Please check your internet connection.")
                    except requests.exceptions.Timeout:
                        st.error("Request timed out. Please try again.")
                    except Exception as e:
                        st.error(f"Failed to lookup VIN: {str(e)}")

# ==================== NEGOTIATION ASSISTANT ====================
elif menu == "💬 Negotiation Assistant":
    # Header
    st.markdown("""
    <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1F2937; margin-bottom: 10px;">AI Negotiation Assistant</h1>
        <h3 style="color: #6B7280; font-weight: normal; margin-bottom: 20px;">
            Get real-time suggestions and talking points to secure the best deal.
        </h3>
    </div>
    """, unsafe_allow_html=True)
    
    st.markdown("---")
    
    # Check if contract uploaded
    if not st.session_state.contract_id:
        st.warning("⚠️ **No contract uploaded yet!**")
        st.info("Please upload your lease agreement in the **Contract Analysis** tab first.")
    else:
        # Context from contract
        if st.session_state.contract_profile:
            p = st.session_state.contract_profile
            sla = p.get('sla', {})
            context = "Based on your lease contract and market data."
        else:
            context = "Based on your contract and market data."
        
        st.markdown(f"""
        <div style="text-align: center; color: #666; padding: 15px; font-style: italic; 
                    background: #F8FAFC; border-radius: 8px; margin: 20px 0;">
            {context}
        </div>
        """, unsafe_allow_html=True)
        
        st.markdown("---")
        
        # Initialize welcome message only once
        if not st.session_state.chat_history:
            welcome_message = "I'm your negotiation assistant. How can I help you prepare for your conversation with the dealer? You can ask for talking points, questions to ask, or ways to respond to common dealer tactics."
            st.session_state.chat_history.append({"role": "assistant", "content": welcome_message})

        # Display chat history
        for msg in st.session_state.chat_history:
            if msg["role"] == "user":
                st.markdown(f"""
                <div style="background: #F3F4F6; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #10B981;">
                    <p style="font-size: 1.1rem; line-height: 1.6; color: #1F2937;">
                        {msg["content"]}
                    </p>
                </div>
                """, unsafe_allow_html=True)
            else:
                st.markdown(f"""
                <div style="background: #F0F9FF; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #3B82F6;">
                            <p style="font-size: 1.1rem; line-height: 1.6; color: #1F2937;">
                        {msg["content"]}
                    </p>
                </div>
                """, unsafe_allow_html=True)
        
        st.markdown("---")
        
        # Chat input
        if prompt := st.chat_input("Ask for negotiation tips..."):
            # Add user message
            st.session_state.chat_history.append({"role": "user", "content": prompt})
            
            with st.spinner("Getting response..."):
                try:
                    # Call backend
                    chat_response = requests.post(
                        f"{BASE_URL}/chat/{st.session_state.contract_id}",
                        json={"message": prompt},
                        timeout=30
                    )
                    
                    if chat_response.status_code == 200:
                        response_data = chat_response.json()
                        ai_response = response_data.get("response", "I couldn't generate a response.")
                        
                    else:
                        ai_response = generate_demo_response(prompt)
                        
                except requests.exceptions.ConnectionError:
                    st.error("Cannot connect to backend. Using demo response.")
                    ai_response = generate_demo_response(prompt)
                except requests.exceptions.Timeout:
                    st.error("Request timed out. Using demo response.")
                    ai_response = generate_demo_response(prompt)
                except Exception as e:
                    st.error(f"Error: {str(e)}. Using demo response.")
                    ai_response = generate_demo_response(prompt)

                st.session_state.chat_history.append({"role": "assistant", "content": ai_response})
                
                # Rerun to show new messages
                st.rerun()
                   
        
        # Clear chat button
        if len(st.session_state.chat_history) > 1:
            st.markdown("---")
            col1, col2, col3 = st.columns([1, 2, 1])
            with col2:
                if st.button("🗑️ Clear Chat History", use_container_width=True):
                    st.session_state.chat_history = []
                    st.rerun()

# ==================== DASHBOARD ====================
elif menu == "🏠 Dashboard":
    st.markdown("""
    <div style="text-align: center; padding: 20px 0;">
        <h1>Contract Analysis</h1>
        <h3 style="color: #666; font-weight: normal;">
            Upload your car lease or loan contract (PDF or image) to get an instant AI-powered review.
        </h3>
    </div>
    """, unsafe_allow_html=True)
    
    st.markdown("""
    <div class="metric-card" style="border-left-color: #10B981;">
        <h4 style="color: #10B981;">🔒 Secure & Private</h4>
        <p>Your documents are processed securely and are not stored after analysis.</p>
    </div>
    """, unsafe_allow_html=True)
    
    st.markdown("---")
    
    if not st.session_state.contract_id:
        st.info("📁 No contract uploaded yet. Go to **Contract Analysis** to begin.")
    else:
        st.success("✅ Contract uploaded and analyzed!")
        
        # Show contract status
        col1, col2, col3 = st.columns(3)
        with col1:
            st.markdown(f"""
            <div class="metric-card">
                <h4>Document Status</h4>
                <h2 style="color: #10B981;">✅ Analyzed</h2>
            </div>
            """, unsafe_allow_html=True)
        with col2:
            st.markdown(f"""
            <div class="metric-card">
                <h4>Next Step</h4>
                <p>Go to <strong>Negotiation Assistant</strong> to chat about your contract</p>
            </div>
            """, unsafe_allow_html=True)
        with col3:
            st.markdown(f"""
            <div class="metric-card">
                <h4>SLA Fields</h4>
                <p>{len(st.session_state.contract_profile.get('sla', {}))} terms extracted</p>
            </div>
            """, unsafe_allow_html=True)

# --- FOOTER ---
st.markdown("---")
st.markdown("""
<div style="text-align: center; color: #666; padding: 20px;">
    <p>📑 <strong>ContractClarity</strong> • AI-Powered Lease Analysis</p>
</div>
""", unsafe_allow_html=True)