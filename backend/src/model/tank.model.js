const mongoose = require("mongoose");

const tankSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    tankName: {
      type: String,
      required: true,
      trim: true
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true
    },

    capacity: {
      type: Number,
      required: true,
      min: [0, "Capacity cannot be negative"]
    },

    currentQuantity: {
      type: Number,
      default: 0,
      min: [0, "Quantity cannot be negative"]
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);


tankSchema.index(
  { userId: 1, tankName: 1 },
  { unique: true }
);


tankSchema.pre("save", async function () {
  if (this.currentQuantity > this.capacity) {
    throw new Error("Current quantity cannot exceed capacity");
  }
});

const TankModel = mongoose.model("Tank", tankSchema);

module.exports = TankModel;