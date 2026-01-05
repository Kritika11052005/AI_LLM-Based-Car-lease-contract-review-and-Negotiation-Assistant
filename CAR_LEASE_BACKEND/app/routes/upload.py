import os
from fastapi import APIRouter, File, UploadFile
from sqlalchemy import text
from database import SessionLocal
from app.services.extraction import extract_text_with_langchain

router = APIRouter()

@router.post("/upload")
async def upload_contract(file: UploadFile = File(...)):
    """
    Upload PDF contract, extract text, and store in PostgreSQL.
    
    Flow:
    1. Save uploaded file to contracts/
    2. Extract text using LangChain (with OCR fallback)
    3. Insert into PostgreSQL using SQLAlchemy text()
    4. Return success response with filename and character count
    """
    try:
        # Step 1: Generate safe filename
        safe_name = file.filename.replace(" ", "_")
        
        # Step 2: Save file to contracts/
        contracts_dir = "contracts"
        os.makedirs(contracts_dir, exist_ok=True)
        file_path = os.path.join(contracts_dir, safe_name)
        
        with open(file_path, "wb") as f:
            f.write(await file.read())
        
        print(f"✓ File saved: {file_path}")
        
        # Step 3: Extract text using LangChain
        docs = extract_text_with_langchain(file_path)
        
        # Step 4: Combine all pages into raw_text
        raw_text = "\n".join(d.page_content for d in docs)
        
        # Step 5: Clean extracted text (remove null bytes)
        extracted_text = raw_text.replace("\x00", "")
        
        # Step 6: Insert into PostgreSQL using SQLAlchemy text()
        db = SessionLocal()
        db.execute(
            text("INSERT INTO contracts (filename, raw_text) VALUES (:f, :t)"),
            {"f": safe_name, "t": extracted_text}
        )
        db.commit()
        db.close()
        
        print(f"✓ Inserted into database: {safe_name} ({len(extracted_text)} characters)")
        
        # Step 7: Return success response
        return {
            "message": "Uploaded & processed",
            "filename": safe_name,
            "characters": len(extracted_text)
        }
        
    except Exception as e:
        # Step 8: Error handling
        print("UPLOAD ERROR:", repr(e))
        return {"error": str(e)}
