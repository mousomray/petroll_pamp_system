// schemas/productSchemas.js
const { z } = require("zod");

// allowed types
const productTypes = ["FUEL", "OIL", "TYRE", "ACCESSORY"];

//  Create Product Schema
const createProductSchema = z.object({
    name: z
        .string({ required_error: "Product name is required" })
        .min(1, "Product name cannot be empty")
        .trim(),
    image: z.string().optional(), // optional field
    type: z.enum(productTypes, { errorMap: () => ({ message: "Invalid product type" }) }),
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
   currentStock: z .number()
        .nonnegative("Current stock alert cannot be negative")
        .optional(),
});

//  Update Product Schema
const updateProductSchema = z.object({
    name: z.string().min(1, "Product name cannot be empty").trim().optional(),
    image: z.string().optional(),
    type: z.enum(productTypes, { errorMap: () => ({ message: "Invalid product type" }) }).optional(),
    costPrice: z.number().nonnegative("Cost price must be >= 0").optional(),
    sellingPrice: z.number().nonnegative("Selling price must be >= 0").optional(),
    minimumStockAlert: z.number().nonnegative("Minimum stock alert cannot be negative").optional(),
    currentStock: z.number().nonnegative("Stock cannot be negative").optional(),
    isActive: z.boolean().optional(),
});

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