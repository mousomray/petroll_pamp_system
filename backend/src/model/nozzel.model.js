const mongoose = require("mongoose");

const nozzleSchema = new mongoose.Schema(
  {
    nozzleNumber: {
      type: String,
      required: true,
      trim: true,
    },

    tank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tank",
      required: true,
    },

    machineName: {
      type: String,
      trim: true,
    },

    // 🔹 Machine meter value when added to system
    initialReading: {
      type: Number,
      default: 0,
      min: 0,
    },

    // 🔹 Current live meter value (auto update during sale)
    currentReading: {
      type: Number,
      default: 0,
      min: 0,
    },

    // 🔹 Total fuel dispensed since system started
    totalDispensed: {
      type: Number,
      default: 0,
      min: 0,
    },

    // 🔹 Machine operational status
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "MAINTENANCE"],
      default: "ACTIVE",
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// 🔥 Prevent duplicate nozzle number per user (important for multi-branch future)
nozzleSchema.index(
  { nozzleNumber: 1, userId: 1 },
  { unique: true }
);

const NozzleModel = mongoose.model("Nozzle", nozzleSchema);

module.exports = NozzleModel;