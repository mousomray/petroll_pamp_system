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
    ref: "Nozzle",
    required: true
  },

  litres: {
    type: Number,
    required: true,
    min: 0
  },

  pricePerLitre: {
    type: Number,
    required: true,
    min: 0
  },

  amount: {
    type: Number,
    required: true,
    min: 0
  },

  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { timestamps: true });

saleItemSchema.index({ saleId: 1, productId: 1, nozzleId: 1 });

const SaleItemModel = model("SaleItem", saleItemSchema);
module.exports = SaleItemModel;