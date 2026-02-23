import uuid
import datetime
from sqlalchemy import Column, String, Integer, Float, ForeignKey, JSON, DateTime, Text, Numeric
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base

# =========================
# USERS
# =========================
class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(40))
    full_name = Column(String(200))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    contracts = relationship("Contract", back_populates="user")
    negotiation_threads = relationship("NegotiationThread", back_populates="user")

# =========================
# VEHICLES
# =========================
class Vehicle(Base):
    __tablename__ = "vehicles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vin = Column(String(17), nullable=True, unique=True) # Changed to nullable=True as OCR might fail initially
    year = Column(Integer)
    make = Column(String(128))
    model = Column(String(128))
    body_class = Column(String(128))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    contracts = relationship("Contract", back_populates="vehicle")

# =========================
# CONTRACTS
# =========================
class Contract(Base):
    __tablename__ = "contracts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=True)
    
    contract_type = Column(String(50), default="lease") 
    doc_status = Column(String(50)) 
    
    # ✅ ADDED: Raw Text Storage
    raw_text = Column(Text, nullable=True) 
    
    vin = Column(String(17), nullable=True)
    vehicle_make = Column(String(128), nullable=True)
    vehicle_model = Column(String(128), nullable=True)
    vehicle_year = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # ✅ ADDED: Market Value
    market_value = Column(Float, nullable=True)

    user = relationship("User", back_populates="contracts")
    vehicle = relationship("Vehicle", back_populates="contracts")
    sla = relationship("ContractSLA", back_populates="contract", uselist=False) # Renamed back_populates to match SLA
    negotiation_threads = relationship("NegotiationThread", back_populates="contract")
    extractions = relationship("Extraction", back_populates="contract")

# =========================
# EXTRACTIONS
# =========================
class Extraction(Base):
    __tablename__ = "extractions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    model_name = Column(String(120))
    status = Column(String(50)) 
    raw_output = Column(JSONB)
    error_message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    contract = relationship("Contract", back_populates="extractions")

# =========================
# CONTRACT SLA
# =========================
class ContractSLA(Base):
    __tablename__ = "contract_sla"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    
    # Financials (Converted Numeric -> Float for consistency with main.py math)
    apr_percent = Column(Float)
    money_factor = Column(Float)
    term_months = Column(Integer)
    monthly_payment = Column(String) # Keep String to handle currency symbols if needed
    down_payment = Column(Float)
    residual_value = Column(Float)
    
    # Descriptions
    early_termination_fee = Column(Text) 
    purchase_option_price = Column(Text)
    
    # Analysis Data
    contract_data = Column(JSONB)        
    negotiation_report = Column(JSONB)   
    fairness_score = Column(Integer)    
    llm_summary = Column(Text) 

    # Other Terms
    mileage_allowance_yr = Column(Integer)
    mileage_overage_fee = Column(Float)
    disposition_fee = Column(Float) 
    maintenance_resp = Column(Text)
    warranty_summary = Column(Text)
    late_fee_policy = Column(Text)
    other_terms = Column(JSONB)
    
    # ✅ ADDED: New Financials
    dealer_price = Column(Float, nullable=True)
    buyout_price = Column(Float, nullable=True)
    
    contract = relationship("Contract", back_populates="sla")

# =========================
# NEGOTIATION LOGIC
# =========================
class NegotiationThread(Base):
    __tablename__ = "negotiation_threads"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    channel = Column(String(50), default="chat")
    subject = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="negotiation_threads")
    contract = relationship("Contract", back_populates="negotiation_threads")
    messages = relationship("NegotiationMessage", back_populates="thread")

class NegotiationMessage(Base):
    __tablename__ = "negotiation_messages"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id = Column(UUID(as_uuid=True), ForeignKey("negotiation_threads.id"), nullable=False)
    sender_role = Column(String(40)) 
    body = Column(Text)
    suggested_text = Column(Text)
    sent_at = Column(DateTime(timezone=True), server_default=func.now(), index=True) 

    thread = relationship("NegotiationThread", back_populates="messages")

class VehicleRecall(Base):
    __tablename__ = "vehicle_recalls"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=False)
    component = Column(String, nullable=True)
    summary = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)