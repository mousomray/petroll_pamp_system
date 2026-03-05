const { z } = require("zod");

const closeShiftSchema = z.object({
    shiftId: z.string().nonempty("Shift ID is required"),
    cashCollected: z
        .number({ invalid_type_error: "Cash collected must be a number" })
        .min(0)
        .optional()
        .default(0),
    onlineCollected: z
        .number({ invalid_type_error: "Online collected must be a number" })
        .min(0)
        .optional()
        .default(0)
});

module.exports = { closeShiftSchema };