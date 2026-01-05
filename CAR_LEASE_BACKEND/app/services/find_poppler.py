import os

print("Checking Poppler installation...\n")

# Try different variations of the path
possible_paths = [
    r"C:\Release-25.12.0-0.zip\poppler-25.12.0\Library\bin",
    r"C:\Release-25.12.0-0\poppler-25.12.0\Library\bin",  # Without .zip in path
    r"C:\poppler-25.12.0\Library\bin",
    r"C:\Release-25.12.0\Library\bin",
]

for path in possible_paths:
    print(f"Checking: {path}")
    if os.path.exists(path):
        print(f"✓ EXISTS!")
        files = os.listdir(path)
        exe_files = [f for f in files if f.endswith('.exe')]
        print(f"  Contains {len(exe_files)} executables:")
        for exe in sorted(exe_files)[:5]:  # Show first 5
            print(f"    - {exe}")
        if len(exe_files) > 5:
            print(f"    ... and {len(exe_files)-5} more")
        break
    else:
        print("✗ Does not exist")
    print()