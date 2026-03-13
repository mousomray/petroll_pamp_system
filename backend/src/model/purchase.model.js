const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        supplierId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Supplier",
            required: true,
            index: true
        },

        invoiceNo: {
            type: String,
            required: true,
            trim: true
        },

        purchaseDate: {
            type: Date,
            required: true,
            index: true
        },

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

        instrumentId:{
            type: String,
            trim: true
        },

        instrumentDate: {
            type: Date
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


const purchaseItemSchema = new mongoose.Schema(
    {
        purchaseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Purchase",
            required: true,
            index: true
        },

        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true
        },

        quantity: {
            type: Number,
            required: true,
            min: 0
        },

        costPrice: {
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


purchaseSchema.index(
    { userId: 1, invoiceNo: 1 },
    { unique: true }
);


const PurchaseModel = mongoose.model("Purchase", purchaseSchema);
const PurchaseItemModel = mongoose.model("PurchaseItem", purchaseItemSchema);

module.exports = {
    PurchaseModel,
    PurchaseItemModel
};