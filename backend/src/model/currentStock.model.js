const mongoose = require("mongoose");

const currentStockSchema = new mongoose.Schema(
    {
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
        quantity: {
            type: Number,
            required: true,
            default: 0,
            min: 0
        }

    },
    { timestamps: true }
);

currentStockSchema.index(
    { userId: 1, productId: 1 },
    { unique: true }
);

module.exports = mongoose.model("CurrentStock", currentStockSchema);