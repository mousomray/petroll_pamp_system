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
// TANK DISTRIBUTION SCHEMA
// ===============================
const tankDistributionSchema = z.object({
  tankId: objectIdSchema,
  quantity: z.coerce
    .number()
    .positive("Tank quantity must be greater than 0")
});

// ===============================
// CREATE OPENING STOCK SCHEMA
// ===============================
const createOpeningStockSchema = z.object({
  userId: objectIdSchema,

  productId: objectIdSchema,

  openingStock: z.coerce
    .number()
    .positive("Opening stock must be greater than 0"),

  tanks: z
    .array(tankDistributionSchema)
    .optional()
    .default([])
});

module.exports = {
  createOpeningStockSchema,
  tankDistributionSchema
};