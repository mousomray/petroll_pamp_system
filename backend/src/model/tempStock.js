const mongoose = require("mongoose");

const tempTankSchema = new mongoose.Schema({
  tankId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tank",
    required: true
  },
  quantity: {
    type: Number,
    required: true
  }
}, { _id: false });

const tempStockSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },

  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    index: true
  },

  financialYear: {
    type: String,
    required: true
  },

  openingStock: {
    type: Number,
    default: 0
  },

  tanks: [tempTankSchema],

  closingStock: {
    type: Number,
    default: 0
  }

}, { timestamps: true });

const TempStockModel = mongoose.model("TempStock", tempStockSchema);

module.exports = TempStockModel;