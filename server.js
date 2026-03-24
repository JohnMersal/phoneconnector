const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// Enable CORS so your CRM script (on a different domain) can talk to this API
app.use(cors());
app.use(express.json());

// Serve the mobile page
app.use(express.static('public'));

let latestNumber = "No number yet";

// Endpoint for CRM to send number
app.post('/set-number', (req, res) => {
    const { phone } = req.body;
    if (phone) {
        latestNumber = phone;
        console.log("Received phone:", latestNumber);
        return res.json({ success: true, message: "Number updated" });
    }
    res.status(400).json({ success: false, message: "No phone provided" });
});

// Endpoint for Mobile to get number
app.get('/get-number', (req, res) => {
    res.json({ phone: latestNumber });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
