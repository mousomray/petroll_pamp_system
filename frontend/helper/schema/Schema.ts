import { z as zod } from 'zod'

export const LoginSchema = zod.object({
  email: zod
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  password: zod
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters long'),
})

export const createUserSchema = zod.object({
  name: zod
    .string()
    .min(2, "Name must be at least 2 characters"),

  email: zod
    .string()
    .email("Invalid email format")
    .toLowerCase(),

  phone: zod
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(11, "Phone number too long"),

  password: zod
    .string()
    .min(6, "Password must be at least 6 characters"),

  role: zod
    .enum(["ADMIN", "MANAGER", "CASHIER", "ACCOUNTANT"]),

  shiftType: zod
    .enum(["MORNING", "EVENING", "NIGHT"]),

  isActive: zod
    .boolean()
    .optional(),

  createdBy: zod
    .string()
    .optional()
});

export const updateUserSchema = zod.object({
  name: zod
    .string()
    .min(2)
    .optional(),

  email: zod
    .string()
    .email()
    .toLowerCase()
    .optional(),

  phone: zod
    .string()
    .min(10)
    .max(15)
    .optional(),

  role: zod
    .enum(["ADMIN", "MANAGER", "CASHIER", "ACCOUNTANT"])
    .optional(),

  shiftType: zod
    .enum(["MORNING", "EVENING", "NIGHT"])
    .optional(),

  isActive: zod
    .boolean()
    .optional()
});