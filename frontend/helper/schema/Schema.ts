import { z as zod } from 'zod'

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
    .string()
    .min(1, "Product name is required")
    .trim(),

  type: zod
    .enum(["FUEL", "OIL", "TYRE", "ACCESSORY"], {
      message: "Invalid product type"
    }),

    unit: zod
    .enum(["LITRE", "PIECE", "KG", "BOX"], {
      message: "Invalid unit"
    }),

  costPrice: zod
    .number()
    .nonnegative("Cost price must be >= 0"),

  sellingPrice: zod
    .number()
    .nonnegative("Selling price must be >= 0"),

  minimumStockAlert: zod
    .number()
    .nonnegative("Minimum stock alert cannot be negative")
    .optional(),
});

export const updateProductSchema = zod.object({
  name: zod
    .string()
    .min(1, "Product name cannot be empty")
    .trim()
    .optional(),

    unit: zod
    .enum(["LITRE", "PIECE", "KG", "BOX"], {
      message: "Invalid unit"
    }),

  type: zod
    .enum(["FUEL", "OIL", "TYRE", "ACCESSORY"], {
      message: "Invalid product type"
    })
    .optional(),

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

  isActive: zod
    .boolean()
    .optional(),
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

export const createPurchaseSchema = zod.object({
  supplierId: zod
    .string()
    .min(1, "Supplier is required"),

  financialYearId: zod
    .string()
    .min(1, "Financial year is required"),

  invoiceNo: zod
    .string()
    .min(1, "Invoice number is required")
    .trim(),

  purchaseDate: zod
    .string()
    .min(1, "Purchase date is required"),

  paymentStatus: zod
    .enum(["PAID", "PARTIAL", "UNPAID"], {
      message: "Invalid payment status"
    }),

  paymentMethod: zod
    .enum(["CASH", "ONLINE", "CHEQUE", "UPI", "CARD"], {
      message: "Invalid payment method"
    }),

  paidAmount: zod
    .number()
    .nonnegative("Paid amount cannot be negative"),

  items: zod
    .array(
      zod.object({
        productId: zod
          .string()
          .min(1, "Product is required"),

        quantity: zod
          .number()
          .positive("Quantity must be greater than 0"),

        discount: zod
          .number()
          .nonnegative("Discount cannot be negative")
          .default(0),

        cgstPercent: zod
          .number()
          .nonnegative("CGST cannot be negative")
          .max(100, "CGST cannot exceed 100%")
          .default(0),

        sgstPercent: zod
          .number()
          .nonnegative("SGST cannot be negative")
          .max(100, "SGST cannot exceed 100%")
          .default(0),

        igstPercent: zod
          .number()
          .nonnegative("IGST cannot be negative")
          .max(100, "IGST cannot exceed 100%")
          .default(0),

        tankId: zod
          .string()
          .optional(),
      })
    )
    .min(1, "At least one item is required"),
});