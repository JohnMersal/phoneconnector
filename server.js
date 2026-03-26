const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Keep track of the last number for initial connection
let userStore = {};

// Socket Logic: Handling "Rooms"
io.on('connection', (socket) => {
    socket.on('join-room', (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined their room.`);
        
        // Send them the last known number immediately upon joining
        if (userStore[userId]) {
            socket.emit('new-number', userStore[userId]);
        }
    });
});

// CRM sends to: /set-number/john
app.post('/set-number/:userId', (req, res) => {
    const { userId } = req.params;
    const { phone } = req.body;
    
    if (phone && userId) {
        userStore[userId] = phone;
        // PUSH the number to the specific user room
        io.to(userId).emit('new-number', phone);
        
        console.log(`Pushed to ${userId}: ${phone}`);
        return res.json({ success: true });
    }
    res.status(400).send("Missing data");
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => console.log(`Socket server on ${PORT}`));
