const { z } = require("zod");
const mongoose = require("mongoose");

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

  // ❌ costPrice removed (backend থেকে আসবে)

  discount: z.coerce
    .number()
    .min(0, "Discount cannot be negative")
    .default(0),

  taxPercent: z.coerce
    .number()
    .min(0, "Tax percent cannot be negative")
    .max(100, "Tax percent cannot exceed 100")
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

    financialYearId: objectIdSchema,

    invoiceNo: z
      .string()
      .trim()
      .max(100, "Invoice too long")
      .optional(),

    invoiceDate: z.coerce.date().optional(),

    purchaseDate: z.coerce.date(),

    hsnCode: z.string().trim().optional(),

    paymentStatus: z.enum(["PAID", "DUE", "PARTIAL"]),

    paymentMethod: z
      .enum(["CASH", "BANK", "UPI"])
      .default("CASH"),

    paidAmount: z.coerce
      .number()
      .min(0, "Paid amount cannot be negative")
      .default(0),

    subTotal: z.coerce
      .number()
      .nonnegative("Subtotal cannot be negative"),

    discount: z.coerce
      .number()
      .min(0)
      .default(0),

    cgst: z.coerce
      .number()
      .min(0)
      .default(0),

    sgst: z.coerce
      .number()
      .min(0)
      .default(0),

    taxAmount: z.coerce
      .number()
      .min(0)
      .default(0),

    roundOff: z.coerce
      .number()
      .default(0),

    totalAmount: z.coerce
      .number()
      .positive("Total amount must be greater than 0"),

    items: z
      .array(purchaseItemSchema)
      .min(1, "At least one product is required")
  })
  .superRefine((data, ctx) => {

    // ===============================
    // Payment Validation
    // ===============================
    if (data.paidAmount > data.totalAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Paid amount cannot exceed total amount",
        path: ["paidAmount"]
      });
    }

    if (data.paymentStatus === "PAID" && data.paidAmount !== data.totalAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "For PAID status, paidAmount must equal totalAmount",
        path: ["paidAmount"]
      });
    }

    if (data.paymentStatus === "DUE" && data.paidAmount !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "For DUE status, paidAmount must be 0",
        path: ["paidAmount"]
      });
    }

    if (
      data.paymentStatus === "PARTIAL" &&
      (data.paidAmount === 0 || data.paidAmount === data.totalAmount)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "For PARTIAL status, paidAmount must be between 0 and totalAmount",
        path: ["paidAmount"]
      });
    }

    // ===============================
    // GST Logical Validation
    // ===============================
    if (data.cgst + data.sgst > data.taxAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CGST + SGST cannot exceed total taxAmount",
        path: ["taxAmount"]
      });
    }
  });

module.exports = { createPurchaseSchema, purchaseItemSchema };