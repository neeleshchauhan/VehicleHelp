const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Mechanic = require('../models/Mechanic');

// 1. Dynamic Radius Emergency SOS Search (8 KM -> 15 KM -> 25 KM)
router.post('/create', async (req, res) => {
  try {
    const { userName, userMobile, serviceType, vehicleType, description, latitude, longitude, driverSocketId } = req.body;

    const latNum = Number(latitude) || 0;
    const lngNum = Number(longitude) || 0;

    const newBooking = await Booking.create({
      userName: userName || "Test User",
      userMobile: userMobile || "9999988888",
      serviceType: serviceType || "mechanic",
      vehicleType: vehicleType || "car",
      description: description || "General Mechanical Issue",
      location: [lngNum, latNum],
      driverSocketId: driverSocketId || '',
      status: "pending"
    });

    // Auto-expanding radius search
    const radiusSteps = [8000, 15000, 25000];
    let nearbyMechanics = [];
    let matchedRadiusKm = 8;

    for (const radius of radiusSteps) {
      nearbyMechanics = await Mechanic.find({
        isOnline: true,
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [lngNum, latNum] },
            $maxDistance: radius
          }
        }
      });

      if (nearbyMechanics.length > 0) {
        matchedRadiusKm = radius / 1000;
        break;
      }
    }

    const io = req.app.get('socketio');
    if (io && nearbyMechanics.length > 0) {
      nearbyMechanics.forEach((mech) => {
        if (mech.socketId) {
          io.to(mech.socketId).emit('NEW_SOS_REQUEST', {
            bookingId: newBooking._id,
            userName: newBooking.userName,
            userMobile: newBooking.userMobile,
            serviceType: newBooking.serviceType,
            vehicleType: newBooking.vehicleType,
            description: newBooking.description,
            latitude: latNum,
            longitude: lngNum,
            searchRadiusKm: matchedRadiusKm
          });
        }
      });
    }

    res.status(201).json({ 
      success: true, 
      message: `SOS Request Sent to nearby ${matchedRadiusKm} KM partners!`, 
      bookingId: newBooking._id,
      radiusKm: matchedRadiusKm,
      notifiedPartnersCount: nearbyMechanics.length
    });
  } catch (error) {
    console.error("❌ Booking Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Booking List
router.get('/list', async (req, res) => {
  try {
    const data = await Booking.find({}).sort({ createdAt: -1 });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Status Update & Atomic Single Accept Lock
router.put('/update-status/:id', async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { status, mechanicId, partnerName, shopName } = req.body;

    if (status === "accepted" || status === "Accepted") {
      const updatedBooking = await Booking.findOneAndUpdate(
        { _id: bookingId, status: "pending" }, 
        { 
          $set: { 
            status: "accepted", 
            mechanicAssigned: mechanicId || null 
          } 
        },
        { new: true }
      );

      if (!updatedBooking) {
        return res.status(400).json({ 
          success: false, 
          message: "Ye request pehle hi kisi aur partner ne accept kar li hai!" 
        });
      }

      const io = req.app.get('socketio');
      if (io) {
        io.emit('BOOKING_STATUS_CHANGED', {
          bookingId: bookingId,
          status: "accepted",
          partnerName: partnerName,
          shopName: shopName
        });

        io.emit('CLOSE_SOS_POPUP', { bookingId: bookingId });
      }

      return res.status(200).json({ 
        success: true, 
        message: "Request successfully accepted!", 
        booking: updatedBooking 
      });
    }

    const result = await Booking.findByIdAndUpdate(bookingId, { status: status }, { new: true });
    res.status(200).json({ success: true, booking: result });

  } catch (error) {
    console.error("❌ Status Update Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;