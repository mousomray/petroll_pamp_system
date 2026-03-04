const { z } = require("zod");


const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format");


const addMultipleReadingsSchema = z.object({
  shiftId: objectIdSchema,

  readings: z
    .array(
      z.object({
        nozzleId: objectIdSchema,

        openingReading: z
          .number({
            required_error: "Opening reading is required"
          })
          .nonnegative("Opening reading must be 0 or positive")
      })
    )
    .min(1, "At least one reading is required")
});


const closeMultipleReadingsSchema = z.object({
  shiftId: objectIdSchema,

  readings: z
    .array(
      z.object({
        readingId: objectIdSchema,

        closingReading: z
          .number({
            required_error: "Closing reading is required"
          })
          .nonnegative("Closing reading must be positive")
      })
    )
    .min(1, "At least one closing reading is required")
});

module.exports = {
  addMultipleReadingsSchema,
  closeMultipleReadingsSchema
};