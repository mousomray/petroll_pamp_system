// schemas/productSchemas.js
const { z } = require("zod");

// allowed types
const productTypes = ["FUEL", "OIL", "TYRE", "ACCESSORY"];

// allowed units
const productUnits = ["LITRE", "PIECE", "KG", "BOX"];

/* ======================================================
   🟢 CREATE PRODUCT SCHEMA
====================================================== */
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

    quantity: z
        .number()
        .nonnegative("Quantity cannot be negative")
        .optional(),

    minimumStockAlert: z
        .number()
        .nonnegative("Minimum stock alert cannot be negative")
        .optional(),

    // ================= GST =================
    cgstPercent: z
        .number()
        .min(0, "CGST must be >= 0")
        .max(100, "CGST cannot exceed 100")
        .optional()
        .default(0),

    sgstPercent: z
        .number()
        .min(0, "SGST must be >= 0")
        .max(100, "SGST cannot exceed 100")
        .optional()
        .default(0),

    igstPercent: z
        .number()
        .min(0, "IGST must be >= 0")
        .max(100, "IGST cannot exceed 100")
        .optional()
        .default(0),

    hsnCode: z.string().optional()

}).superRefine((data, ctx) => {

    // 🔥 Selling price validation
    if (data.sellingPrice < data.costPrice) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Selling price must be greater than or equal to cost price",
            path: ["sellingPrice"]
        });
    }

    // 🔥 GST validation
    if (
        (data.cgstPercent > 0 || data.sgstPercent > 0) &&
        data.igstPercent > 0
    ) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Use either CGST/SGST OR IGST, not both",
            path: ["igstPercent"]
        });
    }
});


/* ======================================================
   🟡 UPDATE PRODUCT SCHEMA
====================================================== */
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

    quantity: z.number().nonnegative("Quantity cannot be negative").optional(),

    minimumStockAlert: z
        .number()
        .nonnegative("Minimum stock alert cannot be negative")
        .optional(),

    cgstPercent: z.number().min(0).max(100).optional(),

    sgstPercent: z.number().min(0).max(100).optional(),

    igstPercent: z.number().min(0).max(100).optional(),

    hsnCode: z.string().optional(),

    isActive: z.boolean().optional()

}).superRefine((data, ctx) => {

    // 🔥 If both price provided, validate
    if (
        typeof data.costPrice === "number" &&
        typeof data.sellingPrice === "number" &&
        data.sellingPrice < data.costPrice
    ) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Selling price must be greater than or equal to cost price",
            path: ["sellingPrice"]
        });
    }

    // 🔥 GST validation
    if (
        (data.cgstPercent > 0 || data.sgstPercent > 0) &&
        data.igstPercent > 0
    ) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Use either CGST/SGST OR IGST, not both"
        });
    }
});


module.exports = {
    createProductSchema,
    updateProductSchema
};