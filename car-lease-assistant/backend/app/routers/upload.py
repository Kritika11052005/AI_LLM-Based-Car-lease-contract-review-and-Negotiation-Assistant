from fastapi import APIRouter, File, UploadFile, HTTPException
import PyPDF2
import io

router = APIRouter(prefix="/api/upload", tags=["upload"])

def extract_text(file_content: bytes) -> str:
    try:
        pdf = io.BytesIO(file_content)
        reader = PyPDF2.PdfReader(pdf)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PDF error: {str(e)}")

@router.post("/contract")
async def upload_contract(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDF files only")
    
    content = await file.read()
    
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    
    text = extract_text(content)
    
    if len(text) < 50:
        raise HTTPException(status_code=400, detail="No text extracted")
    
    return {
        "filename": file.filename,
        "text_length": len(text),
        "preview": text[:300]
    }

@router.get("/test")
def test():
    return {"status": "Upload router working"}