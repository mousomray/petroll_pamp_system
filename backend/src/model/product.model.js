const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Product name is required"],
            trim: true,
        },

        image: {
            type: String
        },

        unit: {
            type: String,
            required: [true, "Unit is required"],
            enum: ["LITRE", "PIECE", "KG", "BOX"],
        },

        type: {
            type: String,
            required: [true, "Product type is required"],
            enum: ["FUEL", "OIL", "TYRE", "ACCESSORY"],
        },

        // ===============================
        // 💰 PRICE
        // ===============================
        costPrice: {
            type: Number,
            required: [true, "Cost price is required"],
            min: [0, "Cost price must be >= 0"],
        },

        sellingPrice: {
            type: Number,
            required: [true, "Selling price is required"],
            min: [0, "Selling price must be >= 0"],
            validate: {
                validator: function (v) {
                    return v >= this.costPrice;
                },
                message: "Selling price must be >= cost price",
            },
        },

        // ===============================
        // 📦 STOCK
        // ===============================
        quantity: {
            type: Number,
            default: 0,
            min: [0, "Quantity cannot be negative"],
        },

        minimumStockAlert: {
            type: Number,
            default: 0,
            min: [0, "Minimum stock alert cannot be negative"],
        },

        // ===============================
        // 🧾 GST CONFIG
        // ===============================
        cgstPercent: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },

        sgstPercent: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },

        igstPercent: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },

        hsnCode: {
            type: String,
            trim: true
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);


// ===============================
// 🚫 Prevent wrong GST combination
// ===============================
productSchema.pre("save", async function () {

    if (
        (this.cgstPercent > 0 || this.sgstPercent > 0) &&
        this.igstPercent > 0
    ) {
        throw new Error("Use either CGST/SGST OR IGST, not both");
    }

});


// ===============================
// 🔁 Also protect on UPDATE
// ===============================
productSchema.pre("findOneAndUpdate", async function () {

    const update = this.getUpdate();

    const cgst = update.cgstPercent ?? update.$set?.cgstPercent ?? 0;
    const sgst = update.sgstPercent ?? update.$set?.sgstPercent ?? 0;
    const igst = update.igstPercent ?? update.$set?.igstPercent ?? 0;

    if ((cgst > 0 || sgst > 0) && igst > 0) {
        throw new Error("Use either CGST/SGST OR IGST, not both");
    }

});


const ProductModel = mongoose.model("Product", productSchema);

module.exports = ProductModel;