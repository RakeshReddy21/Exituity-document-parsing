const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const {
    uploadDocument,
    getAllDocuments,
    getDocumentById,
    deleteDocument,
    getDocumentProgress
} = require('../controllers/documentController');

// Upload document
router.post('/upload', upload.single('document'), uploadDocument);

// Get all documents
router.get('/documents', getAllDocuments);

// Get document by ID
router.get('/documents/:id', getDocumentById);

// Delete document
router.delete('/documents/:id', deleteDocument);

// Get document processing progress
router.get('/documents/:id/progress', getDocumentProgress);

module.exports = router;
