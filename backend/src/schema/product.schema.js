// schemas/productSchemas.js
const { z } = require("zod");

// allowed types
const productTypes = ["FUEL", "OIL", "TYRE", "ACCESSORY"];

// ✅ define units (THIS WAS MISSING)
const productUnits = ["LITRE", "PIECE", "KG", "BOX"];

//  Create Product Schema
const createProductSchema = z.object({
    name: z
        .string({ required_error: "Product name is required" })
        .min(1, "Product name cannot be empty")
        .trim(),

    image: z.string().optional(),

    type: z.enum(productTypes, {
        errorMap: () => ({ message: "Invalid product type" })
    }),

    unit: z.enum(productUnits, {
        required_error: "Unit is required",
        errorMap: () => ({ message: "Invalid unit type" })
    }),

    costPrice: z
        .number({ required_error: "Cost price is required" })
        .nonnegative("Cost price must be >= 0"),

    sellingPrice: z
        .number({ required_error: "Selling price is required" })
        .nonnegative("Selling price must be >= 0"),

    minimumStockAlert: z
        .number()
        .nonnegative("Minimum stock alert cannot be negative")
        .optional(),
});

//  Update Product Schema
const updateProductSchema = z.object({
    name: z.string().min(1, "Product name cannot be empty").trim().optional(),

    image: z.string().optional(),

    type: z.enum(productTypes, {
        errorMap: () => ({ message: "Invalid product type" })
    }).optional(),

    unit: z.enum(productUnits, {
        errorMap: () => ({ message: "Invalid unit type" })
    }).optional(),

    costPrice: z.number().nonnegative("Cost price must be >= 0").optional(),

    sellingPrice: z.number().nonnegative("Selling price must be >= 0").optional(),

    minimumStockAlert: z
        .number()
        .nonnegative("Minimum stock alert cannot be negative")
        .optional(),

    isActive: z.boolean().optional(),
});

// price validation helper
const validatePrice = (data) => {
    if (
        typeof data.costPrice === "number" &&
        typeof data.sellingPrice === "number" &&
        data.sellingPrice < data.costPrice
    ) {
        throw new Error("Selling price must be greater than or equal to cost price");
    }
};

module.exports = {
    createProductSchema,
    updateProductSchema,
    validatePrice,
};