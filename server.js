const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// Standard Middleware
app.use(cors());
app.use(express.json());

// Serve static files (CSS, Manifest, etc.) from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// In-memory store for phone numbers
let userStore = {};

/* ==========================================
   1. CRM API ENDPOINT
   ========================================== */
app.post('/set-number/:userId', (req, res) => {
    const { userId } = req.params;
    const { phone, name, location } = req.body;
    
    if (phone && userId) {
        const normalizedId = userId.toLowerCase();
        userStore[normalizedId] = { phone, name, location };
        
        // Log the successful update with timestamp
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [CRM] Updated ${normalizedId}: ${phone} (${name || 'No Name'})`);
        
        return res.json({ success: true, agent: normalizedId, number: phone, name, location });
    }
    
    console.warn(`[${new Date().toISOString()}] [CRM] Failed update attempt: Missing data`);
    res.status(400).send("Missing phone or userId");
});

/* ==========================================
   2. MOBILE APP API ENDPOINT
   ========================================== */
app.get('/get-number/:userId', (req, res) => {
    const userId = req.params.userId.toLowerCase();
    const data = userStore[userId] || { phone: "No number yet" };
    
    res.json(data);
});

/* ==========================================
   3. THE MAGIC WILDCARD ROUTE
   ========================================== */
app.get('/:agentName', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`-------------------------------------------`);
    console.log(`CRM Bridge Server running on port ${PORT}`);
    console.log(`Admin Link: http://localhost:${PORT}/john`);
    console.log(`-------------------------------------------`);
});

/* ==========================================
   4. GRACEFUL SHUTDOWN
   This helps the server handle termination 
   signals properly in Docker/EasyPanel.
   ========================================== */
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server...');
    server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
    });
});
