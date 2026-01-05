import os
from langchain.document_loaders import PyPDFLoader
from langchain.schema import Document
from pdf2image import convert_from_path
import pytesseract

def extract_text_with_langchain(file_path: str):
    """
    Extract text from PDF using LangChain PyPDFLoader.
    If extraction is empty, fallback to OCR using pdf2image + pytesseract.
    
    Args:
        file_path: Path to the PDF file
        
    Returns:
        List of Document objects with page_content
    """
    docs = []
    
    try:
        # Step 1: Try LangChain PyPDFLoader
        loader = PyPDFLoader(file_path)
        docs = loader.load()
        
        # Check if extraction is empty
        raw_text = "\n".join(d.page_content for d in docs)
        
        if not raw_text.strip():
            print("⚠️  PyPDFLoader returned empty text, attempting OCR fallback...")
            docs = ocr_fallback(file_path)
        else:
            print(f"✓ Extracted {len(docs)} pages via PyPDFLoader")
            
    except Exception as e:
        print(f"⚠️  PyPDFLoader failed: {e}, attempting OCR fallback...")
        docs = ocr_fallback(file_path)
    
    return docs


def ocr_fallback(file_path: str):
    """
    OCR fallback: Convert PDF to images using pdf2image and OCR with pytesseract.
    
    Args:
        file_path: Path to the PDF file
        
    Returns:
        List of Document objects with page_content from OCR
    """
    docs = []
    
    try:
        # Convert PDF to images
        images = convert_from_path(file_path)
        print(f"✓ Converted PDF to {len(images)} images")
        
        # OCR each page
        for idx, image in enumerate(images, 1):
            ocr_text = pytesseract.image_to_string(image)
            doc = Document(page_content=ocr_text)
            docs.append(doc)
        
        print(f"✓ OCR completed: {len(docs)} pages extracted")
        
    except Exception as e:
        print(f"❌ OCR fallback failed: {e}")
        # Return empty document to prevent crash
        docs = [Document(page_content="")]
    
    return docs
