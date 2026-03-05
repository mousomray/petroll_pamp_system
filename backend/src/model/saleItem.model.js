const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const saleItemSchema = new Schema({

  saleId: {
    type: Schema.Types.ObjectId,
    ref: "Sales",
    required: true,
    index: true
  },

  productId: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    index: true
  },

  nozzleId: {
    type: Schema.Types.ObjectId,
    ref: "Nozzle"
  },


  qty: {
    type: Number,
    default: 0
  },

  price: {
    type: Number,
    required: true
  },

  amount: {
    type: Number,
    required: true
  },

  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  }

}, { timestamps: true });

saleItemSchema.index({ saleId: 1, productId: 1 });

const SaleItemModel = model("SaleItem", saleItemSchema);

module.exports = SaleItemModel;