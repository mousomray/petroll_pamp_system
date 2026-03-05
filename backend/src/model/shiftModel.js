const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const shiftSchema = new Schema({

  workerId: {
    type: Schema.Types.ObjectId,
    ref: "Worker",
    required: true,
    index: true
  },

  nozzleIds: [
    {
      type: Schema.Types.ObjectId,
      ref: "Nozzle",
      required: true
    }
  ],

  shiftStart: {
    type: Date,
    default: Date.now
  },


  shiftEnd: {
    type: Date
  },


  status: {
    type: String,
    enum: ["OPEN", "CLOSED"],
    default: "OPEN",
    index: true
  },

  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  }

}, { timestamps: true });



shiftSchema.index(
  { workerId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "OPEN" } }
);

const ShiftModel = model("Shift", shiftSchema);

module.exports = ShiftModel;