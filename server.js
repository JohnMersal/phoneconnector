const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { WebSocket, WebSocketServer } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Standard Middleware
app.use(cors());
app.use(express.json());

// Serve static files (CSS, Manifest, etc.) from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// In-memory store for phone numbers
const userStore = {};
const liveClients = new Map();

function normalizeUserId(userId) {
    return String(userId || '').trim().toLowerCase();
}

/**
 * Broadcast a lead payload to all connected bridge clients for a user.
 */
function broadcastToUser(userId, type, data) {
    const clients = liveClients.get(userId);
    if (!clients?.size) {
        return;
    }

    const payload = JSON.stringify({
        type,
        userId,
        data,
        sentAt: new Date().toISOString(),
    });

    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    }
}

/**
 * Track an open WebSocket under its agent id so CRM pushes can target it.
 */
function registerClient(userId, client) {
    const existingClients = liveClients.get(userId) ?? new Set();
    existingClients.add(client);
    liveClients.set(userId, existingClients);
}

function unregisterClient(userId, client) {
    const existingClients = liveClients.get(userId);
    if (!existingClients) {
        return;
    }

    existingClients.delete(client);
    if (!existingClients.size) {
        liveClients.delete(userId);
    }
}

wss.on('connection', (client, request) => {
    const requestUrl = new URL(request.url, `http://${request.headers.host}`);
    const userId = normalizeUserId(requestUrl.searchParams.get('userId'));

    if (!userId) {
        client.close(1008, 'Missing userId');
        return;
    }

    client.isAlive = true;
    client.on('pong', () => {
        client.isAlive = true;
    });

    registerClient(userId, client);
    console.log(`[${new Date().toISOString()}] [WS] Connected ${userId}`);

    client.send(JSON.stringify({
        type: 'connection-ready',
        userId,
        sentAt: new Date().toISOString(),
    }));

    const storedLead = userStore[userId];
    if (storedLead?.phone) {
        client.send(JSON.stringify({
            type: 'lead-snapshot',
            userId,
            data: storedLead,
            sentAt: new Date().toISOString(),
        }));
    }

    client.on('close', () => {
        unregisterClient(userId, client);
        console.log(`[${new Date().toISOString()}] [WS] Disconnected ${userId}`);
    });

    client.on('error', (error) => {
        console.error(`[${new Date().toISOString()}] [WS] Error for ${userId}:`, error);
    });
});

const heartbeatInterval = setInterval(() => {
    for (const client of wss.clients) {
        if (!client.isAlive) {
            client.terminate();
            continue;
        }

        client.isAlive = false;
        client.ping();
    }
}, 30000);

/* ==========================================
   1. CRM API ENDPOINT
   ========================================== */
app.post('/set-number/:userId', (req, res) => {
    const userId = normalizeUserId(req.params.userId);
    const { phone, name, location } = req.body;
    
    if (phone && userId) {
        const timestamp = new Date().toISOString();
        const leadPayload = {
            phone,
            name: name ?? '',
            location: location ?? '',
            updatedAt: timestamp,
        };

        userStore[userId] = leadPayload;

        console.log(`[${timestamp}] [CRM] Updated ${userId}: ${phone} (${name || 'No Name'})`);
        broadcastToUser(userId, 'lead-updated', leadPayload);

        return res.json({ success: true, agent: userId, number: phone, name, location, updatedAt: timestamp });
    }
    
    console.warn(`[${new Date().toISOString()}] [CRM] Failed update attempt: Missing data`);
    res.status(400).send("Missing phone or userId");
});

/* ==========================================
   2. MOBILE APP API ENDPOINT
   ========================================== */
app.get('/get-number/:userId', (req, res) => {
    const userId = normalizeUserId(req.params.userId);
    const data = userStore[userId] || { phone: "No number yet" };
    
    res.json(data);
});

/* ==========================================
   3. THE MAGIC WILDCARD ROUTE
   ========================================== */
app.get('/:agentName', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
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
function shutdown(signal) {
    console.log(`${signal} signal received: closing bridge server...`);
    clearInterval(heartbeatInterval);

    for (const client of wss.clients) {
        client.close(1001, 'Server shutting down');
    }

    wss.close(() => {
        server.close(() => {
            console.log('HTTP server closed.');
            process.exit(0);
        });
    });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
