const shiftSchema = new mongoose.Schema({
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Worker"
  },
  nozzleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Nozzle"
  },

  openingReading: Number,
  closingReading: Number,

  totalSaleLitres: Number,
  fuelRate: Number,
  totalSaleAmount: Number,

  cashCollected: Number,
  onlineCollected: Number,

  shortageOrExcess: Number,

  shiftStart: Date,
  shiftEnd: Date,
  status: {
    type: String,
    enum: ["OPEN", "CLOSED"],
    default: "OPEN"
  }
}, { timestamps: true });