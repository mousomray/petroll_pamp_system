const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const supplier = new mongoose.Schema({
    name: { type: String, required: true },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    phone: { type: String },
    gstId: { type: String },
    address: { type: String },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true })

const SupplierModel = model("Supplier", supplier)

module.exports = SupplierModel