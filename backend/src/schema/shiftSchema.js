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


const closeShiftMultipleReadingsSchema = z.object({
  shiftId: objectIdSchema,
  readings: z.array(
    z.object({
      readingId: objectIdSchema, 
      nozzleId: objectIdSchema, 
      closingReading: z
        .number({
          required_error: "Closing reading is required"
        })
        .nonnegative("Closing reading must be positive")
    })
  )
});





const createShiftSchema = z.object({
  workerId: objectIdSchema,

  nozzles: z
    .array(
      z.object({
        nozzleId: objectIdSchema,
        openingReading: z
          .number()
          .nonnegative("Opening reading must be positive")
          .optional()
      })
    )
    .optional()
});

module.exports = {
  createShiftSchema,
  closeShiftMultipleReadingsSchema
};