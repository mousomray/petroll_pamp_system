// validations/nozzle.validation.js

const { z } = require("zod");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createNozzleSchema = z.object({
    nozzleNumber: z
        .string()
        .min(2, "Nozzle number must be at least 2 characters")
        .trim(),

    tank: z
        .string()
        .regex(objectIdRegex, "Invalid Tank ID"),

    machineName: z
        .string()
        .trim()
        .optional(),

    });


const updateNozzleSchema = z.object({
    nozzleNumber: z
        .string()
        .min(2, "Nozzle number must be at least 2 characters")
        .trim()
        .optional(),

    tank: z
        .string()
        .regex(objectIdRegex, "Invalid Tank ID")
        .optional(),

    machineName: z
        .string()
        .trim()
        .optional(),

    status: z
        .enum(["ACTIVE", "INACTIVE", "MAINTENANCE"])
        .optional(),
});

module.exports = { createNozzleSchema, updateNozzleSchema };