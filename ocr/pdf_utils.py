from pdf2image import convert_from_path
import os

def pdf_to_images(pdf_path: str, output_dir: str):
    images = convert_from_path(pdf_path)
    paths = []

    for i, img in enumerate(images):
        path = os.path.join(output_dir, f"page_{i}.png")
        img.save(path, "PNG")
        paths.append(path)

    return paths
