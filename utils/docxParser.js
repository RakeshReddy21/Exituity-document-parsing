const mammoth = require('mammoth');
const fs = require('fs');
const XLSX = require('xlsx');

/**
 * Extract text from DOCX file
 * @param {string} filePath - Path to DOCX file
 * @returns {Promise<Object>} Extracted text and metadata
 */
async function extractDOCXText(filePath) {
    try {
        const result = await mammoth.extractRawText({ path: filePath });
        const text = result.value;
        const messages = result.messages;
        
        // Estimate page count (rough calculation: ~500 words per page)
        const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
        const estimatedPages = Math.max(1, Math.ceil(wordCount / 500));
        
        // Extract tables from DOCX
        const extractedTables = [];
        try {
            // Use mammoth to extract tables
            const tableResult = await mammoth.extractRawText({ path: filePath });
            
            // Simple table detection based on text patterns
            // This is a basic implementation - more sophisticated table detection could be added
            const lines = text.split('\n');
            let currentTable = [];
            let tableIndex = 0;
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                // Check if line looks like a table row (contains multiple tab-separated or space-separated values)
                if (line.includes('\t') || (line.split(/\s{2,}/).length > 2)) {
                    const cells = line.split(/\t|\s{2,}/).filter(cell => cell.trim() !== '');
                    if (cells.length > 1) {
                        currentTable.push(cells);
                    }
                } else if (currentTable.length > 0) {
                    // End of table detected
                    if (currentTable.length > 1) { // Only add tables with more than one row
                        extractedTables.push({
                            pageNumber: 1, // DOCX doesn't have clear page breaks
                            tableIndex: tableIndex++,
                            data: currentTable,
                            structure: {
                                rows: currentTable.length,
                                columns: currentTable[0] ? currentTable[0].length : 0
                            }
                        });
                    }
                    currentTable = [];
                }
            }
            
            // Add the last table if it exists
            if (currentTable.length > 1) {
                extractedTables.push({
                    pageNumber: 1,
                    tableIndex: tableIndex,
                    data: currentTable,
                    structure: {
                        rows: currentTable.length,
                        columns: currentTable[0] ? currentTable[0].length : 0
                    }
                });
            }
        } catch (tableError) {
            console.log('Table extraction failed for DOCX:', tableError.message);
        }
        
        return {
            text: text,
            metadata: {
                pageCount: estimatedPages,
                extractionConfidence: messages.length === 0 ? 95 : 85,
                processedPages: Array.from({ length: estimatedPages }, (_, i) => i + 1)
            },
            tables: extractedTables
        };
    } catch (error) {
        console.error('DOCX parsing error:', error);
        throw new Error(`Failed to extract DOCX content: ${error.message}`);
    }
}

module.exports = { extractDOCXText };
