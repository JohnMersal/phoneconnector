server.js
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store numbers in an object: { "john": "010...", "omar": "012..." }
let userStore = {};

// CRM sends to: /set-number/john
app.post('/set-number/:userId', (req, res) => {
    const { userId } = req.params;
    const { phone } = req.body;
    if (phone && userId) {
        userStore[userId] = phone;
        console.log(`User ${userId} received: ${phone}`);
        return res.json({ success: true });
    }
    res.status(400).send("Missing data");
});

// Mobile pulls from: /get-number/john
app.get('/get-number/:userId', (req, res) => {
    const { userId } = req.params;
    res.json({ phone: userStore[userId] || "No number yet" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Multi-tenant server on ${PORT}`));
