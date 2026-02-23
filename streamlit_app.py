import streamlit as st
import requests
import uuid
import plotly.graph_objects as go

# --- CONFIGURATION ---
BASE_URL = "http://127.0.0.1:8000"
st.set_page_config(
    page_title="LeaseGuard Pro", 
    page_icon="🚗", 
    layout="wide",
    initial_sidebar_state="collapsed"
)

# --- SESSION STATE INITIALIZATION ---
if "user_id" not in st.session_state: st.session_state.user_id = str(uuid.uuid4())
if "contract_id" not in st.session_state: st.session_state.contract_id = None
if "contract_profile" not in st.session_state: st.session_state.contract_profile = None
if "messages" not in st.session_state: st.session_state.messages = []
if "menu_selection" not in st.session_state: st.session_state.menu_selection = "Dashboard"

# --- DYNAMIC BACKGROUND LOGIC ---
if st.session_state.menu_selection == "Dashboard":
    page_bg = """
    .stApp {
        background: linear-gradient(rgba(10, 20, 40, 0.6), rgba(10, 20, 40, 0.8)), 
                    url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=2560&auto=format&fit=crop') no-repeat center center fixed !important;
        background-size: cover !important;
    }
    """
else:
    page_bg = """
    .stApp {
        background: #0f172a !important;
        background-image: none !important;
    }
    """

# --- MAIN CSS STYLING ---
st.markdown(f"""
    <style>
    {page_bg}
    .stApp, .stMarkdown, h1, h2, h3, p, label, li, span {{
        font-family: 'Inter', sans-serif;
        color: #ffffff !important; 
        text-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }}
    header[data-testid="stHeader"] {{ background: transparent !important; }}
    [data-testid="stSidebar"] {{
        background-color: #ffffff !important;
        border-right: 1px solid #e2e8f0;
    }}
    [data-testid="stSidebar"] h1, [data-testid="stSidebar"] p, [data-testid="stSidebar"] span, [data-testid="stSidebar"] div, [data-testid="stSidebar"] button {{
        color: #1e293b !important;
        text-shadow: none !important;
    }}
    div.stButton > button {{
        background: #f1f5f9;
        color: #334155 !important;
        border: 1px solid #e2e8f0;
        padding: 12px 20px;
        border-radius: 12px;
        width: 100%;
        font-weight: 600;
        text-align: left;
        transition: all 0.2s ease;
        text-shadow: none !important;
        margin-bottom: 8px;
    }}
    div.stButton > button:hover {{
        background: #00c8ff;
        color: #ffffff !important;
        border-color: #00c8ff;
        padding-left: 20px;
    }}
    .glass-card {{
        background: rgba(30, 41, 59, 0.4);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 24px;
        margin-bottom: 20px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
    }}
    .glass-card h4 {{ color: #94a3b8 !important; font-size: 0.75rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px; }}
    .glass-card h2 {{ color: #ffffff !important; font-weight: 800; font-size: 1.8rem; margin: 0; }}
    .glass-card p {{ color: #cbd5e1 !important; margin-top: 5px; font-size: 0.9rem; }}
    .score-bar-bg {{ background: rgba(255,255,255,0.1); border-radius: 10px; height: 8px; width: 100%; margin-top: 5px; }}
    .score-bar-fill {{ height: 100%; border-radius: 10px; transition: width 1s ease-in-out; }}
    .chat-user {{ text-align: right; margin-bottom: 10px; }}
    .chat-user span {{ background: #00c8ff; color: white !important; padding: 10px 18px; border-radius: 18px 18px 0 18px; display: inline-block; font-weight: 500; }}
    .chat-bot {{ text-align: left; margin-bottom: 10px; }}
    .chat-bot span {{ background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #e2e8f0 !important; padding: 10px 18px; border-radius: 18px 18px 18px 0; display: inline-block; }}
    .stFileUploader * {{ color: #000000 !important; -webkit-text-fill-color: #000000 !important; text-shadow: none !important; }}
    .stFileUploader label, .stFileUploader label * {{ color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; text-shadow: 0 1px 3px rgba(0,0,0,0.3) !important; }}
    .stFileUploader div[data-testid="stFileUploadDropzone"] {{ background-color: #f1f5f9 !important; border: 2px dashed #94a3b8 !important; }}
    </style>
""", unsafe_allow_html=True)
  
def clean_display(value):
    if value is None or str(value).strip().lower() in ["not specified", "none", "", "nan", "null", "0.0"]: return "N/A"
    return str(value).strip()

