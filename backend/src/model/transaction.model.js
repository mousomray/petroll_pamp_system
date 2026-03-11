const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    accountHead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccountHead",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    type: {
      type: String,
      enum: ["INCOME", "EXPENSE"],
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["CASH", "UPI", "BANK"],
      default: "CASH",
    },

    note: String,

    transactionDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;
