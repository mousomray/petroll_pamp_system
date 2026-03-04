const mongoose = require("mongoose");
const { model } = mongoose;

const workerSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    phone: {
        type: String,
        trim: true
    },

    workerType: {
        type: String,
        enum: [
            "NOZZLE_BOY",
            "SALESMAN",
            "SWEEPER",
            "SECURITY",
            "TANK_OPERATOR",
            "SUPERVISOR"
        ],
        required: true
    },

    isActive: {
        type: Boolean,
        default: true
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }

}, { timestamps: true });

const WorkerModel = model("Worker", workerSchema);

module.exports = WorkerModel;