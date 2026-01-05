print("=== Python Test ===")
print()

import sys
print(f"Python Version: {sys.version}")
print(f"Python Path: {sys.executable}")
print()

# Test imports
tests = [
    ("fastapi", "FastAPI"),
    ("uvicorn", "UVicorn"),
    ("pytesseract", "Tesseract"),
    ("PIL", "Pillow"),
    ("pdf2image", "PDF2Image"),
    ("psycopg2", "PostgreSQL"),
    ("sqlalchemy", "SQLAlchemy"),
    ("dotenv", "dotenv"),
]

print("Testing imports:")
print("-" * 40)

all_ok = True
for import_name, display_name in tests:
    try:
        if import_name == "PIL":
            from PIL import Image
            print(f"✓ {display_name}: OK")
        else:
            __import__(import_name)
            print(f"✓ {display_name}: OK")
    except ImportError:
        print(f"✗ {display_name}: NOT FOUND")
        all_ok = False
    except Exception as e:
        print(f"⚠ {display_name}: ERROR - {str(e)[:50]}")
        all_ok = False

print("-" * 40)
if all_ok:
    print("✅ ALL PACKAGES INSTALLED SUCCESSFULLY!")
else:
    print("⚠ Some packages missing or have errors")