const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const Mechanic = require('./models/Mechanic');

const app = express();

// Middleware Setups
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vehicleHelpDB';

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

app.get('/favicon.ico', (req, res) => res.status(204));

app.get('/', (req, res) => {
  res.send('<h1>🚗 VehicleHelp Backend Server is Live and Running! 🚀</h1>');
});

// HTTP & Socket Server Init
const server = http.createServer(app);

const io = new Server(server, { 
    cors: { origin: "*" },
    pingTimeout: 30000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
});

app.set('socketio', io);

// Socket Stream Handlers
io.on('connection', (socket) => {
    console.log("✅ Socket Connected Client ID: " + socket.id);

    socket.on("BILL_CHANGED", (data) => {
        socket.broadcast.emit("BILL_UPDATED_INBOUND", data);
    });

    socket.on("STATUS_CHANGE", (data) => {
        socket.broadcast.emit("STATUS_UPDATED_INBOUND", data);
    });

    socket.on("disconnect", async (reason) => {
        console.log(`❌ Client dropped stream: ${socket.id} (Reason: ${reason})`);
        try {
          await Mechanic.findOneAndUpdate({ socketId: socket.id }, { socketId: '' });
        } catch (err) {
          console.error("Disconnect cleanup error:", err.message);
        }
    });
});

// REST Routes Mapping
const bookingRoutes = require('./routes/bookingRoutes');
const partnerRoutes = require('./routes/partnerRoutes');

app.use('/api/bookings', bookingRoutes);
app.use('/api/partners', partnerRoutes);

app.post('/api/bookings/add-item', async (req, res) => {
    try {
        const { bookingId, name, price } = req.body;
        const socketio = req.app.get('socketio');
        if (socketio) {
          socketio.emit("BILL_UPDATED_INBOUND", {
              bookingId,
              item: { id: Date.now().toString(), name, price: Number(price) }
          });
        }
        res.status(200).json({ success: true, message: "Item updated onto bill system." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Execution Port
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Secure Production Server listening on port ${PORT}`);
});