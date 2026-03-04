const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      required: true,
      index: true
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
      index: true
    },

    invoiceNo: {
      type: String,
      required: true,
      trim: true
    },

    saleDate: {
      type: Date,
      required: true,
      index: true
    },

    /* ===============================
       💰 AMOUNT SECTION
    =============================== */

    subTotal: {
      type: Number,
      required: true,
      min: 0
    },

    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    cgstAmount: { type: Number, default: 0, min: 0 },
    sgstAmount: { type: Number, default: 0, min: 0 },

    taxAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    roundOff: {
      type: Number,
      default: 0
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    dueAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    paymentStatus: {
      type: String,
      enum: ["PAID", "DUE", "PARTIAL"],
      required: true
    },

    paymentMethod: {
      type: String,
      enum: ["CASH", "BANK", "UPI", "CARD"],
      default: "CASH"
    },

    note: {
      type: String,
      trim: true
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
);


saleSchema.index(
  { userId: 1, invoiceNo: 1 },
  { unique: true }
);

const SaleModel = mongoose.model("Sale", saleSchema);

const saleItemSchema = new mongoose.Schema(
  {
    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      required: true,
      index: true
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true
    },

    nozzleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nozzle",
      default: null,
      index: true
    },

    quantity: {
      type: Number,
      required: true,
      min: 0
    },

    salePrice: {
      type: Number,
      required: true,
      min: 0
    },

    discount: {
      type: Number,
      default: 0,
      min: 0
    },

    /* ===============================
       🧾 GST
    =============================== */

    cgstPercent: { type: Number, default: 0 },
    sgstPercent: { type: Number, default: 0 },
    igstPercent: { type: Number, default: 0 },

    cgstAmount: { type: Number, default: 0, min: 0 },
    sgstAmount: { type: Number, default: 0, min: 0 },
    igstAmount: { type: Number, default: 0, min: 0 },

    taxAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    total: {
      type: Number,
      required: true,
      min: 0
    },

    tankId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tank",
      default: null,
      index: true
    }
  },
  { timestamps: true }
);

const SaleItemModel = mongoose.model("SaleItem", saleItemSchema);

module.exports = {
  SaleModel,
  SaleItemModel
};