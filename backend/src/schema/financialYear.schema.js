const { z } = require("zod");

const createFinancialYearSchema = z.object({
    name: z
        .string()
        .min(4, "Financial year name required")
        .regex(/^\d{4}-\d{4}$/, "Format must be YYYY-YYYY"),

    startDate: z.coerce.date({
        errorMap: () => ({ message: "Invalid start date" })
    }),

    endDate: z.coerce.date({
        errorMap: () => ({ message: "Invalid end date" })
    }),

    isActive: z.boolean().optional()
}).refine((data) => data.startDate < data.endDate, {
    message: "Start date must be before end date",
    path: ["endDate"]
});

const updateFinancialYearSchema = z.object({
    name: z.string().optional(),

    startDate: z.coerce.date().optional(),

    endDate: z.coerce.date().optional(),

    isActive: z.boolean().optional()
});

module.exports = {
    createFinancialYearSchema,
    updateFinancialYearSchema
};