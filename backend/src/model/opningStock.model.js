const mongoose = require("mongoose");


const opningStockSchema = new mongoose.Schema({
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
}, { timestamps: true })



const OpningStockModle = mongoose.model("OpningStock", opningStockSchema)

module.exports = OpningStockModle;