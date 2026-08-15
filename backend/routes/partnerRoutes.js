const express = require('express');
const router = express.Router();
const Mechanic = require('../models/Mechanic');

// 1. Register Partner
router.post('/register', async (req, res) => {
  try {
    const { shopName, ownerName, mobileNumber, address, coordinates, serviceType, socketId } = req.body;

    let mechanic = await Mechanic.findOne({ mobileNumber });
    if (mechanic) {
      return res.status(400).json({ message: 'Mechanic already registered with this mobile number.' });
    }

    mechanic = new Mechanic({
      shopName,
      ownerName,
      mobileNumber,
      address,
      serviceType: serviceType || 'Mechanic',
      socketId: socketId || '',
      location: {
        type: 'Point',
        coordinates: coordinates || [0, 0]
      }
    });

    await mechanic.save();
    res.status(201).json({ success: true, message: 'Mechanic registered successfully!', mechanic });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Partner Login & Socket Bind
router.post('/login', async (req, res) => {
  try {
    const { mobileNumber, socketId } = req.body;

    const updateFields = {};
    if (socketId) updateFields.socketId = socketId;

    const mechanic = await Mechanic.findOneAndUpdate(
      { mobileNumber },
      { $set: updateFields },
      { new: true }
    );

    if (!mechanic) {
      return res.status(404).json({ message: 'No registered partner found with this number.' });
    }

    res.status(200).json({ success: true, message: 'Fast Login Successful!', mechanic });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Online/Offline Status Toggle
router.post('/toggle-status', async (req, res) => {
  try {
    const { mobileNumber, isOnline, socketId } = req.body; 

    const updateFields = { isOnline };
    if (socketId) updateFields.socketId = socketId;

    const mechanic = await Mechanic.findOneAndUpdate(
      { mobileNumber },
      updateFields,
      { new: true }
    );

    if (!mechanic) {
      return res.status(404).json({ message: 'Partner not found.' });
    }

    res.status(200).json({ 
      success: true, 
      message: `Partner is now ${isOnline ? 'ONLINE 🟢' : 'OFFLINE 🔴'}`, 
      isOnline: mechanic.isOnline 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Live Location Update
router.post('/update-location', async (req, res) => {
  try {
    const { mobileNumber, coordinates, socketId } = req.body; 

    const updateFields = {
      'location.coordinates': coordinates
    };
    if (socketId) updateFields.socketId = socketId;

    const mechanic = await Mechanic.findOneAndUpdate(
      { mobileNumber },
      updateFields,
      { new: true }
    );

    if (!mechanic) {
      return res.status(404).json({ message: 'Partner not found.' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Live location updated successfully!', 
      coordinates: mechanic.location.coordinates 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;