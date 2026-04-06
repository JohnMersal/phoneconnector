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
// Format: { "john": "01012345678", "hany": "01287654321" }
let userStore = {};

/* ==========================================
   1. CRM API ENDPOINT
   The Desktop Extension hits this to "Send"
   ========================================== */
app.post('/set-number/:userId', (req, res) => {
    const { userId } = req.params;
    const { phone } = req.body;
    
    if (phone && userId) {
        const normalizedId = userId.toLowerCase();
        userStore[normalizedId] = phone;
        // console.log(`[CRM] Updated ${normalizedId}: ${phone}`);
        return res.json({ success: true, agent: normalizedId, number: phone });
    }
    res.status(400).send("Missing phone or userId");
});

/* ==========================================
   2. MOBILE APP API ENDPOINT
   The "Pull" button hits this to check for leads
   ========================================== */
app.get('/get-number/:userId', (req, res) => {
    const userId = req.params.userId.toLowerCase();
    const number = userStore[userId] || "No number yet";
    
    // console.log(`[MOBILE] ${userId} polled for a lead. Result: ${number}`);
    res.json({ phone: number });
});

/* ==========================================
   3. THE MAGIC WILDCARD ROUTE
   This allows URLs like /john or /monem
   to serve the mobile app's index.html
   ========================================== */
app.get('/:agentName', (req, res) => {
    // This ignores whatever "agentName" is and just sends the app
    // The app's internal JS will then read the URL to see the name
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`-------------------------------------------`);
    console.log(`CRM Bridge Server running on port ${PORT}`);
    console.log(`Admin Link: http://localhost:${PORT}/john`);
    console.log(`-------------------------------------------`);
});
