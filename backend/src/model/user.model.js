const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },

    phone: { type: String },

    password: {
        type: String,
        required: true
    },

    role: {
        type: String,
        enum: ["ADMIN", "MANAGER", "CASHIER", "ACCOUNTANT"],
        default: "ADMIN"
    },

    shiftType: {
        type: String,
        enum: ["MORNING", "EVENING", "NIGHT"],
        default: "MORNING"
    },

    isActive: {
        type: Boolean,
        default: true
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

}, { timestamps: true });

const UserModel = model("User", userSchema);

module.exports = UserModel;