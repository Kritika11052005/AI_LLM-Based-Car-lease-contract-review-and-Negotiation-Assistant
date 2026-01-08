import pytesseract
from PIL import Image

def extract_text_from_image(image_path: str) -> str:
    return pytesseract.image_to_string(Image.open(image_path))
