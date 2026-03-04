const mongoose = require("mongoose");
const { Schema, model } = mongoose;



const shiftSchema = new mongoose.Schema({
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Worker"
  },
  nozzleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Nozzle"
  },

  openingReading: {
    type: Number,
    default: 0
  },

  closingReading: {
    type: Number,
    default: 0
  },

  readingDate: {
    type: Date,
    default: Date.now
  },

  totalSaleLitres: {
    type: Number,
    default: 0
  },

  fuelRate: {
    type: Number,
    default: 0
  },

  totalSaleAmount: {
    type: Number,
    default: 0
  },

  cashCollected: {
    type: Number,
    default: 0
  },

  onlineCollected: {
    type: Number,
    default: 0
  },

  shortageOrExcess: {
    type: Number,
    default: 0
  },

  shortageType: {
    type: String,
    enum: ["SHORTAGE", "EXCESS", "NONE"],
    default: "NONE"
  },

  shiftStart: {
    type: Date,
    default: Date.now
  },

  shiftEnd: {
    type: Date
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  status: {
    type: String,
    enum: ["OPEN", "CLOSED"],
    default: "OPEN"
  }

}, { timestamps: true });


const ShiftModel = model("Shift", shiftSchema)

module.exports = ShiftModel