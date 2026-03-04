const mongoose = require("mongoose");


const MeterReadingModel = require("../model/meterReading.model");
const ShiftModel = require("../model/shiftModel");
const {addMultipleReadingsSchema,closeMultipleReadingsSchema} = require("../schema/meterReading.schema")

const addOpeningMeterReadings = async (req, res) => {
  try {
    const validatedData = addMultipleReadingsSchema.parse(req.body);

    const userId = req.user._id;
    const { shiftId, readings } = validatedData;

    const shift = await ShiftModel.findOne({
      _id: shiftId,
      userId
    });

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Shift not found"
      });
    }

    if (shift.status !== "OPEN") {
      return res.status(400).json({
        success: false,
        message: "Shift is not active"
      });
    }


    const nozzleIds = readings.map(r =>
      new mongoose.Types.ObjectId(r.nozzleId)
    );

    const existing = await MeterReadingModel.find({
      shiftId,
      nozzleId: { $in: nozzleIds }
    });

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Some nozzles already have opening readings for this shift"
      });
    }

   
    const dataToInsert = readings.map(item => ({
      shiftId,
      workerId: shift.workerId,
      nozzleId: item.nozzleId,
      openingReading: item.openingReading,
      closingReading: 0,
      totalLitres: 0,
      userId
    }));

    await MeterReadingModel.insertMany(dataToInsert);

    return res.status(200).json({
      success: true,
      message: "Opening meter readings added successfully"
    });

  } catch (error) {

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        errors: error.errors
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


const closeMultipleMeterReadings = async (req, res) => {
  try {
    
    const validatedData = closeMultipleReadingsSchema.parse(req.body);

    const userId = req.user._id;
    const { shiftId, readings } = validatedData;

    const shift = await ShiftModel.findOne({
      _id: shiftId,
      userId
    });

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Shift not found"
      });
    }

    if (shift.status !== "OPEN") {
      return res.status(400).json({
        success: false,
        message: "Shift is already closed"
      });
    }

    
    const readingIds = readings.map(r => r.readingId);

    const existingReadings = await MeterReadingModel.find({
      _id: { $in: readingIds },
      shiftId,
      userId
    });

    if (existingReadings.length !== readings.length) {
      return res.status(400).json({
        success: false,
        message: "Some readings not found in this shift"
      });
    }

 
    for (const item of readings) {

      const reading = existingReadings.find(
        r => r._id.toString() === item.readingId
      );

      if (item.closingReading < reading.openingReading) {
        return res.status(400).json({
          success: false,
          message: `Closing reading cannot be less than opening for nozzle ${reading.nozzleId}`
        });
      }

      reading.closingReading = item.closingReading;
      reading.totalLitres =
        item.closingReading - reading.openingReading;

      await reading.save();
    }

    return res.status(200).json({
      success: true,
      message: "All closing meter readings updated successfully"
    });

  } catch (error) {

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        errors: error.errors
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  addOpeningMeterReadings,
  closeMultipleMeterReadings
};


