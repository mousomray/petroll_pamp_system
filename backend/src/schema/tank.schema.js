import { z } from "zod";
import mongoose from "mongoose";

const createTankSchema = z.object({
  tankName: z
    .string()
    .trim()
    .min(2, "Tank name must be at least 2 characters")
    .max(100, "Tank name too long"),

  productId: z
    .string()
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid productId"
    }),

  capacity: z
    .number({
      required_error: "Capacity is required"
    })
    .positive("Capacity must be greater than 0")
});

const updateTankSchema = z.object({
  tankName: z
    .string()
    .trim()
    .min(2, "Tank name must be at least 2 characters")
    .max(100, "Tank name too long")
    .optional(),

  capacity: z
    .number()
    .positive("Capacity must be greater than 0")
    .optional(),

  isActive: z
    .boolean()
    .optional()
});

module.exports = {createTankSchema, updateTankSchema};