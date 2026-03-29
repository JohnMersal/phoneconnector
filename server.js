const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory store for different users
let userStore = {};

// CRM hits this: /set-number/john
app.post('/set-number/:userId', (req, res) => {
    const { userId } = req.params;
    const { phone } = req.body;
    
    if (phone && userId) {
        // Normalize userId to lowercase to prevent mismatch
        userStore[userId.toLowerCase()] = phone;
        console.log(`Update for ${userId}: ${phone}`);
        return res.json({ success: true });
    }
    res.status(400).send("Missing data");
});

// Phone polls this: /get-number/john
app.get('/get-number/:userId', (req, res) => {
    const userId = req.params.userId.toLowerCase();
    res.json({ phone: userStore[userId] || "No number yet" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Polling server running on port ${PORT}`);
});
