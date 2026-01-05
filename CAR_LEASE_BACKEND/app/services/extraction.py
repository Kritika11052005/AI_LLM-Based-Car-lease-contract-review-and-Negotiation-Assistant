import pytesseract
from PIL import Image
import pdf2image
import os
from typing import Tuple
import tempfile

# Configure Tesseract path for Windows
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Configure Poppler path - ADJUST THIS TO YOUR ACTUAL PATH
POPPLER_PATH = r'C:\poppler\Library\bin'  # Change this if your poppler is elsewhere

def extract_text_from_file(file_path: str) -> Tuple[str, float]:
    """
    Extract text from PDF or image file using Tesseract OCR
    """
    try:
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if file_ext == '.pdf':
            return extract_text_from_pdf(file_path)
        elif file_ext in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']:
            return extract_text_from_image(file_path)
        else:
            raise Exception(f"Unsupported file type: {file_ext}")
    
    except Exception as e:
        raise Exception(f"Error extracting text from file: {str(e)}")

def extract_text_from_image(image_path: str) -> Tuple[str, float]:
    """
    Extract text from image file
    """
    try:
        # Open image
        image = Image.open(image_path)
        
        # Use pytesseract to extract text with confidence data
        data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
        
        # Extract text and confidence scores
        text_parts = []
        confidences = []
        
        for i in range(len(data['text'])):
            if int(data['conf'][i]) > 0:  # Ignore low confidence items
                text_parts.append(data['text'][i])
                confidences.append(int(data['conf'][i]))
        
        extracted_text = ' '.join(text_parts)
        
        # Calculate average confidence
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        
        return extracted_text.strip(), avg_confidence
    
    except Exception as e:
        raise Exception(f"Error extracting text from image: {str(e)}")

def extract_text_from_pdf(pdf_path: str) -> Tuple[str, float]:
    """
    Extract text from PDF file by converting each page to image
    """
    try:
        all_text = []
        all_confidences = []
        
        # Check if poppler path exists
        if not os.path.exists(POPPLER_PATH):
            raise Exception(f"Poppler not found at: {POPPLER_PATH}. Please check the path.")
        
        # Convert PDF to images
        images = pdf2image.convert_from_path(
            pdf_path, 
            poppler_path=POPPLER_PATH
        )
        
        # Process each page
        for page_num, image in enumerate(images):
            # Save temporary image
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
                temp_path = temp_file.name
                image.save(temp_path, 'JPEG', quality=85)
            
            try:
                # Extract text from the page image
                page_text, page_confidence = extract_text_from_image(temp_path)
                if page_text.strip():  # Only add if text was extracted
                    all_text.append(f"--- Page {page_num + 1} ---\n{page_text}")
                    all_confidences.append(page_confidence)
            finally:
                # Clean up temporary file
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
        
        # Combine all text
        extracted_text = '\n\n'.join(all_text)
        
        # Calculate average confidence across all pages
        avg_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0
        
        return extracted_text.strip(), avg_confidence
    
    except Exception as e:
        raise Exception(f"Error extracting text from PDF: {str(e)}")