const mongoose = require("mongoose");

const accountHeadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    type: {
      type: String,
      enum: ["INCOME", "EXPENSE"],
      required: true,
      index: true
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

accountHeadSchema.index(
  { userId: 1, name: 1 },
  { unique: true }
);

const AccountHead = mongoose.model("AccountHead", accountHeadSchema);

module.exports = AccountHead;