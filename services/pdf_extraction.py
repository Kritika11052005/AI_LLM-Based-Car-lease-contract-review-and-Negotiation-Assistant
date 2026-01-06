import os
from langchain_community.document_loaders import PyPDFLoader
import pytesseract
from pdf2image import convert_from_path
from PIL import Image

# For Windows users: Update these paths if Tesseract/Poppler are not in System PATH
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
# POPPLER_PATH = r'C:\Program Files\poppler-xx\Library\bin'

def extract_text_from_pdf(file_path: str) -> str:
    """
    Extracts text from a PDF. Uses LangChain's PyPDFLoader first.
    If the extracted text is empty or too short, falls back to OCR.
    """
    # 1. Try LangChain PyPDFLoader (Text-based PDF)
    try:
        loader = PyPDFLoader(file_path)
        pages = loader.load()
        text = " ".join([page.page_content for page in pages])
        
        # If we got substantial text, return it
        if len(text.strip()) > 100:
            return text
    except Exception as e:
        print(f"PyPDFLoader failed: {e}")

    # 2. Fallback to OCR (Scanned PDF)
    return perform_ocr(file_path)

def perform_ocr(file_path: str) -> str:
    """
    Converts PDF pages to images and performs OCR using Tesseract.
    """
    try:
        # Convert PDF to images
        # images = convert_from_path(file_path, poppler_path=POPPLER_PATH) # Use this if poppler not in PATH
        images = convert_from_path(file_path)
        
        ocr_text = ""
        for i, image in enumerate(images):
            page_text = pytesseract.image_to_string(image)
            ocr_text += page_text + "\n"
        
        return ocr_text
    except Exception as e:
        return f"OCR extraction failed: {e}"
