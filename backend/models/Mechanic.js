const mongoose = require('mongoose');

const MechanicSchema = new mongoose.Schema({
  shopName: { type: String, required: true },
  ownerName: { type: String, required: true },
  mobileNumber: { type: String, required: true, unique: true },
  address: { type: String },
  serviceType: { 
    type: String, 
    required: true, 
    enum: ['Mechanic', 'Puncture', 'Fuel'],
    default: 'Mechanic'
  },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  // 👇 UPDATED: Isey 'isOnline' kar diya taaki hamare routes se match kare
  isOnline: { type: Boolean, default: true }
}, { timestamps: true });

// For GeoSpatial queries (Map par pass wale mechanic dundhne ke liye)
MechanicSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Mechanic', MechanicSchema);