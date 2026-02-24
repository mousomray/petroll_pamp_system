const  mongoose =  require("mongoose");

const financialYearSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    name: {
        type: String, // "2024-2025"
        required: true
    },

    startDate: {
        type: Date,
        required: true
    },

    endDate: {
        type: Date,
        required: true
    },

    isActive: {
        type: Boolean,
        default: false
    }

}, { timestamps: true });

financialYearSchema.index(
    { userId: 1, name: 1 },
    { unique: true }
);

module.exports = mongoose.model("FinancialYear", financialYearSchema);