import pytesseract
from pdf2image import convert_from_path
from pathlib import Path

# If you are on Windows, specify your Tesseract path here:
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def extract_text_from_pdf(pdf_path: str) -> str:
    # Convert PDF pages to images
    pages = convert_from_path(pdf_path)
    full_text = ""
    
    for page in pages:
        # Perform OCR on each image
        text = pytesseract.image_to_string(page)
        full_text += text + "\n"
        
    return full_text