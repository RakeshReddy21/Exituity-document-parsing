const Tesseract = require('tesseract.js');
const fs = require('fs');

/**
 * Extract text from image files using OCR
 * @param {string} filePath - Path to image file
 * @returns {Promise<Object>} Extracted text and metadata
 */
async function extractOCRText(filePath) {
    try {
        // Read the image file
        const imageBuffer = fs.readFileSync(filePath);
        
        // Perform OCR
        const { data: { text, confidence } } = await Tesseract.recognize(
            imageBuffer,
            'eng', // English language
            {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                    }
                }
            }
        );
        
        // Calculate page count (estimate based on text length)
        const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
        const estimatedPages = Math.max(1, Math.ceil(wordCount / 500));
        
        return {
            text: text.trim(),
            metadata: {
                pageCount: estimatedPages,
                extractionConfidence: Math.round(confidence),
                processedPages: Array.from({ length: estimatedPages }, (_, i) => i + 1)
            },
            tables: [] // OCR doesn't extract tables directly
        };
    } catch (error) {
        console.error('OCR parsing error:', error);
        throw new Error(`Failed to extract OCR content: ${error.message}`);
    }
}

module.exports = { extractOCRText };
