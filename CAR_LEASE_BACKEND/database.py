import os
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Float, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.sql import func
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/car_lease_db")

# Create engine
engine = create_engine(DATABASE_URL)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

class Contract(Base):
    __tablename__ = "contracts"
    
    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer)
    file_type = Column(String(50))
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(Integer, nullable=True)
    
    # Relationships
    ocr_texts = relationship("OCRText", back_populates="contract", cascade="all, delete-orphan")
    slas = relationship("SLA", back_populates="contract", cascade="all, delete-orphan")

class OCRText(Base):
    __tablename__ = "ocr_texts"
    
    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)
    raw_text = Column(Text, nullable=False)
    extraction_date = Column(DateTime(timezone=True), server_default=func.now())
    confidence_score = Column(Float, nullable=True)
    
    # Relationships
    contract = relationship("Contract", back_populates="ocr_texts")

class SLA(Base):
    __tablename__ = "slas"
    
    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)
    apr = Column(Float, nullable=True)
    lease_term_months = Column(Integer, nullable=True)
    monthly_payment = Column(Float, nullable=True)
    down_payment = Column(Float, nullable=True)
    residual_value = Column(Float, nullable=True)
    mileage_allowance = Column(Integer, nullable=True)
    overage_charge_per_mile = Column(Float, nullable=True)
    early_termination_fee = Column(Float, nullable=True)
    purchase_option_price = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    contract = relationship("Contract", back_populates="slas")

# Create tables
def create_tables():
    Base.metadata.create_all(bind=engine)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()