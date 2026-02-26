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
            required: true
        },

        invoiceNo: {
            type: String,
            trim: true
        },

        invoiceDate: {
            type: Date
        },

        purchaseDate: {
            type: Date,
            required: true
        },

        financialYearId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "FinancialYear",
            required: true
        },

        hsnCode: {
            type: String,
            trim: true
        },

        subTotal: {
            type: Number,
            required: true,
            min: 0
        },

        discount: {
            type: Number,
            default: 0
        },

        cgst: {
            type: Number,
            default: 0
        },

        sgst: {
            type: Number,
            default: 0
        },

        taxAmount: {
            type: Number,
            default: 0
        },

        roundOff: {
            type: Number,
            default: 0
        },

        totalAmount: {
            type: Number,
            required: true
        },

        paidAmount: {
            type: Number,
            default: 0
        },

        dueAmount: {
            type: Number,
            default: 0
        },

        paymentStatus: {
            type: String,
            enum: ["PAID", "DUE", "PARTIAL"],
            required: true
        },

        paymentMethod: {
            type: String,
            enum: ["CASH", "BANK", "UPI"],
            default: "CASH"
        },

        entryFlag: {
            type: String,
            default: "S"
        },

        saleRate: {
            type: Number,
            default: 0
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
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
            required: true
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
            default: 0
        },
        taxPercent: {
            type: Number,
            default: 0
        },
        taxAmount: {
            type: Number,
            default: 0
        },
        total: {
            type: Number,
            required: true
        },
        tankId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tank",
            default: null
        }
    },
    { timestamps: true }
);

const PurchaseModel = mongoose.model("Purchase", purchaseSchema);
const PurchaseItemModel = mongoose.model("PurchaseItem", purchaseItemSchema);

module.exports = { PurchaseModel, PurchaseItemModel };
