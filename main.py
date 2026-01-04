from fastapi import FastAPI, UploadFile, File
import os
import pdfplumber
import sqlite3

app = FastAPI()

# 1. SETUP FOLDERS & DATABASE
UPLOAD_DIR = "uploaded_contracts"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# This creates a simple database file named "contracts.db"
def init_db():
    conn = sqlite3.connect("contracts.db")
    cursor = conn.cursor()
    # We create a table to store the filename and the text we find
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS contracts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT,
            extracted_text TEXT
        )
    """)
    conn.commit()
    conn.close()

# Run the database setup immediately
init_db()

@app.get("/")
def home():
    return {"message": "Car Lease Assistant: Ready to Read!"}

@app.post("/upload")
async def upload_contract(file: UploadFile = File(...)):
    # A. SAVE THE FILE
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())
    
    # B. EXTRACT TEXT (The "Reading" Part)
    extracted_text = ""
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"
    except Exception as e:
        return {"error": f"Failed to read PDF: {str(e)}"}

    # C. SAVE TO DATABASE (The "Memory" Part)
    conn = sqlite3.connect("contracts.db")
    cursor = conn.cursor()
    cursor.execute("INSERT INTO contracts (filename, extracted_text) VALUES (?, ?)", 
                   (file.filename, extracted_text))
    conn.commit()
    conn.close()
    
    # D. SHOW THE RESULT
    return {
        "status": "Success",
        "filename": file.filename,
        "message": "File saved and text extracted!",
        "preview_text": extracted_text[:200] + "..." # Show first 200 characters
    }