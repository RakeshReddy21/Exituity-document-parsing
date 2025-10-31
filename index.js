const express = require('express');
const cors = require('cors');
const connectDB = require('./config/connectDB');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('public'));

// Connect to MongoDB
connectDB();

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the main page for both root and history routes
app.get('/history', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        message: 'API is healthy',
        status: 'success'
    });
});

// API Routes will go here
app.use('/api', require('./Routes/index'));

app.listen(port, () => {
    console.log(`✅ Server is running on port ${port}`);
});
