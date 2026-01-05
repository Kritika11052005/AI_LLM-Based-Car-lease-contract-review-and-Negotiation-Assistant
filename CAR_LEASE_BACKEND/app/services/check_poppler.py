import os

print("=" * 60)
print("Poppler Installation Check")
print("=" * 60)

# Check these specific paths from your screenshot
paths_to_check = [
    # From your environment variables
    r"C:\Program Files\nodejs",
    r"C:\Program Files\Tesseract-OCR",
    r"C:\Release-25.12.0-0.zip\poppler-25.12.0\Library\bin",
    
    # Common poppler locations
    r"C:\poppler\bin",
    r"C:\Program Files\poppler\bin",
    r"C:\Program Files (x86)\poppler\bin",
]

print("\nChecking paths from your screenshot and common locations...")

found_poppler = False
for path in paths_to_check:
    print(f"\nChecking: {path}")
    
    if os.path.exists(path):
        print("  ✓ Path exists")
        
        # Check if it contains poppler executables
        try:
            files = os.listdir(path)
            # Look for poppler executables
            poppler_exes = [f for f in files if f.endswith('.exe') and ('pdf' in f.lower() or 'pdfto' in f.lower())]
            
            if poppler_exes:
                print(f"  ✓ Found {len(poppler_exes)} Poppler executables:")
                for exe in sorted(poppler_exes):
                    print(f"    - {exe}")
                found_poppler = True
                
                print(f"\n💡 Use this path in your app/services/extraction.py:")
                print(f'   POPPLER_PATH = r"{path}"')
                break
            else:
                # Check for any executables
                all_exes = [f for f in files if f.endswith('.exe')]
                if all_exes:
                    print(f"  Contains {len(all_exes)} executables (not Poppler):")
                    for exe in sorted(all_exes)[:3]:  # Show first 3
                        print(f"    - {exe}")
                    if len(all_exes) > 3:
                        print(f"    ... and {len(all_exes)-3} more")
        except PermissionError:
            print("  ⚠ Permission denied")
        except Exception as e:
            print(f"  ⚠ Error reading directory: {e}")
    else:
        print("  ✗ Path does not exist")

if not found_poppler:
    print("\n" + "=" * 60)
    print("Poppler NOT FOUND")
    print("=" * 60)
    
    print("\nFrom your screenshot, it seems Poppler might be in a zip file.")
    print("\nDo this:")
    print("1. Open File Explorer")
    print("2. Go to C:\\")
    print("3. Look for 'Release-25.12.0-0.zip' or 'poppler-25.12.0' folder")
    print("4. If it's a .zip file, EXTRACT it to C:\\poppler")
    print("\nOr download fresh from:")
    print("https://github.com/oschwartz10612/poppler-windows/releases")

print("\n" + "=" * 60)
print("Current Working Directory:", os.getcwd())
print("=" * 60)