const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  userName: { type: String, required: true },
  userMobile: { type: String, required: true },
  
  // Enums hata diye taaki caps/small letters ya 'Fuel' vs 'Fuel Delivery' ka validation crash na ho
  serviceType: { type: String, required: true }, 
  vehicleType: { type: String, required: true }, 

  // Puncture details
  tyreLocation: { type: String }, 
  tyreStructure: { type: String }, 
  
  // Fuel details
  fuelCategory: { type: String }, 
  fuelQuantity: { type: String }, 
  
  // Mechanic details
  commonProblem: { type: String }, 
  
  description: { type: String },
  status: { type: String, default: 'Pending' },
  mechanicAssigned: { type: mongoose.Schema.Types.ObjectId, ref: 'Mechanic', default: null }
}, { timestamps: true });

module.exports = mongoose.model('Booking', BookingSchema);