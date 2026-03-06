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
// TANK DISTRIBUTION
// ===============================
const tankDistributionSchema = z.object({
  tankId: objectIdSchema,
  quantity: z.coerce
    .number()
    .min(0, "Tank quantity cannot be negative")
});

// ===============================
// SINGLE PRODUCT SCHEMA
// ===============================
const singleProductSchema = z.object({
  productId: objectIdSchema,
  openingStock: z.coerce
    .number()
    .min(0, "Opening stock cannot be negative"),
  tanks: z
    .array(tankDistributionSchema)
    .optional()
    .default([])
});

// ===============================
// CREATE OPENING STOCK SCHEMA
// ===============================
const createOpeningStockSchema = z.object({
  products: z
    .array(singleProductSchema)
    .min(1, "At least one product is required")
});



module.exports = {
  createOpeningStockSchema,
  tankDistributionSchema
};