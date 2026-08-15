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
  socketId: { type: String, default: '' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  isOnline: { type: Boolean, default: true }
}, { timestamps: true });

// GeoSpatial queries ke liye index mandatory hai
MechanicSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Mechanic', MechanicSchema);