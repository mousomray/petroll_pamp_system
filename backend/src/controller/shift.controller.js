const mongoose = require("mongoose");
const ShiftModel = require("../model/shiftModel")
const WorkerModel = require("../model/worker.model");
const NozzleModel = require("../model/nozzel.model");
const {closeShiftMultipleReadingsSchema} = require("../schema/shiftSchema")
const  MeterReadingModel = require("../model/meterReading.model")


const DEFAULT_PAGE_SIZE = parseInt(process.env.DEFAULT_PAGE_SIZE) || 10;

const createShift = async (req, res) => {
  try {
    const validatedData = createShiftSchema.parse(req.body);

    const userId = req.user?._id;
    const { workerId, nozzles = [] } = validatedData;

    // 🔎 Find worker
    const worker = await WorkerModel.findOne({
      _id: workerId,
      createdBy: userId
    });

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found"
      });
    }

    // 🔎 Worker already has open shift
    const existingShift = await ShiftModel.findOne({
      workerId,
      status: "OPEN"
    });

    if (existingShift) {
      return res.status(400).json({
        success: false,
        message: "Worker already has an open shift"
      });
    }

    let nozzleIds = [];

    // 🚨 If worker is NOZZLE_BOY
    if (worker.workerType === "NOZZLE_BOY") {

      if (!nozzles || nozzles.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Nozzles are required for nozzle boy"
        });
      }

      const missingReading = nozzles.find(n => n.openingReading === undefined);

      if (missingReading) {
        return res.status(400).json({
          success: false,
          message: "Opening reading required for each nozzle"
        });
      }

      nozzleIds = nozzles.map(n => n.nozzleId);

      // 🔎 Validate nozzles
      const validNozzles = await NozzleModel.find({
        _id: { $in: nozzleIds },
        userId
      });

      if (validNozzles.length !== nozzleIds.length) {
        return res.status(400).json({
          success: false,
          message: "Some nozzleIds are invalid"
        });
      }

      // 🔎 Check nozzle already used
      const nozzleInUse = await ShiftModel.findOne({
        nozzleIds: { $in: nozzleIds },
        status: "OPEN"
      });

      if (nozzleInUse) {
        return res.status(400).json({
          success: false,
          message: "One or more nozzles already assigned"
        });
      }

    }

    // 🚀 Create Shift
    const shift = await ShiftModel.create({
      workerId,
      nozzleIds,
      userId,
      status: "OPEN",
      shiftStart: new Date()
    });

    // 🚀 Insert meter readings only for nozzle boy
    if (worker.workerType === "NOZZLE_BOY") {

      const meterReadings = nozzles.map(n => ({
        shiftId: shift._id,
        nozzleId: n.nozzleId,
        openingReading: n.openingReading,
        userId
      }));

      await MeterReadingModel.insertMany(meterReadings);
    }

    return res.status(200).json({
      success: true,
      message: "Shift started successfully",
      data: shift
    });

  } catch (error) {

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        errors: error.errors
      });
    }

    console.error("Create Shift Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getAllShifts = async (req, res) => {
  try {
    const userId = req.user._id;

    let { page = 1, limit, search } = req.query;

    page = parseInt(page);
    limit = parseInt(limit) || DEFAULT_PAGE_SIZE;

    const matchStage = {
      userId: new mongoose.Types.ObjectId(userId),
    };

    const pipeline = [

    
      { $match: matchStage },

    
      {
        $lookup: {
          from: "workers",
          localField: "workerId",
          foreignField: "_id",
          as: "worker"
        }
      },

      
      {
        $unwind: {
          path: "$worker",
          preserveNullAndEmptyArrays: true
        }
      },

    
      ...(search
        ? [{
          $match: {
            $or: [
              { "worker.name": { $regex: search, $options: "i" } },
              { status: { $regex: search, $options: "i" } }
            ]
          }
        }]
        : []),

      
      { $sort: { createdAt: -1 } },

   
      {
        $facet: {
          data: [
            { $skip: (page - 1) * limit },
            { $limit: limit }
          ],
          totalCount: [
            { $count: "count" }
          ]
        }
      }
    ];

    const result = await ShiftModel.aggregate(pipeline);

    const shifts = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: shifts
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}


const getShiftById = async (req, res) => {
  try {
    const { id } = req.params;

    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shift ID",
      });
    }

    const shift = await ShiftModel.aggregate([
     
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
        },
      },

      
      {
        $lookup: {
          from: "workers",
          localField: "workerId",
          foreignField: "_id",
          as: "worker",
        },
      },
      {
        $unwind: {
          path: "$worker",
          preserveNullAndEmptyArrays: true,
        },
      },

     
      {
        $lookup: {
          from: "nozzles",
          localField: "nozzleIds",
          foreignField: "_id",
          as: "nozzles",
        },
      },

      
      {
        $project: {
          _id: 1,
          shiftStart: 1,
          shiftEnd: 1,
          status: 1,
          cashCollected: 1,
          onlineCollected: 1,
          createdAt: 1,
          updatedAt: 1,

          worker: {
            _id: "$worker._id",
            name: "$worker.name",
            phone: "$worker.phone",
          },

          nozzles: {
            $map: {
              input: "$nozzles",
              as: "nz",
              in: {
                _id: "$$nz._id",
                nozzleNumber: "$$nz.nozzleNumber",
                fuelType: "$$nz.fuelType",
                status: "$$nz.status",
                currentReading: "$$nz.currentReading", 
              },
            },
          },
        },
      },
    ]);

   
    if (!shift || shift.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Shift not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: shift[0],
    });
  } catch (error) {
    console.error("Get Shift Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const closeShift = async (req, res) => {
  try {
    const validatedData = closeShiftMultipleReadingsSchema.parse(req.body);
    const { shiftId, readings } = validatedData;
    const userId = req.user?._id; 

   
    const shift = await ShiftModel.findOne({ _id: shiftId, status: "OPEN" });
    if (!shift) {
      return res.status(404).json({ success: false, message: "Open shift not found" });
    }

    
    const worker = await WorkerModel.findById(shift.workerId);
    if (!worker) {
      return res.status(404).json({ success: false, message: "Worker not found for this shift" });
    }

 
    if (worker.workerType === "NOZZLE_BOY" && readings && readings.length > 0) {
      const meterReadingPromises = readings.map(async (r) => {
        let meterReading = r.readingId
          ? await MeterReadingModel.findById(r.readingId)
          : null;

        if (!meterReading) {
         
          const lastReading = await MeterReadingModel.findOne({
            shiftId: shift._id,
            nozzleId: r.nozzleId
          }).sort({ createdAt: -1 });

          const openingReading = lastReading?.closingReading || 0;

          meterReading = new MeterReadingModel({
            shiftId: shift._id,
            nozzleId: r.nozzleId,
            openingReading,
            closingReading: r.closingReading,
            totalLitres: r.closingReading - openingReading,
            userId
          });
        } else {
          meterReading.closingReading = r.closingReading;
          meterReading.totalLitres = r.closingReading - meterReading.openingReading;
        }

        return meterReading.save();
      });

      await Promise.all(meterReadingPromises);
    }

   
    shift.status = "CLOSED";
    shift.shiftEnd = new Date();
    await shift.save();

    return res.status(200).json({
      success: true,
      message: "Shift closed successfully",
      data: shift
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error("Close Shift Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


module.exports = { createShift, getAllShifts, getShiftById, closeShift };