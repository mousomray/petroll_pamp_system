import { z as zod } from 'zod'

// Product type constants
const productTypes = ["FUEL", "ACCESSORY"] as const;
const productUnits = ["LITRE", "PIECE", "KG", "BOX"] as const;

export const LoginSchema = zod.object({
  email: zod
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  password: zod
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters long'),
})

export const createUserSchema = zod.object({
  name: zod
    .string()
    .min(2, "Name must be at least 2 characters"),

  email: zod
    .string()
    .email("Invalid email format")
    .toLowerCase(),

  phone: zod
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(11, "Phone number too long"),

  password: zod
    .string()
    .min(6, "Password must be at least 6 characters"),

  role: zod
    .enum(["ADMIN", "MANAGER", "CASHIER", "ACCOUNTANT"]),

  shiftType: zod
    .enum(["MORNING", "EVENING", "NIGHT"]),

  isActive: zod
    .boolean()
    .optional(),

  createdBy: zod
    .string()
    .optional()
});

export const updateUserSchema = zod.object({
  name: zod
    .string()
    .min(2)
    .optional(),

  email: zod
    .string()
    .email()
    .toLowerCase()
    .optional(),

  phone: zod
    .string()
    .min(10)
    .max(15)
    .optional(),

  role: zod
    .enum(["ADMIN", "MANAGER", "CASHIER", "ACCOUNTANT"])
    .optional(),

  shiftType: zod
    .enum(["MORNING", "EVENING", "NIGHT"])
    .optional(),

  isActive: zod
    .boolean()
    .optional()
});

export const createProductSchema = zod.object({
  name: zod
    .string( "Product name is required" )
    .min(1, "Product name cannot be empty")
    .trim(),

  image: zod.string().optional(),

  type: zod.enum(productTypes)
  ,

  unit: zod.enum(productUnits),

  costPrice: zod
    .number("Cost price is required" )
    .nonnegative("Cost price must be >= 0"),

  sellingPrice: zod
    .number("Selling price is required" )
    .nonnegative("Selling price must be >= 0"),

  minimumStockAlert: zod
    .number()
    .nonnegative("Minimum stock alert cannot be negative")
    .optional(),

  cgstPercent: zod
    .number()
    .min(0, "CGST must be >= 0")
    .max(100, "CGST cannot exceed 100")
    .optional()
    .default(0),

  sgstPercent: zod
    .number()
    .min(0, "SGST must be >= 0")
    .max(100, "SGST cannot exceed 100")
    .optional()
    .default(0),

  tankIds: zod
    .array(zod.string())
    .optional(),

  hsnCode: zod.string().optional()

}).superRefine((data, ctx) => {
  // Selling price validation
  if (data.sellingPrice < data.costPrice) {
    ctx.addIssue({
      code: zod.ZodIssueCode.custom,
      message: "Selling price must be greater than or equal to cost price",
      path: ["sellingPrice"]
    });
  }
});

export const updateProductSchema = zod.object({
  name: zod
    .string("Product name is required")
    .min(1, "Product name cannot be empty")
    .trim()
    .optional(),

  image: zod.string().optional(),

  type: zod.enum(productTypes).optional(),

  unit: zod.enum(productUnits).optional(),

  costPrice: zod
    .number()
    .nonnegative("Cost price must be >= 0")
    .optional(),

  sellingPrice: zod
    .number()
    .nonnegative("Selling price must be >= 0")
    .optional(),

  minimumStockAlert: zod
    .number()
    .nonnegative("Minimum stock alert cannot be negative")
    .optional(),

  cgstPercent: zod
    .number()
    .min(0, "CGST must be >= 0")
    .max(100, "CGST cannot exceed 100")
    .optional(),

  sgstPercent: zod
    .number()
    .min(0, "SGST must be >= 0")
    .max(100, "SGST cannot exceed 100")
    .optional(),

  tankIds: zod
    .array(zod.string())
    .optional(),

  hsnCode: zod.string().optional(),

  isActive: zod
    .boolean()
    .optional(),
}).superRefine((data, ctx) => {
  // Selling price validation if both prices are provided
  if (data.sellingPrice !== undefined && data.costPrice !== undefined && data.sellingPrice < data.costPrice) {
    ctx.addIssue({
      code: zod.ZodIssueCode.custom,
      message: "Selling price must be greater than or equal to cost price",
      path: ["sellingPrice"]
    });
  }
});

