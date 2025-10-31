const Document = require('../models/Document');
const path = require('path');
const fs = require('fs').promises;
const { createProgressTracker, removeProgressTracker, getProgressTracker } = require('../utils/progressTracker');

// Import parsers
const { extractPDFText } = require('../utils/pdfParser');
const { extractDOCXText } = require('../utils/docxParser');
const { extractExcelData } = require('../utils/excelParser');
const { extractTXTText } = require('../utils/txtParser');
const { extractOCRText } = require('../utils/ocrParser');

/**
 * Upload and process document
 */
const uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                error: 'No file uploaded',
                message: 'Please select a file to upload',
                code: 'NO_FILE_UPLOADED'
            });
        }

        const file = req.file;
        const fileExt = path.extname(file.originalname).toLowerCase().slice(1);
        
        // Enhanced file validation
        const allowedTypes = ['pdf', 'docx', 'xlsx', 'xls', 'txt', 'jpg', 'jpeg', 'png'];
        if (!allowedTypes.includes(fileExt)) {
            return res.status(400).json({
                error: 'Invalid file type',
                message: `File type '${fileExt}' is not supported. Allowed types: ${allowedTypes.join(', ')}`,
                code: 'INVALID_FILE_TYPE'
            });
        }

        // File size validation (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            return res.status(400).json({
                error: 'File too large',
                message: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of 10MB`,
                code: 'FILE_TOO_LARGE'
            });
        }

        // File name validation
        if (!file.originalname || file.originalname.trim().length === 0) {
            return res.status(400).json({
                error: 'Invalid file name',
                message: 'File name cannot be empty',
                code: 'INVALID_FILE_NAME'
            });
        }
        
        // Create document record
        const document = new Document({
            fileName: file.filename,
            originalName: file.originalname,
            filePath: file.path,
            fileType: fileExt,
            fileSize: file.size,
            processingStatus: 'pending'
        });

        await document.save();

        // Create progress tracker
        const progressTracker = createProgressTracker(document._id.toString());
        progressTracker.setStatus('processing', 'Starting document processing');

        // Process document asynchronously
        processDocument(document._id.toString(), file.path, fileExt, progressTracker);

        res.status(201).json({
            message: 'Document uploaded successfully',
            document: {
                id: document._id,
                fileName: document.originalName,
                fileType: document.fileType,
                status: document.processingStatus,
                uploadedAt: document.createdAt
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            error: 'Failed to upload document',
            message: 'An internal server error occurred while processing your request',
            code: 'UPLOAD_ERROR'
        });
    }
};

/**
 * Process document based on file type
 */
async function processDocument(documentId, filePath, fileType, progressTracker) {
    try {
        // Update status to processing
        const document = await Document.findByIdAndUpdate(
            documentId,
            { processingStatus: 'processing' },
            { new: true }
        );

        progressTracker.updateProgress(10, 'Reading file');

        let extractedData;

        // Process based on file type
        progressTracker.updateProgress(30, `Processing ${fileType.toUpperCase()} file`);
        
        switch (fileType) {
            case 'pdf':
                extractedData = await extractPDFText(filePath);
                break;
            case 'docx':
                extractedData = await extractDOCXText(filePath);
                break;
            case 'xlsx':
            case 'xls':
                extractedData = await extractExcelData(filePath);
                break;
            case 'txt':
                extractedData = await extractTXTText(filePath);
                break;
            case 'jpg':
            case 'jpeg':
            case 'png':
                progressTracker.updateProgress(50, 'Performing OCR on image');
                extractedData = await extractOCRText(filePath);
                break;
            default:
                throw new Error('Unsupported file type');
        }

        progressTracker.updateProgress(80, 'Saving extracted data');

        // Update document with extracted data
        await Document.findByIdAndUpdate(documentId, {
            processingStatus: 'completed',
            extractedText: extractedData.text,
            extractedTables: extractedData.tables,
            'metadata.pageCount': extractedData.metadata.pageCount,
            'metadata.extractionConfidence': extractedData.metadata.extractionConfidence,
            'metadata.processedPages': extractedData.metadata.processedPages,
            'metadata.extractionDate': new Date()
        });

        progressTracker.complete();
        console.log(`✅ Document ${documentId} processed successfully`);
    } catch (error) {
        console.error('Processing error:', error);
        
        progressTracker.fail(error);
        
        // Update document with error
        await Document.findByIdAndUpdate(documentId, {
            processingStatus: 'failed',
            errorMessage: error.message
        });
    } finally {
        // Clean up progress tracker after 5 minutes
        setTimeout(() => {
            removeProgressTracker(documentId);
        }, 5 * 60 * 1000);
    }
}

/**
 * Get all documents
 */
const getAllDocuments = async (req, res) => {
    try {
        // Add pagination support
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Add filtering support
        const filter = {};
        if (req.query.fileType) {
            filter.fileType = req.query.fileType;
        }
        if (req.query.status) {
            filter.processingStatus = req.query.status;
        }

        const documents = await Document.find(filter)
            .select('-extractedText -extractedTables.data') // Exclude large fields for list view
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Document.countDocuments(filter);

        res.status(200).json({
            count: documents.length,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            documents
        });
    } catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch documents',
            message: 'An internal server error occurred while fetching documents',
            code: 'FETCH_DOCUMENTS_ERROR'
        });
    }
};

/**
 * Get document by ID
 */
const getDocumentById = async (req, res) => {
    try {
        // Validate ObjectId format
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                error: 'Invalid document ID',
                message: 'Document ID must be a valid MongoDB ObjectId',
                code: 'INVALID_DOCUMENT_ID'
            });
        }

        const document = await Document.findById(req.params.id);

        if (!document) {
            return res.status(404).json({ 
                error: 'Document not found',
                message: 'No document found with the provided ID',
                code: 'DOCUMENT_NOT_FOUND'
            });
        }

        res.status(200).json(document);
    } catch (error) {
        console.error('Get document error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch document',
            message: 'An internal server error occurred while fetching the document',
            code: 'FETCH_DOCUMENT_ERROR'
        });
    }
};

/**
 * Delete document
 */
const deleteDocument = async (req, res) => {
    try {
        // Validate ObjectId format
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                error: 'Invalid document ID',
                message: 'Document ID must be a valid MongoDB ObjectId',
                code: 'INVALID_DOCUMENT_ID'
            });
        }

        const document = await Document.findById(req.params.id);

        if (!document) {
            return res.status(404).json({ 
                error: 'Document not found',
                message: 'No document found with the provided ID',
                code: 'DOCUMENT_NOT_FOUND'
            });
        }

        // Delete file from filesystem
        try {
            await fs.unlink(document.filePath);
        } catch (fileError) {
            console.error('File deletion error:', fileError);
            // Continue with database deletion even if file deletion fails
        }

        // Delete from database
        await Document.findByIdAndDelete(req.params.id);

        res.status(200).json({ 
            message: 'Document deleted successfully',
            deletedDocument: {
                id: document._id,
                fileName: document.originalName,
                fileType: document.fileType
            }
        });
    } catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({ 
            error: 'Failed to delete document',
            message: 'An internal server error occurred while deleting the document',
            code: 'DELETE_DOCUMENT_ERROR'
        });
    }
};

/**
 * Get document processing progress
 */
const getDocumentProgress = async (req, res) => {
    try {
        const documentId = req.params.id;
        const progressTracker = getProgressTracker(documentId);
        
        if (!progressTracker) {
            // Check if document exists in database
            const document = await Document.findById(documentId);
            if (!document) {
                return res.status(404).json({
                    error: 'Document not found',
                    message: 'No document found with the provided ID',
                    code: 'DOCUMENT_NOT_FOUND'
                });
            }
            
            // Return database status if no active progress tracker
            return res.status(200).json({
                documentId,
                status: document.processingStatus,
                progress: document.processingStatus === 'completed' ? 100 : 0,
                step: document.processingStatus,
                elapsed: 0
            });
        }

        res.status(200).json({
            documentId,
            status: progressTracker.status,
            progress: progressTracker.progress,
            step: progressTracker.currentStep,
            elapsed: Date.now() - progressTracker.startTime
        });
    } catch (error) {
        console.error('Get progress error:', error);
        res.status(500).json({
            error: 'Failed to get progress',
            message: 'An internal server error occurred while fetching progress',
            code: 'GET_PROGRESS_ERROR'
        });
    }
};

module.exports = {
    uploadDocument,
    getAllDocuments,
    getDocumentById,
    deleteDocument,
    getDocumentProgress
};
