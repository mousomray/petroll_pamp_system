const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Product name is required"],
            trim: true,
        },
        image: {
            type: String
        },
        type: {
            type: String,
            required: [true, "Product type is required"],
            enum: ["FUEL", "OIL", "TYRE", "ACCESSORY"],
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
            validate: {
                validator: function (v) {
                    return v >= this.costPrice;
                },
                message: "Selling price must be greater than or equal to cost price",
            },
        },
        currentStock: {
            type: Number,
            default: 0,
            min: [0, "Stock cannot be negative"],
        },
        minimumStockAlert: {
            type: Number,
            default: 0,
            min: [0, "Minimum stock alert cannot be negative"],
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

const productModle = mongoose.model("Product", productSchema);

module.exports = productModle