def format_inr(value):
    try:
        val = float(value)
        if val == 0: return "⚠️ Not Disclosed"
        return f"₹{val:,.0f}"
    except: return "⚠️ Not Disclosed"

def create_gauge(score):
    color = "#10B981" if score >= 80 else ("#F59E0B" if score >= 60 else "#EF4444")
    fig = go.Figure(go.Indicator(
        mode = "gauge+number", value = score,
        domain = {'x': [0, 1], 'y': [0, 1]},
        number = {'font': {'size': 60, 'color': "white", 'family': "Inter"}},
        gauge = {'axis': {'range': [0, 100], 'tickcolor': "white"}, 'bar': {'color': color}, 'bgcolor': "rgba(255,255,255,0.05)", 'borderwidth': 0}
    ))
    fig.update_layout(paper_bgcolor = "rgba(0,0,0,0)", margin = dict(t=0, b=0, l=20, r=20), height=250, width=250)
    return fig

def create_value_vs_price_chart(market_value, dealer_price):
    market_val = float(market_value)
    dealer_val = float(dealer_price)
    dealer_color = "#EF4444" if dealer_val > market_val else "#10B981"
    market_color = "#00c8ff"
    
    fig = go.Figure()
    fig.add_trace(go.Bar(y=['Market Value'], x=[market_val], name='Market Value', orientation='h', marker=dict(color=market_color, opacity=0.9), text=[f"₹{market_val:,.0f}"], textposition='auto', textfont=dict(color="white", size=14, family="Inter")))
    fig.add_trace(go.Bar(y=['Dealer Price'], x=[dealer_val], name='Dealer Price', orientation='h', marker=dict(color=dealer_color, opacity=0.9), text=[f"₹{dealer_val:,.0f}"], textposition='auto', textfont=dict(color="white", size=14, family="Inter")))
    
    fig.update_layout(barmode='group', paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", margin=dict(t=10, b=10, l=10, r=20), height=180, xaxis=dict(showgrid=False, showticklabels=False, zeroline=False), yaxis=dict(showgrid=False, color="white", tickfont=dict(size=14, family="Inter")), showlegend=False)
    return fig

def render_score_bar(label, score, color):
    st.markdown(f"""
    <div style="margin-bottom: 15px;">
        <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:600; margin-bottom:5px;">
            <span>{label}</span><span style="color:{color} !important;">{score}/100</span>
        </div>
        <div class="score-bar-bg"><div class="score-bar-fill" style="width: {score}%; background-color: {color};"></div></div>
    </div>
    """, unsafe_allow_html=True)

# --- SIDEBAR ---
with st.sidebar:
    st.markdown("<h2 style='color: #007bff; font-weight: 900; letter-spacing: -1px; margin-bottom:0;'>LEASEGUARD</h2>", unsafe_allow_html=True)
    st.markdown("<p style='font-size: 0.8rem; opacity: 0.6; font-weight: 600; margin-top: -5px;'>INTELLIGENT AUTO ANALYTICS</p>", unsafe_allow_html=True)
    st.markdown("---")
    if st.button("📊  Dashboard"): st.session_state.menu_selection = "Dashboard"; st.rerun()
    if st.button("📄  Contract Scanner"): st.session_state.menu_selection = "Contract Analysis"; st.rerun()
    if st.button("🆔  VIN Intelligence"): st.session_state.menu_selection = "VIN Intelligence"; st.rerun()
    if st.button("💬  Negotiation Coach"): st.session_state.menu_selection = "Negotiation Coach"; st.rerun()
    if st.button("🔄  Reset System"): st.session_state.clear(); st.rerun()

# =========================================================
# 1. DASHBOARD
# =========================================================
if st.session_state.menu_selection == "Dashboard":
    st.markdown("<div style='padding-top: 50px;'></div>", unsafe_allow_html=True)
    st.markdown("<h1 style='font-size: 3.5rem; font-weight: 800; line-height: 1.1;'>Lease Intelligence<br>Hub</h1>", unsafe_allow_html=True)
    
    if st.session_state.contract_profile:
        p = st.session_state.contract_profile
        breakdown = p.get('breakdown', {})
        
        market_val = float(p.get('market_value') or 0)
        dealer_val = float(p.get('dealer_price') or 0)
        residual = float(p.get('sla', {}).get('residual_value') or 0)
        equity = market_val - residual
        
        c1, c2, c3, c4 = st.columns(4)
        with c1: st.markdown(f'<div class="glass-card"><h4>VEHICLE</h4><h2>{p.get("year")}</h2><p>{p.get("make")} {p.get("model")}</p></div>', unsafe_allow_html=True)
        with c2: st.markdown(f'<div class="glass-card"><h4>DEALER PRICE</h4><h2 style="color:#ffffff !important;">{format_inr(dealer_val)}</h2><p>Extracted from Contract</p></div>', unsafe_allow_html=True)
        with c3: st.markdown(f'<div class="glass-card"><h4>MARKET VALUE</h4><h2 style="color:#00c8ff !important;">{format_inr(market_val)}</h2><p>Real-time API Data</p></div>', unsafe_allow_html=True)
        with c4: 
            col = "#10B981" if equity > 0 else "#F43F5E"
            st.markdown(f'<div class="glass-card" style="border-bottom: 4px solid {col};"><h4>NET EQUITY</h4><h2 style="color:{col} !important;">{format_inr(equity)}</h2><p>Potential Profit</p></div>', unsafe_allow_html=True)

        st.markdown("### 🎯 Fairness Score Analysis")
        sc1, sc2 = st.columns([1, 2])
        
        with sc1:
            st.plotly_chart(create_gauge(p.get('score', 50)), width="stretch")
        with sc2:
            st.markdown('<div class="glass-card"><h4>WEIGHTED FACTOR ANALYSIS</h4>', unsafe_allow_html=True)
            # CHANGED: Now pulls from 'price_score' instead of 'equity_score'
            render_score_bar("Price Fairness (40%)", breakdown.get('price_score', 0), "#3B82F6")
            render_score_bar("APR Health (25%)", breakdown.get('apr_score', 0), "#10B981")
            render_score_bar("Hidden Fees (15%)", breakdown.get('fee_score', 0), "#F59E0B")
            render_score_bar("Lease Term (20%)", breakdown.get('term_score', 0), "#8B5CF6")
            st.markdown('</div>', unsafe_allow_html=True)
    else:
        st.info("System Standby. Please navigate to 'Contract Scanner' to begin.")

# =========================================================
# 2. CONTRACT ANALYSIS
# =========================================================
elif st.session_state.menu_selection == "Contract Analysis":
    st.markdown("<h1>Contract Scanner</h1>", unsafe_allow_html=True)
    uploaded_file = st.file_uploader("Drop Lease Agreement Here", type="pdf")
    
    if uploaded_file:
        if st.button("🚀 Analyze Document", type="primary"):
            with st.spinner("Processing document..."):
                files = {"file": (uploaded_file.name, uploaded_file.getvalue(), "application/pdf")}
                try:
                    res = requests.post(f"{BASE_URL}/process-contract", params={"user_id": st.session_state.user_id}, files=files)
                    if res.status_code == 200:
                        data = res.json()
                        st.session_state.contract_id = data["contract_id"]
                        st.session_state.contract_profile = data["contract_profile"]
                        st.rerun()
                    else:
                        st.error(f"Error {res.status_code}: {res.text}")
                except Exception as e:
                    st.error(f"Connection Error: {e}")

    if st.session_state.contract_profile:
        p = st.session_state.contract_profile
        sla = p.get("sla", {})
        dealer_price = p.get("dealer_price", 0)
        buyout_val = p.get("buyout_price") or sla.get("buyout_price") or sla.get("residual_value")
        st.markdown("### 🔓 Extracted Terms (INR Standardized)")
        
        terms = [
            ("Buyout Option", format_inr(buyout_val)), ("Dealer Price", format_inr(dealer_price)), 
            ("Market Value", format_inr(p.get("market_value"))), ("Interest Rate / APR", f"{sla.get('apr_percent')}%"),
            ("Lease Term", f"{sla.get('term_months')} Months"), ("Monthly Payment", f"₹{sla.get('monthly_payment')}"),
            ("Down Payment", format_inr(sla.get('down_payment'))), ("Residual Value", format_inr(sla.get('residual_value'))),
            ("Annual Miles", sla.get("mileage_allowance_yr")), ("Maintenance", sla.get("maintenance_resp")),
            ("Warranty", sla.get("warranty_summary")), ("Late Fees", sla.get("late_fee_policy"))
        ]
        
        for i in range(0, len(terms), 3):
            cols = st.columns(3)
            for j in range(3):
                if i + j < len(terms):
                    label, val = terms[i+j]
                    cols[j].markdown(f'<div class="glass-card"><h4>{label}</h4><h2>{clean_display(val)}</h2></div>', unsafe_allow_html=True)

# =========================================================
# 3. VIN INTELLIGENCE
# =========================================================
elif st.session_state.menu_selection == "VIN Intelligence":
    st.markdown("<h1>Vehicle Intelligence</h1>", unsafe_allow_html=True)
    
    if st.session_state.contract_profile:
        p = st.session_state.contract_profile
        score = p.get('score', 50)
        
        market_v = float(p.get('market_value') or 0)
        dealer_p = float(p.get('dealer_price') or 0)
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.plotly_chart(create_gauge(score), width="stretch")
            equity_val = market_v - float(p.get('sla', {}).get('residual_value') or 0)
            col = "#10B981" if equity_val > 0 else "#F43F5E"
            st.markdown(f"""
                <div class="glass-card" style="margin-top: 10px; text-align: center; padding: 15px;">
                    <h4 style="margin:0;">EQUITY POSITION</h4>
                    <h2 style="color: {col} !important; margin:0;">{format_inr(equity_val)}</h2>
                </div>
            """, unsafe_allow_html=True)
            
        with col2:
            st.markdown(f"""
            <div class="glass-card">
                <h4>VEHICLE IDENTIFICATION</h4>
                <h2>{p.get('year')} {p.get('make')} {p.get('model')}</h2>
                <p style="font-family: monospace; opacity: 0.8;">VIN: {p.get('vin')}</p>
                <div style="background:rgba(255,255,255,0.05); padding:20px; border-radius:15px; margin-top:20px;">
                    <div style="display:flex; justify-content:space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom:10px;">
                        <span>Current Market Value</span><strong style="color:#00c8ff;">{format_inr(market_v)}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding-top:10px;">
                        <span>Contract Residual</span><strong>{format_inr(p.get('sla',{}).get('residual_value') or 0)}</strong>
                    </div>
                     <div style="display:flex; justify-content:space-between; padding-top:10px; border-top: 1px solid rgba(255,255,255,0.1); margin-top:10px;">
                        <span>Dealer Price</span><strong style="color:#F59E0B;">{format_inr(dealer_p)}</strong>
                    </div>
                </div>
            </div>
            """, unsafe_allow_html=True)
            
            st.markdown('<div class="glass-card" style="padding-top:15px; padding-bottom:5px;"><h4>📊 VALUE VS PRICE SPREAD</h4>', unsafe_allow_html=True)
            
            if market_v > 0 or dealer_p > 0:
                # SPLIT COLUMNS FOR CHART AND DIFFERENCE TEXT
                chart_col, text_col = st.columns([2.5, 1])
                
                with chart_col:
                    fig_bar = create_value_vs_price_chart(market_v, dealer_p)
                    st.plotly_chart(fig_bar, width="stretch")
                
                with text_col:
                    price_diff = dealer_p - market_v
                    if price_diff > 0:
                        diff_color = "#EF4444" # Red
                        diff_label = "OVERPRICED BY"
                    else:
                        diff_color = "#10B981" # Green
                        diff_label = "BELOW MARKET BY"
                        
                    st.markdown(f"""
                        <div style="height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; padding-top: 35px;">
                            <span style="font-size: 0.85rem; color: #94a3b8; font-weight: 700; letter-spacing: 1px;">{diff_label}</span>
                            <span style="font-size: 2rem; font-weight: 800; color: {diff_color} !important;">{format_inr(abs(price_diff))}</span>
                        </div>
                    """, unsafe_allow_html=True)
            else:
                st.info("Market Value or Dealer Price data unavailable for comparison.")
                
            st.markdown('</div>', unsafe_allow_html=True)

# =========================================================
# 4. NEGOTIATION COACH
# =========================================================
elif st.session_state.menu_selection == "Negotiation Coach":
    st.markdown("<h1>Negotiation Coach</h1>", unsafe_allow_html=True)
    if not st.session_state.contract_id:
        st.info("Upload a contract to start the AI strategy session.")
    else:
        with st.container():
            for msg in st.session_state.messages:
                div_class = "chat-bot" if msg["role"] == "assistant" else "chat-user"
                st.markdown(f'<div class="{div_class}"><span>{msg["content"]}</span></div>', unsafe_allow_html=True)
        
        if prompt := st.chat_input("Ask for negotiation advice..."):
            st.session_state.messages.append({"role": "user", "content": prompt})
            try:
                with st.spinner("Coach is thinking..."):
                    res = requests.post(f"{BASE_URL}/contracts/{st.session_state.contract_id}/chat", json={"message": prompt}, timeout=30)
                    if res.status_code == 200:
                        st.session_state.messages.append({"role": "assistant", "content": res.json()["response"]})
                    else:
                        st.session_state.messages.append({"role": "assistant", "content": "I'm having trouble connecting to my brain."})
            except Exception as e:
                st.error(f"AI Service Unavailable: {str(e)}")
            st.rerun()