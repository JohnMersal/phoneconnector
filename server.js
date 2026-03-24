const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
// This line makes your index.html accessible at your root URL
app.use(express.static('public')); 

let latestNumber = "No number yet";

app.post('/set-number', (req, res) => {
    latestNumber = req.body.phone;
    res.json({ success: true });
});

app.get('/get-number', (req, res) => {
    res.json({ phone: latestNumber });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
