const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const salesSchema = new Schema({
  shiftId: {
    type: Schema.Types.ObjectId,
    ref: "Shift",
    required: true,
    index: true
  },

  workerId: {
    type: Schema.Types.ObjectId,
    ref: "Worker",
    required: true,
    index: true
  },

  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

 
  cashCollected: {
    type: Number,
    default: 0,
    min: 0
  },

  onlineCollected: {
    type: Number,
    default: 0,
    min: 0
  },

  totalLitres: {
    type: Number,
    required: true,
    min: 0
  },

  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },

  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  }
}, { timestamps: true });

salesSchema.index({ shiftId: 1, workerId: 1, createdAt: -1 });

const SalesModel = model("Sales", salesSchema);

module.exports = SalesModel;