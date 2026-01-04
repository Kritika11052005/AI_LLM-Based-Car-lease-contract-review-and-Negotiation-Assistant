from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document
from pdf2image import convert_from_path
import pytesseract

TEXT_THRESHOLD = 300  # characters


def extract_text_with_langchain(pdf_path: str):
    """
    Smart PDF extraction:
    1. Try PyPDFLoader (text-based PDFs)
    2. If extracted text is too small, fallback to OCR
    Returns: List[Document]
    """

    try:
        loader = PyPDFLoader(pdf_path)
        docs = loader.load()

        combined_text = " ".join(d.page_content for d in docs)

        if len(combined_text.strip()) > TEXT_THRESHOLD:
            print("✓ Extracted using PyPDFLoader")
            return docs

    except Exception as e:
        print("⚠ PyPDFLoader failed:", e)

    print("↪ Falling back to OCR")
    return extract_text_with_ocr(pdf_path)


def extract_text_with_ocr(pdf_path: str):
    images = convert_from_path(pdf_path)
    text = ""

    for img in images:
        text += pytesseract.image_to_string(img)

    return [Document(page_content=text)]
