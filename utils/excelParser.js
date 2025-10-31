const XLSX = require('xlsx');
const fs = require('fs');

/**
 * Extract data from Excel files (XLSX, XLS)
 * @param {string} filePath - Path to Excel file
 * @returns {Promise<Object>} Extracted data and tables
 */
async function extractExcelData(filePath) {
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetNames = workbook.SheetNames;
        const extractedTables = [];
        
        let combinedText = '';
        
        // Process each sheet
        sheetNames.forEach((sheetName, index) => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            
            // Convert to text representation
            const textData = jsonData.map(row => row.join('\t')).join('\n');
            combinedText += `Sheet: ${sheetName}\n${textData}\n\n`;
            
            // Store as table
            const cleanData = jsonData.filter(row => row.some(cell => cell !== ''));
            
            if (cleanData.length > 0) {
                extractedTables.push({
                    pageNumber: index + 1,
                    tableIndex: index,
                    data: cleanData,
                    structure: {
                        rows: cleanData.length,
                        columns: cleanData[0] ? cleanData[0].length : 0
                    }
                });
            }
        });
        
        return {
            text: combinedText.trim(),
            metadata: {
                pageCount: sheetNames.length,
                extractionConfidence: 98,
                processedPages: Array.from({ length: sheetNames.length }, (_, i) => i + 1)
            },
            tables: extractedTables
        };
    } catch (error) {
        console.error('Excel parsing error:', error);
        throw new Error(`Failed to extract Excel content: ${error.message}`);
    }
}

module.exports = { extractExcelData };
