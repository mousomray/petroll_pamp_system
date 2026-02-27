const { z } = require("zod");


const productTypes = ["FUEL", "ACCESSORY"];


const productUnits = ["LITRE", "PIECE", "KG", "BOX"];



const createProductSchema = z.object({

    name: z
        .string({ required_error: "Product name is required" })
        .trim()
        .min(1, "Product name cannot be empty"),

    image: z
        .string()
        .url("Image must be a valid URL")
        .optional(),

    type: z.enum(productTypes, {
        errorMap: () => ({ message: "Invalid product type" })
    }),

    unit: z.enum(productUnits, {
        required_error: "Unit is required",
        errorMap: () => ({ message: "Invalid unit type" })
    }),

    costPrice: z
        .coerce.number({ required_error: "Cost price is required" })
        .nonnegative("Cost price must be >= 0"),

    sellingPrice: z
        .coerce.number({ required_error: "Selling price is required" })
        .nonnegative("Selling price must be >= 0"),

    minimumStockAlert: z
        .coerce.number()
        .nonnegative("Minimum stock alert cannot be negative")
        .optional(),

    
    cgstPercent: z
        .coerce.number()
        .min(0, "CGST must be >= 0")
        .max(100, "CGST cannot exceed 100")
        .default(0),

    sgstPercent: z
        .coerce.number()
        .min(0, "SGST must be >= 0")
        .max(100, "SGST cannot exceed 100")
        .default(0),

    hsnCode: z
        .string()
        .trim()
        .optional(),
    tankIds: z
        .array(z.string())
        .optional(),
    

}).superRefine((data, ctx) => {

   
    if (data.sellingPrice < data.costPrice) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Selling price must be greater than or equal to cost price",
            path: ["sellingPrice"]
        });
    }

});




const updateProductSchema = z.object({

    name: z
        .string()
        .trim()
        .min(1, "Product name cannot be empty")
        .optional(),

    image: z
        .string()
        .url("Image must be a valid URL")
        .optional(),

    type: z.enum(productTypes, {
        errorMap: () => ({ message: "Invalid product type" })
    }).optional(),

    unit: z.enum(productUnits, {
        errorMap: () => ({ message: "Invalid unit type" })
    }).optional(),

    costPrice: z
        .coerce.number()
        .nonnegative("Cost price must be >= 0")
        .optional(),

    sellingPrice: z
        .coerce.number()
        .nonnegative("Selling price must be >= 0")
        .optional(),

    minimumStockAlert: z
        .coerce.number()
        .nonnegative("Minimum stock alert cannot be negative")
        .optional(),

    cgstPercent: z
        .coerce.number()
        .min(0, "CGST must be >= 0")
        .max(100, "CGST cannot exceed 100")
        .optional(),

    sgstPercent: z
        .coerce.number()
        .min(0, "SGST must be >= 0")
        .max(100, "SGST cannot exceed 100")
        .optional(),

    hsnCode: z
        .string()
        .trim()
        .optional(),

    tankIds: z
        .array(z.string())
        .optional(),
    

    isActive: z.boolean().optional()

}).superRefine((data, ctx) => {

    if (
        data.costPrice !== undefined &&
        data.sellingPrice !== undefined &&
        data.sellingPrice < data.costPrice
    ) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Selling price must be greater than or equal to cost price",
            path: ["sellingPrice"]
        });
    }

});

module.exports = {
    createProductSchema,
    updateProductSchema
};