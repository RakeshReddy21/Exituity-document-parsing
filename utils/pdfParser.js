const { PDFParse } = require('pdf-parse');
const fs = require('fs');

/**
 * Extract text from PDF file
 * @param {string} filePath - Path to PDF file
 * @returns {Promise<Object>} Extracted text and metadata
 */
async function extractPDFText(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const parser = new PDFParse({ data: new Uint8Array(dataBuffer) });
        await parser.load();
        
        const textResult = await parser.getText();
        
        // Extract tables from each page
        const extractedTables = [];
        for (let pageNum = 1; pageNum <= parser.doc.numPages; pageNum++) {
            try {
                const pageTables = await parser.getPageTables(pageNum);
                if (pageTables && pageTables.length > 0) {
                    pageTables.forEach((table, tableIndex) => {
                        if (table && table.rows && table.rows.length > 0) {
                            const tableData = table.rows.map(row => 
                                row.cells ? row.cells.map(cell => cell.text || '') : []
                            );
                            
                            extractedTables.push({
                                pageNumber: pageNum,
                                tableIndex: tableIndex,
                                data: tableData,
                                structure: {
                                    rows: tableData.length,
                                    columns: tableData[0] ? tableData[0].length : 0
                                }
                            });
                        }
                    });
                }
            } catch (tableError) {
                console.log(`Table extraction failed for page ${pageNum}:`, tableError.message);
            }
        }
        
        return {
            text: textResult.text,
            metadata: {
                pageCount: parser.doc.numPages,
                extractionConfidence: 95, // PDFs have high confidence
                processedPages: Array.from({ length: parser.doc.numPages }, (_, i) => i + 1)
            },
            tables: extractedTables
        };
    } catch (error) {
        console.error('PDF parsing error:', error);
        throw new Error(`Failed to extract PDF content: ${error.message}`);
    }
}

module.exports = { extractPDFText };
