const mongoose = require("mongoose");
const { model, Schema } = mongoose;


const meterReadingSchema = new Schema({

  shiftId: {
    type: Schema.Types.ObjectId,
    ref: "Shift",
    required: true
  },

  nozzleId: {
    type: Schema.Types.ObjectId,
    ref: "Nozzle",
    required: true
  },

  openingReading: {
    type: Number,
  },

  closingReading: {
    type: Number,
  },

  totalLitres: {
    type: Number,
    default: 0
  },

  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  }

}, { timestamps: true });

const MeterReadingModel = model("MeterReading", meterReadingSchema);



module.exports = MeterReadingModel;