const mongoose = require("mongoose");


const MeterReadingModel = require("../model/meterReading.model");
const ShiftModel = require("../model/shiftModel");
const { addMultipleReadingsSchema, closeMultipleReadingsSchema } = require("../schema/meterReading.schema")

const addOpeningMeterReadings = async (req, res) => {
  try {
    const validatedData = addMultipleReadingsSchema.parse(req.body);

    const userId = req.user._id;
    const { shiftId, readings } = validatedData;

    const shift = await ShiftModel.findOne({
      _id: shiftId,
      userId,
    });

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Shift not found",
      });
    }

    if (shift.status !== "OPEN") {
      return res.status(400).json({
        success: false,
        message: "Shift is not active",
      });
    }

    const shiftNozzleIds = shift.nozzleIds.map(id => id.toString());

    for (const item of readings) {
      if (!shiftNozzleIds.includes(item.nozzleId)) {
        return res.status(400).json({
          success: false,
          message: `Nozzle ${item.nozzleId} does not belong to this shift`,
        });
      }
    }

    const nozzleObjectIds = readings.map(r =>
      new mongoose.Types.ObjectId(r.nozzleId)
    );

    const existing = await MeterReadingModel.find({
      shiftId,
      nozzleId: { $in: nozzleObjectIds },
    });

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Some nozzles already have opening readings for this shift",
      });
    }

    const nozzles = await NozzleModel.find({
      _id: { $in: nozzleObjectIds },
    });

    const nozzleMap = {};
    nozzles.forEach(nz => {
      nozzleMap[nz._id.toString()] = nz;
    });

    for (const item of readings) {
      const nozzle = nozzleMap[item.nozzleId];

      if (!nozzle) {
        return res.status(400).json({
          success: false,
          message: `Nozzle ${item.nozzleId} not found`,
        });
      }

      if (item.openingReading < nozzle.currentReading) {
        return res.status(400).json({
          success: false,
          message: `Opening reading cannot be less than current meter reading for nozzle ${nozzle.nozzleNumber}`,
        });
      }
    }

    const dataToInsert = readings.map(item => ({
      shiftId,
      workerId: shift.workerId,
      nozzleId: item.nozzleId,
      openingReading: item.openingReading,
      closingReading: 0,
      totalLitres: 0,
      userId,
    }));

    await MeterReadingModel.insertMany(dataToInsert);

    return res.status(200).json({
      success: true,
      message: "Opening meter readings added successfully",
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        errors: error.errors,
      });
    }

    console.error("Opening Reading Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getMeterReadings = async (req, res) => {
  try {

    const userId = req.user._id;

    let { page = 1, limit = process.env.DEFAULT_PAGE_SIZE, search = "", shiftId } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const matchStage = {
      userId: new mongoose.Types.ObjectId(userId)
    };

    if (shiftId && mongoose.Types.ObjectId.isValid(shiftId)) {
      matchStage.shiftId = new mongoose.Types.ObjectId(shiftId);
    }

    const pipeline = [

      { $match: matchStage },

      {
        $lookup: {
          from: "shifts",
          localField: "shiftId",
          foreignField: "_id",
          as: "shift"
        }
      },
      { $unwind: "$shift" },

      {
        $lookup: {
          from: "workers",
          localField: "shift.workerId",
          foreignField: "_id",
          as: "worker"
        }
      },
      { $unwind: "$worker" },

      {
        $lookup: {
          from: "nozzles",
          localField: "nozzleId",
          foreignField: "_id",
          as: "nozzle"
        }
      },
      { $unwind: "$nozzle" },

      {
        $match: search
          ? {
            $or: [
              { "worker.name": { $regex: search, $options: "i" } },
              { "nozzle.nozzleNumber": { $regex: search, $options: "i" } }
            ]
          }
          : {}
      },

      {
        $group: {
          _id: {
            shiftId: "$shift._id",
            workerId: "$worker._id"
          },

          shiftStart: { $first: "$shift.shiftStart" },
          shiftStatus: { $first: "$shift.status" },

          worker: {
            $first: {
              _id: "$worker._id",
              name: "$worker.name",
              phone: "$worker.phone"
            }
          },

          nozzles: {
            $push: {
              _id: "$nozzle._id",
              nozzleNumber: "$nozzle.nozzleNumber",
              openingReading: "$openingReading",
              closingReading: "$closingReading",
              totalLitres: "$totalLitres",
              currentReading: "$nozzle.currentReading"
            }
          }
        }
      },

      { $sort: { shiftStart: -1 } },

      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit }
          ],
          totalCount: [
            { $count: "count" }
          ]
        }
      }

    ];

    const result = await MeterReadingModel.aggregate(pipeline);

    const data = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {

    console.error("Meter Reading List Error:", error);

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
  getMeterReadings,
  closeMultipleMeterReadings
};


