# Exituity Backend - Document Parsing Module

## Overview
I have developed this backend as part of the Exituity Document Parsing Module assignment. The system processes various document types (PDF, DOCX, XLSX, TXT, images) and extracts structured text and table data in a standardized JSON format with metadata.

## Dependencies

### Core Dependencies:
- **express** (^5.1.0) - Web framework for RESTful API
- **mongoose** (^8.19.2) - MongoDB object modeling
- **multer** (^2.0.2) - File upload handling
- **cors** (^2.8.5) - Cross-origin resource sharing
- **dotenv** (^17.2.3) - Environment variable management

### Document Parsing Libraries:
- **pdf-parse** (^2.4.5) - PDF text extraction
- **mammoth** (^1.11.0) - DOCX text extraction
- **xlsx** (^0.18.5) - Excel file parsing (supports XLS and XLSX)
- **tesseract.js** (^6.0.1) - OCR for image files (JPG, JPEG, PNG)
- **uuid** (^13.0.0) - Unique identifier generation

### Development Dependencies:
- **nodemon** (^3.1.10) - Development server with auto-restart
- **jest** (^30.2.0) - Testing framework
- **supertest** (^7.1.4) - HTTP assertions for testing

## Design Choices

### Architecture
I implemented a Model-View-Controller (MVC) architecture to separate concerns:
- **Models**: MongoDB schemas using Mongoose for data persistence
- **Controllers**: Business logic for document processing
- **Routes**: RESTful API endpoints
- **Utils**: Parser modules for each supported file type

### Processing Approach
I chose asynchronous document processing to ensure the API remains responsive. Documents are:
1. Uploaded and stored with unique filenames
2. Metadata saved to MongoDB with "pending" status
3. Processed in background based on file type
4. Status updated to "completed" or "failed" with extracted data

### Output Format
All parsers return a consistent JSON structure:
```json
{
  "text": "extracted text content",
  "tables": [
    {
      "pageNumber": 1,
      "tableIndex": 0,
      "data": [["Header1", "Header2"], ["Row1", "Row2"]],
      "structure": {
        "rows": 2,
        "columns": 2
      }
    }
  ],
  "metadata": {
    "pageCount": 1,
    "extractionConfidence": 95,
    "processedPages": [1],
    "extractionDate": "2025-01-28T..."
  }
}
```

### Library Selection Rationale

1. **pdf-parse**: Selected for its simplicity and reliability in extracting text from PDFs. It provides good performance and handles most PDF formats well. For table extraction, I implemented pattern-based detection from extracted text.

2. **mammoth**: Chose this library for DOCX parsing as it effectively handles Microsoft Word documents and extracts text content reliably. Table detection uses pattern-based analysis on extracted text.

3. **tesseract.js**: Implemented for OCR functionality as it supports both client-side and server-side processing with reasonable accuracy for text-based images.

4. **xlsx**: Selected for Excel parsing because it supports both legacy XLS and modern XLSX formats, providing comprehensive spreadsheet data extraction.

### Database Choice
I selected MongoDB for its flexibility in storing varied document structures and metadata. It allows easy schema evolution and efficient querying of document collections.

## Assumptions

1. **File Size Limit**: I assumed a 10MB maximum file size limit to balance usability and server resource constraints.

2. **Table Extraction**: I implemented pattern-based table detection for PDFs and DOCX files using text patterns (tab-separated or multiple whitespace-separated values). This works well for simple, well-formatted tables. For complex tables with merged cells or irregular formatting, more advanced table extraction libraries (like `pdf-table-extractor` or `pdfjs-dist`) would be needed.

3. **Image Processing**: I assumed images contain primarily text-based content suitable for OCR processing. Handwritten text or complex layouts may require more advanced OCR solutions.

4. **Deployment**: I designed this assuming a single-server deployment. For distributed systems or cloud deployments, additional considerations for file storage, database scaling, and session management would be needed.

5. **Output Format**: I standardized all output to JSON format as specified in the requirements. The format includes text content, extracted tables (with structure preservation), and metadata (page number, file type, extraction confidence).

6. **Error Handling**: I assumed that processing failures should be gracefully handled with error messages stored in the database, allowing users to understand what went wrong during extraction.

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/exituity
```

3. Start the server:
```bash
npm start
```

## Project Structure

```
Backend/
├── config/
│   └── connectDB.js          # MongoDB connection
├── controllers/
│   └── documentController.js # Business logic
├── middleware/
│   └── upload.js             # Multer configuration
├── models/
│   └── Document.js           # MongoDB schema
├── Routes/
│   ├── index.js              # Main router
│   └── documentRoutes.js     # Document routes
└── utils/
    ├── docxParser.js         # DOCX parser
    ├── excelParser.js        # Excel parser
    ├── pdfParser.js          # PDF parser
    ├── ocrParser.js          # OCR parser
    └── txtParser.js          # TXT parser
```
