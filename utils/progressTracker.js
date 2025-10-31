const EventEmitter = require('events');

class ProgressTracker extends EventEmitter {
    constructor(documentId) {
        super();
        this.documentId = documentId;
        this.progress = 0;
        this.status = 'pending';
        this.currentStep = '';
        this.startTime = Date.now();
    }

    updateProgress(progress, step = '') {
        this.progress = Math.min(100, Math.max(0, progress));
        this.currentStep = step;
        this.emit('progress', {
            documentId: this.documentId,
            progress: this.progress,
            step: this.currentStep,
            status: this.status,
            elapsed: Date.now() - this.startTime
        });
    }

    setStatus(status, step = '') {
        this.status = status;
        this.currentStep = step;
        this.emit('status', {
            documentId: this.documentId,
            status: this.status,
            step: this.currentStep,
            progress: this.progress,
            elapsed: Date.now() - this.startTime
        });
    }

    complete() {
        this.setStatus('completed', 'Processing complete');
        this.updateProgress(100, 'Complete');
    }

    fail(error) {
        this.setStatus('failed', `Error: ${error.message}`);
        this.emit('error', {
            documentId: this.documentId,
            error: error.message,
            elapsed: Date.now() - this.startTime
        });
    }
}

// Global progress tracking
const activeProgress = new Map();

function createProgressTracker(documentId) {
    const tracker = new ProgressTracker(documentId);
    activeProgress.set(documentId, tracker);
    return tracker;
}

function getProgressTracker(documentId) {
    return activeProgress.get(documentId);
}

function removeProgressTracker(documentId) {
    activeProgress.delete(documentId);
}

module.exports = {
    ProgressTracker,
    createProgressTracker,
    getProgressTracker,
    removeProgressTracker
};
