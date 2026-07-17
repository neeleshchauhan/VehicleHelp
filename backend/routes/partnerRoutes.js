const express = require('express');
const router = express.Router();
const Mechanic = require('../models/Mechanic');

// 1. Mechanic Register Route (UPDATED: Added serviceType)
router.post('/register', async (req, res) => {
  try {
    // 👇 Body se serviceType ko bhi nikaal liya
    const { shopName, ownerName, mobileNumber, address, coordinates, serviceType } = req.body;

    let mechanic = await Mechanic.findOne({ mobileNumber });
    if (mechanic) {
      return res.status(400).json({ message: 'Mechanic already registered with this mobile number.' });
    }

    mechanic = new Mechanic({
      shopName,
      ownerName,
      mobileNumber,
      address,
      serviceType: serviceType || 'Mechanic', // 👇 Model me 'Mechanic', 'Puncture', ya 'Fuel' save hoga
      location: {
        type: 'Point',
        coordinates: coordinates || [0, 0] // [longitude, latitude]
      }
    });

    await mechanic.save();
    res.status(201).json({ success: true, message: 'Mechanic registered successfully!', mechanic });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Mechanic Quick Login Route
router.post('/login', async (req, res) => {
  try {
    const { mobileNumber } = req.body;
    const mechanic = await Mechanic.findOne({ mobileNumber });

    if (!mechanic) {
      return res.status(404).json({ message: 'No registered partner found with this number.' });
    }

    res.status(200).json({ success: true, message: 'Fast Login Successful!', mechanic });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Go Online/Offline Status Route
router.post('/toggle-status', async (req, res) => {
  try {
    const { mobileNumber, isOnline } = req.body; 

    const mechanic = await Mechanic.findOneAndUpdate(
      { mobileNumber },
      { isOnline },
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
    res.status(500).json({ error: error.message });
  }
});

// 4. Live Location Update Route
router.post('/update-location', async (req, res) => {
  try {
    const { mobileNumber, coordinates } = req.body; 

    const mechanic = await Mechanic.findOneAndUpdate(
      { mobileNumber },
      {
        'location.coordinates': coordinates
      },
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
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;