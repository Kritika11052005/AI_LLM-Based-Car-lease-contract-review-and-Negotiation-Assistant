from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True)
    file_name = Column(String(255))
    file_path = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    ocr_texts = relationship("OCRText", back_populates="contract", cascade="all, delete")

class OCRText(Base):
    __tablename__ = "ocr_texts"

    id = Column(Integer, primary_key=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"))
    raw_text = Column(Text)
    extracted_at = Column(DateTime(timezone=True), server_default=func.now())

    contract = relationship("Contract", back_populates="ocr_texts")
