const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema({

  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },

  shiftId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shift",
    required: true
  },

  quantity: {
    type: Number,
    required: true,
    min: 0
  },

  unitPrice: {
    type: Number,
    required: true
  },

  costPrice: {
    type: Number,
    required: true
  },

  grossAmount: {
    type: Number,
    default: 0
  },

  cgstAmount: {
    type: Number,
    default: 0
  },

  sgstAmount: {
    type: Number,
    default: 0
  },

  totalAmount: {
    type: Number,
    default: 0
  },

  profitAmount: {
    type: Number,
    default: 0
  },

  paymentMethod: {
    type: String,
    enum: ["CASH", "ONLINE"],
    required: true
  },

  saleType: {
    type: String,
    enum: ["FUEL", "ACCESSORY"],
    required: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }

}, { timestamps: true });