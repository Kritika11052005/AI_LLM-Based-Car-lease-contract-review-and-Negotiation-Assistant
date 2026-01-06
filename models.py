from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from db import Base

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    raw_text = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
