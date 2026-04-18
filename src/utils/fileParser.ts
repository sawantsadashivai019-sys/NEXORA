import * as pdfjs from 'pdfjs-dist';
// No longer importing the worker as a module
import mammoth from 'mammoth';

// Set up the PDF.js worker using a stable CDN URL. This is a more robust
// method than using module imports for the worker script.
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.5.136/build/pdf.worker.min.mjs`;


export const parseFile = async (file: File): Promise<string> => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
        case 'txt':
        case 'md':
        case 'json':
            return parseTextFile(file);
        case 'pdf':
            return parsePdfFile(file);
        case 'docx':
            return parseDocxFile(file);
        default:
            // Fallback for unsupported types, try to read as text.
            console.warn(`Unsupported file type: .${extension}. Attempting to read as text.`);
            return parseTextFile(file);
    }
};

const parseTextFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            resolve(e.target?.result as string);
        };
        reader.onerror = (e) => {
            reject(new Error("Error reading text file."));
        };
        reader.readAsText(file);
    });
};

const parsePdfFile = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument(arrayBuffer).promise;
    let content = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        content += textContent.items.map(item => 'str' in item ? item.str : '').join(' ');
        content += '\n\n'; // Add space between pages
    }
    return content;
};

const parseDocxFile = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
    return result.value;
};