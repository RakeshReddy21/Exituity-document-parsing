const express = require('express');
const router = express.Router();

// Import route modules
const documentRoutes = require('./documentRoutes');

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'API is working!' });
});

// Document routes
router.use('/', documentRoutes);

module.exports = router;

