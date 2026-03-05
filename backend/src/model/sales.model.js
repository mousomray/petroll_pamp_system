const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const salesSchema = new Schema({

  shiftId: {
    type: Schema.Types.ObjectId,
    ref: "Shift",
    index: true
  },

  workerId: {
    type: Schema.Types.ObjectId,
    ref: "Worker",
    index: true
  },

  saleType: {
    type: String,
    enum: ["FUEL", "ACCESSORY"],
    required: true
  },

  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  totalLitres: {
    type: Number,
    default: 0
  },

  totalQty: {
    type: Number,
    default: 0
  },

  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },

  paymentMethod: {
    type: String,
    enum: ["CASH", "UPI", "CARD"],
    default: "CASH"
  },

  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  }

}, { timestamps: true });

salesSchema.index({ shiftId: 1, createdAt: -1 });

const SalesModel = model("Sales", salesSchema);

module.exports = SalesModel;