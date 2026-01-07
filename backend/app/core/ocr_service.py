import PyPDF2
from PIL import Image
import pytesseract
import os

class OCRService:
    """Service for extracting text from PDFs and images"""
    
    @staticmethod
    def extract_from_pdf(file_path: str) -> str:
        """Extract text from PDF"""
        try:
            text = ""
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
            return text.strip()
        except Exception as e:
            raise Exception(f"PDF extraction failed: {str(e)}")
    
    @staticmethod
    def extract_from_image(file_path: str) -> str:
        """Extract text from image using Tesseract OCR"""
        try:
            image = Image.open(file_path)
            text = pytesseract.image_to_string(image)
            return text.strip()
        except Exception as e:
            raise Exception(f"Image OCR failed: {str(e)}")
    
    @staticmethod
    def extract_text(file_path: str) -> str:
        """Automatically detect file type and extract text"""
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if file_ext == '.pdf':
            return OCRService.extract_from_pdf(file_path)
        elif file_ext in ['.png', '.jpg', '.jpeg', '.bmp', '.tiff']:
            return OCRService.extract_from_image(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")