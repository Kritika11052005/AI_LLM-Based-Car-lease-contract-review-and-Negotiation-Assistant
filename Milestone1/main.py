import io
import os
from fastapi import FastAPI, UploadFile, File
from PyPDF2 import PdfReader
import pytesseract
from pdf2image import convert_from_bytes

from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, Text,Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment. Check your .env file.")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Contract(Base):
    __tablename__ = "contracts"
    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String(255))
    raw_text = Column(Text)
    apr = Column(Float, nullable=True)
    lease_term_months = Column(Integer, nullable=True)
    monthly_payment = Column(Float, nullable=True)
    down_payment = Column(Float, nullable=True)
    residual_value = Column(Float, nullable=True)
    mileage_allowance = Column(Integer, nullable=True)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Milestone-1: Secure Document Upload & Store")

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    content = await file.read()
    name = file.filename.lower()

    if not name.endswith(".pdf"):
        return {"error": "Only PDF files are supported"}

    extracted_text = ""
    reader = PdfReader(io.BytesIO(content))
    for page in reader.pages:
        extracted_text += page.extract_text() or ""
    if extracted_text.strip() == "":
        images = convert_from_bytes(content)
        for img in images:
            extracted_text += pytesseract.image_to_string(img)

    db = SessionLocal()
    try:
        new_contract = Contract(file_name=file.filename, raw_text=extracted_text)
        db.add(new_contract)
        db.commit()
        db.refresh(new_contract)
    finally:
        db.close()

    return {
        "message": "Contract uploaded and stored securely",
        "db_id": new_contract.id,
        "file_name": file.filename,
        "text_length": len(extracted_text)
    }
