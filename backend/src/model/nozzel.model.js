const mongoose = require("mongoose");

const nozzleSchema = new mongoose.Schema(
    {
        nozzleNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        tank: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tank",
            required: true,
        },

        currentReading: {
            type: Number,
            required: true,
            default: 0,
        },

        machineName: {
            type: String, // optional (Machine-1, Machine-2)
        },

        isActive: {
            type: Boolean,
            default: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

const NozzleModle = mongoose.model("Nozzle",nozzleSchema)

module.exports = NozzleModle



