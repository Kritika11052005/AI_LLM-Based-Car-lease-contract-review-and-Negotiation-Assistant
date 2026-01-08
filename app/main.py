from fastapi import FastAPI, UploadFile, File
import os
import shutil
from app.ocr import extract_text_from_pdf

app = FastAPI(title="AI Car Lease Contract Analyzer")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "data", "contracts")

os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/")
def root():
    return {"status": "Car Lease AI API running"}

@app.post("/upload")
async def upload_contract(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "message": "Contract uploaded successfully",
        "filename": file.filename
    }

@app.get("/extract-text/{filename}")
def extract_text(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)

    if not os.path.exists(file_path):
        return {"error": "File not found"}

    text = extract_text_from_pdf(file_path)

    return {
        "filename": filename,
        "extracted_text": text
    }
