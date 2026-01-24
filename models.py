from sqlalchemy import Column, Integer, String, Text,JSON
from app.database import Base
class Contract(Base):
    __tablename__ = "contracts"
    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String(255))
    raw_text = Column(Text)
    apr = Column(Text, nullable=True)
    lease_term_months = Column(Text, nullable=True)
    monthly_payment = Column(Text, nullable=True)
    down_payment = Column(Text, nullable=True)
    residual_value = Column(Text, nullable=True)
    mileage_allowance = Column(Text, nullable=True)
    early_termination_clause= Column(Text, nullable=True)
    purchase_option=Column(Text, nullable=True)
    late_fees=Column(Text, nullable=True)
    
    vin = Column(Text, nullable=True)
    vehicle_make = Column(Text, nullable=True)
    vehicle_model = Column(Text, nullable=True)
    vehicle_year = Column(Text, nullable=True)
    vehicle_type = Column(Text, nullable=True)
    recalls = Column(JSON, nullable=True)