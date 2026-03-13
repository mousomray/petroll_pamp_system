const { z } = require("zod");
const mongoose = require("mongoose");

// ===============================
// OBJECT ID VALIDATION
// ===============================
const objectIdSchema = z.string().refine(
  (val) => mongoose.Types.ObjectId.isValid(val),
  { message: "Invalid ObjectId" }
);

// ===============================
// ITEM SCHEMA
// ===============================
const purchaseItemSchema = z.object({
  productId: objectIdSchema,

  quantity: z.coerce
    .number()
    .positive("Quantity must be greater than 0"),

  costPrice: z.coerce
    .number()
    .positive("Cost price must be greater than 0")
    .optional(), // optional (product থেকে আসতে পারে)

  discount: z.coerce
    .number()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100")
    .default(0),

  tankId: z
    .string()
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid tankId"
    })
    .nullable()
    .optional()
});

// ===============================
// MASTER PURCHASE SCHEMA
// ===============================
const createPurchaseSchema = z
  .object({
    supplierId: objectIdSchema,

    invoiceNo: z
      .string()
      .trim()
      .min(1, "Invoice number is required"),

    purchaseDate: z.coerce.date(),

    paymentStatus: z.enum(["PAID", "DUE", "PARTIAL"]),

    paymentMethod: z
      .enum(["CASH", "BANK", "UPI", "CARD"])
      .default("CASH"),

      instrumentId: z
      .string()
      .trim()
      .optional(),

      instrumentDate: z.coerce.date().optional(),

    paidAmount: z.coerce
      .number()
      .min(0, "Paid amount cannot be negative")
      .default(0),

    items: z
      .array(purchaseItemSchema)
      .min(1, "At least one product is required")
  })
  .superRefine((data, ctx) => {

    // ===============================
    // BASIC PAYMENT LOGIC CHECK
    // (Final total backend calculate করবে)
    // ===============================

    if (data.paymentStatus === "DUE" && data.paidAmount !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "For DUE status, paidAmount must be 0",
        path: ["paidAmount"]
      });
    }

    if (data.paymentStatus === "PARTIAL" && data.paidAmount === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "For PARTIAL status, paidAmount must be greater than 0",
        path: ["paidAmount"]
      });
    }

    if (data.paymentStatus === "PAID" && data.paidAmount === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "For PAID status, paidAmount must be greater than 0",
        path: ["paidAmount"]
      });
    }

  });

module.exports = {
  createPurchaseSchema,
  purchaseItemSchema
};