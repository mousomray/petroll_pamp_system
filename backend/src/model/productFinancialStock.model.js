const mongoose = require("mongoose");

const productStockItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },

    openingStock: {
        type: Number,
        default: 0
    },

    totalPurchase: {
        type: Number,
        default: 0
    },

    totalSale: {
        type: Number,
        default: 0
    },

    closingStock: {
        type: Number,
        default: 0
    }

}, { _id: false });

const productFinancialStockSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    financialYear: {   // ✅ No master table
        type: String,
        required: true
    },

    products: [productStockItemSchema]

}, { timestamps: true });

// One financial year per user
productFinancialStockSchema.index(
    { userId: 1, financialYear: 1 },
    { unique: true }
);

module.exports = mongoose.model(
    "ProductFinancialStock",
    productFinancialStockSchema
);