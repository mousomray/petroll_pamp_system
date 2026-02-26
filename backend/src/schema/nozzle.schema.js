// validations/nozzle.validation.js

const { z } = require("zod");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createNozzleSchema = z.object({
    nozzleNumber: z
        .string()
        .min(2, "Nozzle number must be at least 2 characters")
        .max(20, "Nozzle number too long")
        .trim(),

    tank: z
        .string()
        .regex(objectIdRegex, "Invalid Tank ID"),

    machineName: z
        .string()
        .optional(),
});


const updateNozzleSchema = z.object({
    nozzleNumber: z
        .string()
        .min(2, "Nozzle number must be at least 2 characters")
        .max(20, "Nozzle number too long")
        .trim(),

    tank: z
        .string()
        .regex(objectIdRegex, "Invalid Tank ID"),

    machineName: z
        .string()
        .optional(),
    isActive: z
        .boolean()
        .optional(),
})

module.exports = { createNozzleSchema, updateNozzleSchema }