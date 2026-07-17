const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); 
const { ObjectId } = require('mongodb');

// 1. Create New Emergency Booking Request
router.post('/create', async (req, res) => {
  try {
    const { userName, userMobile, serviceType, vehicleType, description, latitude, longitude } = req.body;

    const bookingData = {
      userName: userName || "Test User",
      userMobile: userMobile || "9999988888",
      serviceType: serviceType || "mechanic",  
      vehicleType: vehicleType || "car",       
      description: description || "General Mechanical Issue",
      pickupLocation: "Live GPS Coordinates",
      latitude: Number(latitude),   
      longitude: Number(longitude), 
      status: "pending",
      createdAt: new Date()
    };

    console.log("💾 BACKEND RECEIVED LIVE DATA:", bookingData);

    const result = await mongoose.connection.collection('bookings').insertOne(bookingData);
    const savedBookingId = result.insertedId;

    // Socket instance integration for real-time alerts
    const io = req.app.get('socketio');
    if (io) {
      io.emit('NEW_SOS_REQUEST', {
        bookingId: savedBookingId,
        ...bookingData
      });
      console.log(`📡 Live Socket Broadcast Sent to Partners for Phone: ${bookingData.userMobile}`);
    } else {
      console.log("⚠️ Socket.io instance reference missing!");
    }

    res.status(201).json({ success: true, message: 'SOS Request Broadcasted!', bookingId: savedBookingId });
  } catch (error) {
    console.error("❌ Booking Database Ingestion Error:", error.message); 
    res.status(500).json({ error: error.message });
  }
});

// 2. Get All Bookings List
router.get('/list', async (req, res) => {
  try {
    const data = await mongoose.connection.collection('bookings').find({}).sort({ createdAt: -1 }).toArray();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Update Booking Status (Accept / Reject) by Partner Garage
router.put('/update-status/:id', async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { status, partnerName, shopName } = req.body; 

    const result = await mongoose.connection.collection('bookings').updateOne(
      { _id: new ObjectId(bookingId) },
      { $set: { status: status, partnerName: partnerName, shopName: shopName, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "Booking record not found!" });
    }

    // Notify Driver app about the status change
    const io = req.app.get('socketio');
    if (io) {
      io.emit('BOOKING_STATUS_CHANGED', {
        bookingId: bookingId,
        status: status,
        partnerName: partnerName,
        shopName: shopName
      });
      console.log(`📡 Socket Update Sent: Booking ${bookingId} is now ${status}`);
    }

    res.status(200).json({ success: true, message: `Status successfully updated to ${status}` });
  } catch (error) {
    console.error("❌ Status Update Router Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;