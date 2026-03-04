const { z } = require("zod");

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

const endShiftSchema = z.object({
  shiftId: objectIdSchema,

  cashCollected: z
    .number()
    .nonnegative("Cash must be positive"),

  onlineCollected: z
    .number()
    .nonnegative("Online must be positive")
});

module.exports = {
  endShiftSchema
};