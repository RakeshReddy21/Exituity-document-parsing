const fs = require('fs');

/**
 * Extract text from TXT file
 * @param {string} filePath - Path to TXT file
 * @returns {Promise<Object>} Extracted text and metadata
 */
async function extractTXTText(filePath) {
    try {
        const text = fs.readFileSync(filePath, 'utf-8');
        
        // Estimate page count (rough calculation: ~500 words per page)
        const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
        const estimatedPages = Math.max(1, Math.ceil(wordCount / 500));
        
        return {
            text: text,
            metadata: {
                pageCount: estimatedPages,
                extractionConfidence: 100,
                processedPages: Array.from({ length: estimatedPages }, (_, i) => i + 1)
            },
            tables: []
        };
    } catch (error) {
        console.error('TXT parsing error:', error);
        throw new Error(`Failed to extract TXT content: ${error.message}`);
    }
}

module.exports = { extractTXTText };
