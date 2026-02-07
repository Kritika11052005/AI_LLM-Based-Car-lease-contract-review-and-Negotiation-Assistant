import uuid
from sqlalchemy import Column, String, Integer, Numeric, Text, ForeignKey, DateTime, func, Boolean, Date
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
    created_at = Column(DateTime(timezone=True), default=func.now())
    
    contracts = relationship("Contract", back_populates="user")
    negotiation_threads = relationship("NegotiationThread", back_populates="user")

# =========================
# VEHICLES
# =========================
class Vehicle(Base):
    __tablename__ = "vehicles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vin = Column(String(17), nullable=False, unique=True)
    year = Column(Integer)
    make = Column(String(128))
    model = Column(String(128))
    body_class = Column(String(128))
    created_at = Column(DateTime(timezone=True), default=func.now())
    
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
    raw_text = Column(Text, nullable=True) 
    
    vin = Column(String(17), nullable=True)
    vehicle_make = Column(String(128), nullable=True)
    vehicle_model = Column(String(128), nullable=True)
    vehicle_year = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now())

    user = relationship("User", back_populates="contracts")
    vehicle = relationship("Vehicle", back_populates="contracts")
    sla_analysis = relationship("ContractSLA", back_populates="contract", uselist=False)
    negotiation_threads = relationship("NegotiationThread", back_populates="contract")
    # Added this back to fix the ImportError in services
    extractions = relationship("Extraction", back_populates="contract")

# =========================
# EXTRACTIONS (Added to fix ImportError)
# =========================
class Extraction(Base):
    __tablename__ = "extractions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    model_name = Column(String(120))
    status = Column(String(50)) # e.g., 'pending', 'completed', 'failed'
    raw_output = Column(JSONB)
    error_message = Column(Text)
    created_at = Column(DateTime(timezone=True), default=func.now())

    contract = relationship("Contract", back_populates="extractions")

# =========================
# CONTRACT SLA
# =========================
class ContractSLA(Base):
    __tablename__ = "contract_sla"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    
    # Financials
    apr_percent = Column(Numeric(6, 3))
    money_factor = Column(Numeric(10, 6))
    term_months = Column(Integer)
    monthly_payment = Column(Text)  # Matches SQL ALTER to TEXT
    down_payment = Column(Numeric(12, 2))
    residual_value = Column(Numeric(12, 2))
    
    # These match the SQL TEXT types for flexible policy descriptions
    early_termination_fee = Column(Text) 
    purchase_option_price = Column(Text)
    
    # NEW COLUMNS ADDED VIA MIGRATION
    contract_data = Column(JSONB)        # The single combined JSON for Swagger
    negotiation_report = Column(JSONB)   # Hidden flags for the Chat Assistant
    fairness_score = Column(Integer)     # Numeric score 0-100

    # Remaining existing fields
    mileage_allowance_yr = Column(Integer)
    mileage_overage_fee = Column(Numeric(8, 4))
    disposition_fee = Column(Numeric(12, 2)) 
    maintenance_resp = Column(Text)
    warranty_summary = Column(Text)
    late_fee_policy = Column(Text)
    other_terms = Column(JSONB)
    
    contract = relationship("Contract", back_populates="sla_analysis")

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
    created_at = Column(DateTime(timezone=True), default=func.now())

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
    # Change this line:
    sent_at = Column(DateTime(timezone=True), server_default=func.now(), index=True) 

    thread = relationship("NegotiationThread", back_populates="messages")