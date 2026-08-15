const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  userName: { type: String, required: true },
  userMobile: { type: String, required: true },
  serviceType: { type: String, required: true }, 
  vehicleType: { type: String, required: true }, 
  tyreLocation: { type: String }, 
  tyreStructure: { type: String }, 
  fuelCategory: { type: String }, 
  fuelQuantity: { type: String }, 
  commonProblem: { type: String }, 
  description: { type: String },
  status: { type: String, default: 'pending' },
  mechanicAssigned: { type: mongoose.Schema.Types.ObjectId, ref: 'Mechanic', default: null },
  location: {
    type: [Number],
    required: true,
    default: [0, 0] // [longitude, latitude]
  },
  driverSocketId: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Booking', BookingSchema);