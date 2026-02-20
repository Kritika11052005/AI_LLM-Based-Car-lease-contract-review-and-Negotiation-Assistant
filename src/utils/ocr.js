
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

export const extractTextFromPDF = async (file, onProgress) => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument(arrayBuffer);
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    let fullText = '';
    console.log(`📄 PDF Loaded. Total Pages: ${numPages}`);

    for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        
        // Try to extract text layer first (faster and more accurate)
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        
        // If text layer has content, use it; otherwise fall back to OCR
        if (pageText.trim().length > 50) {
            console.log(`✓ Page ${i}: Using text layer (${pageText.length} chars)`);
            fullText += `\n--- Page ${i} ---\n${pageText}`;
            if (onProgress) onProgress(i / numPages);
            continue;
        }
        
        // Fallback to OCR for scanned pages
        console.log(`📷 Page ${i}: Using OCR (scanned image)`);
        const viewport = page.getViewport({ scale: 2.5 }); // Higher scale for better OCR
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport }).promise;

        const imageBlob = await new Promise(resolve => canvas.toBlob(resolve));

        // Tesseract Recognize with optimized settings
        const { data: { text } } = await Tesseract.recognize(imageBlob, 'eng', {
            logger: m => {
                if (m.status === 'recognizing text' && onProgress) {
                    onProgress(((i - 1) + m.progress) / numPages);
                }
            },
            tessedit_char_whitelist: 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789 :-$.,()/\\n', // VIN-friendly chars
        });

        fullText += `\n--- Page ${i} ---\n${text}`;
    }
    
    console.log(`✅ OCR Complete. Total extracted text: ${fullText.length} characters`);
    return fullText;
};
