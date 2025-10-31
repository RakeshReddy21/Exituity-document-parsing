const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: true,
        trim: true
    },
    originalName: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    fileType: {
        type: String,
        required: true,
        enum: ['pdf', 'docx', 'xlsx', 'xls', 'txt', 'jpg', 'jpeg', 'png']
    },
    fileSize: {
        type: Number,
        required: true
    },
    processingStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    // Parsed content
    extractedText: {
        type: String,
        default: ''
    },
    extractedTables: [{
        pageNumber: Number,
        tableIndex: Number,
        data: mongoose.Schema.Types.Mixed, // Store table as array of rows
        structure: {
            rows: Number,
            columns: Number
        }
    }],
    // Metadata
    metadata: {
        pageCount: {
            type: Number,
            default: 0
        },
        extractionConfidence: {
            type: Number,
            default: 0
        },
        processedPages: [Number],
        extractionDate: {
            type: Date,
            default: Date.now
        }
    },
    errorMessage: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Index for faster queries
documentSchema.index({ fileType: 1, processingStatus: 1 });
documentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Document', documentSchema);
