const { z } = require("zod");

const createSupplierSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .trim(),

  email: z
    .string()
    .email("Invalid email format")
    .toLowerCase(),

  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number too long")
    .optional(),

  gstId: z
    .string()
    .optional(),

  address: z
    .string()
    .min(5, "Address too short")
    .optional(),
});


const updateSupplierSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .trim()
    .optional(),

  email: z
    .string()
    .email("Invalid email format")
    .toLowerCase()
    .optional(),

  phone: z
    .string()
    .min(10)
    .max(15)
    .optional(),

  gstId: z
    .string()
    .optional(),

  address: z
    .string()
    .min(5)
    .optional(),
  isActive: z
    .boolean()
    .optional(),
});

module.exports = {
  createSupplierSchema,
  updateSupplierSchema
};