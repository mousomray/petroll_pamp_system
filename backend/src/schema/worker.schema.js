const { z } = require("zod");


const createWorkerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50),

  email: z
    .string()
    .email("Invalid email format")
    .toLowerCase()
    .optional(),

  phone: z
    .string()
    .min(10, "Phone must be at least 10 digits")
    .max(15)
    .optional(),

  workerType: z.enum([
    "NOZZLE_BOY",
    "SWEEPER",
    "SECURITY",
    "TANK_OPERATOR",
    "SUPERVISOR"
  ])
});



const updateWorkerSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(15).optional(),
  workerType: z.enum([
    "NOZZLE_BOY",
    "SWEEPER",
    "SECURITY",
    "TANK_OPERATOR",
    "SUPERVISOR"
  ]).optional(),
  isActive: z.boolean().optional()
});

module.exports = {
  createWorkerSchema,
  updateWorkerSchema
};