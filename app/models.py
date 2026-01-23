from sqlalchemy import Column, Integer, String, Text, Float, DateTime
from datetime import datetime
from app.database import Base

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    file_path = Column(String)
    raw_text = Column(Text)  # OCR Text from Milestone 1
    created_at = Column(DateTime, default=datetime.utcnow)

    # --- SLA Fields (Week 3) ---
    apr = Column(Float, nullable=True)
    lease_term_months = Column(Integer, nullable=True)
    monthly_payment = Column(Float, nullable=True)
    down_payment = Column(Float, nullable=True)
    residual_value = Column(Float, nullable=True)
    mileage_allowance = Column(String, nullable=True)
    overage_charges = Column(String, nullable=True)
    early_termination_clause = Column(Text, nullable=True)
    purchase_option = Column(String, nullable=True)
    maintenance_responsibilities = Column(Text, nullable=True)
    warranty_coverage = Column(Text, nullable=True)
    late_fees = Column(String, nullable=True)

    # --- Vehicle & API Fields (Week 4) ---
    vin = Column(String, nullable=True)
    vehicle_make = Column(String, nullable=True)
    vehicle_model = Column(String, nullable=True)
    vehicle_year = Column(String, nullable=True)
    recalls = Column(Text, nullable=True) # Stores the JSON string of recalls