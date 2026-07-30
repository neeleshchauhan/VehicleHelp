const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware Setups
app.use(cors());
app.use(express.json());

// MongoDB Connection Instance
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vehicleHelpDB';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
  });

// Browser favicon route handler
app.get('/favicon.ico', (req, res) => res.status(204));

// Home Route
app.get('/', (req, res) => {
  res.send('<h1>🚗 VehicleHelp Backend Server is Live and Running! 🚀</h1>');
});

// Core Server and Realtime Engine Initializer
const server = http.createServer(app);

// Socket.io with optimized connection timeouts and transport stability
const io = new Server(server, { 
    cors: { origin: "*" },
    pingTimeout: 30000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
});

// Pass socket reference globally to express middleware context
app.set('socketio', io);

// Realtime Connection Hub
io.on('connection', (socket) => {
    console.log("✅ Socket Connected Framework Client ID: " + socket.id);

    // Dynamic Live Billing Event Stream Listener
    socket.on("BILL_CHANGED", (data) => {
        socket.broadcast.emit("BILL_UPDATED_INBOUND", data);
    });

    // Dynamic Workflow Status Listener (assigned, arrived, inprogress, completed)
    socket.on("STATUS_CHANGE", (data) => {
        socket.broadcast.emit("STATUS_UPDATED_INBOUND", data);
    });

    socket.on("disconnect", (reason) => {
        console.log(`❌ Client dropped stream: ${socket.id} (Reason: ${reason})`);
    });
});

// Rest API Route Endpoints Mapping
app.get('/api/partners', async (req, res) => {
    try {
        const dummyPartners = [
            { id: '1', name: 'Satish Kumar', shopName: 'Chauhan Automobile', latitude: 28.4595, longitude: 77.0266, serviceType: 'mechanic' },
            { id: '2', name: 'Ramesh Garage', shopName: 'Delhi Tyre Experts', latitude: 28.4600, longitude: 77.0280, serviceType: 'puncture' }
        ];
        res.status(200).json(dummyPartners);
    } catch (error) {
        res.status(500).json({ message: "Server error context logs." });
    }
});

app.post('/api/auth/send-otp', (req, res) => {
    console.log(`📩 OTP Request Dispatch Success to phone: ${req.body.phone}`);
    res.status(200).json({ success: true });
});

app.post('/api/auth/verify-otp', (req, res) => {
    res.status(200).json({ success: true, token: 'session_mock_token_key' });
});

// Live Billing Spares Engine Integration Endpoint
app.post('/api/bookings/add-item', async (req, res) => {
    try {
        const { bookingId, name, price } = req.body;
        
        const socketio = req.app.get('socketio');
        socketio.emit("BILL_UPDATED_INBOUND", {
            bookingId,
            item: { id: Date.now().toString(), name, price: Number(price) }
        });

        res.status(200).json({ success: true, message: "Item updated securely onto bill system arrays." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const bookingRoutes = require('./routes/bookingRoutes');
app.use('/api/bookings', bookingRoutes);

// App execution lifecycle start
const PORT = 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Secure Production Server listening active on port ${PORT}`);
});