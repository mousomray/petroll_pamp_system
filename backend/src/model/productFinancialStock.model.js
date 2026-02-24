const  mongoose =  require("mongoose");

const productFinancialStockSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },

    financialYearId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FinancialYear",
        required: true
    },

    openingStock: {
        type: Number,
        default: 0
    },

    totalPurchase: {
        type: Number,
        default: 0
    },

    totalSale: {
        type: Number,
        default: 0
    },

    closingStock: {
        type: Number,
        default: 0
    }

}, { timestamps: true });

productFinancialStockSchema.index(
    { userId: 1, productId: 1, financialYearId: 1 },
    { unique: true }
);

module.exports = mongoose.model(
    "ProductFinancialStock",
    productFinancialStockSchema
);