export const createFinancialYearSchema = zod.object({
  name: zod
    .string()
    .min(1, "Financial year name is required")
    .regex(/^\d{4}-\d{4}$/, "Format should be YYYY-YYYY (e.g., 2024-2025)"),

  startDate: zod
    .string()
    .datetime("Invalid date format"),

  endDate: zod
    .string()
    .datetime("Invalid date format"),
    isActive: zod.boolean().optional()
});

export const updateFinancialYearSchema = zod.object({
  name: zod
    .string()
    .min(1, "Financial year name is required")
    .regex(/^\d{4}-\d{4}$/, "Format should be YYYY-YYYY (e.g., 2024-2025)")
    .optional(),

  startDate: zod
    .string()
    .datetime("Invalid date format")
    .optional(),

  endDate: zod
    .string()
    .datetime("Invalid date format")
    .optional(),

  isActive: zod
    .boolean()
    .optional(),
});

export const createSupplierSchema = zod.object({
  name: zod
    .string()
    .min(2, "Name must be at least 2 characters"),

  email: zod
    .string()
    .email("Invalid email format")
    .toLowerCase(),

  phone: zod
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(11, "Phone number too long"),

  gstId: zod
    .string()
    .min(15, "GST ID must be at least 15 characters")
    .max(15, "GST ID cannot exceed 15 characters")
    .optional(),

  address: zod
    .string()
    .min(5, "Address must be at least 5 characters")
    .optional(),

  isActive: zod
    .boolean()
    .optional(),
});

export const updateSupplierSchema = zod.object({
  name: zod
    .string()
    .min(2)
    .optional(),

  email: zod
    .string()
    .email()
    .toLowerCase()
    .optional(),

  phone: zod
    .string()
    .min(10)
    .max(15)
    .optional(),

  gstId: zod
    .string()
    .min(15)
    .max(15)
    .optional(),

  address: zod
    .string()
    .min(5)
    .optional(),

  isActive: zod
    .boolean()
    .optional()
});

// ===============================
// PURCHASE SCHEMA (frontend copy of backend purchase.schema.js)
// ===============================

const objectIdSchema = zod.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid ObjectId");

export const purchaseItemSchema = zod.object({
  productId: objectIdSchema,

  quantity: zod.coerce
    .number()
    .positive("Quantity must be greater than 0"),

  costPrice: zod.coerce
    .number()
    .positive("Cost price must be greater than 0")
    .optional(),

  discount: zod.coerce
    .number()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100")
    .default(0),

  tankId: zod
    .string()
    .regex(/^[a-fA-F0-9]{24}$/, { message: "Invalid tankId" })
    .nullable()
    .optional()
});

export const createPurchaseSchema = zod
  .object({
    supplierId: objectIdSchema,

    invoiceNo: zod
      .string()
      .trim()
      .min(1, "Invoice number is required"),

    purchaseDate: zod.coerce.date(),

    paymentStatus: zod.enum(["PAID", "DUE", "PARTIAL"]),

    paymentMethod: zod
      .enum(["CASH", "BANK", "UPI", "CARD"]) 
      .default("CASH"),

    paidAmount: zod.coerce
      .number()
      .min(0, "Paid amount cannot be negative")
      .default(0),

    items: zod
      .array(purchaseItemSchema)
      .min(1, "At least one product is required")
  })
  .superRefine((data, ctx) => {
    if (data.paymentStatus === "DUE" && data.paidAmount !== 0) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        message: "For DUE status, paidAmount must be 0",
        path: ["paidAmount"]
      });
    }

    if (data.paymentStatus === "PARTIAL" && data.paidAmount === 0) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        message: "For PARTIAL status, paidAmount must be greater than 0",
        path: ["paidAmount"]
      });
    }

    if (data.paymentStatus === "PAID" && data.paidAmount === 0) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        message: "For PAID status, paidAmount must be greater than 0",
        path: ["paidAmount"]
      });
    }
  });
