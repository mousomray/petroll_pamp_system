const { z } = require("zod");
const mongoose = require("mongoose");

const objectId = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: "Invalid ObjectId",
});

const saleItemSchema = z.object({
  productId: objectId,
  qty: z.number().positive(),
});

const createAccessorySaleSchema = z.object({
  shiftId: objectId,
  workerId: objectId,

  paymentMethod: z.enum(["CASH", "UPI", "CARD"]).optional(),

  items: z.array(saleItemSchema).min(1),
});

module.exports = {
  createAccessorySaleSchema
};