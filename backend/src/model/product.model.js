const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      uppercase: true,
    },

    image: {
      type: String,
    },

    unit: {
      type: String,
      required: [true, "Unit is required"],
      enum: ["LITRE", "PIECE", "KG", "BOX"],
    },

    type: {
      type: String,
      required: [true, "Product type is required"],
      enum: ["FUEL", "ACCESSORY"],
    },

    costPrice: {
      type: Number,
      required: [true, "Cost price is required"],
      min: [0, "Cost price must be >= 0"],
    },

    sellingPrice: {
      type: Number,
      required: [true, "Selling price is required"],
      min: [0, "Selling price must be >= 0"],
    },

    minimumStockAlert: {
      type: Number,
      default: 0,
      min: [0, "Minimum stock alert cannot be negative"],
    },

    cgstPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    sgstPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    hsnCode: {
      type: String,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    tankIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tank",
      }
    ],

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const ProductModel = mongoose.model("Product", productSchema);

module.exports = ProductModel;