const mongoose = require("mongoose");
const ShiftModel = require("../model/shiftModel")
const WorkerModel = require("../model/worker.model");
const NozzleModel = require("../model/nozzel.model");
const { closeShiftSchema } = require("../schema/closeShiftSchema");


const DEFAULT_PAGE_SIZE = parseInt(process.env.DEFAULT_PAGE_SIZE) || 10;

const createShift = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { workerId, nozzleIds } = req.body;

    if (!workerId) {
      return res.status(400).json({
        success: false,
        message: "Worker ID is required"
      });
    }

    // 🔴 Validate nozzleIds
    if (!nozzleIds || !Array.isArray(nozzleIds) || nozzleIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one nozzleId is required"
      });
    }

    // 🔎 Check Worker exists
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

    // 🔎 Check Worker already has OPEN shift
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

    // 🔎 Validate Nozzles exist & belong to user
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

    // 🚀 Create Shift
    const shift = await ShiftModel.create({
      workerId,
      nozzleIds,
      userId,
      status: "OPEN",
      shiftStart: new Date()
    });

    return res.status(200).json({
      success: true,
      message: "Shift started successfully",
      data: shift
    });

  } catch (error) {
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

      // ✅ Match by user
      { $match: matchStage },

      // ✅ Join Worker Collection
      {
        $lookup: {
          from: "workers", // collection name in MongoDB
          localField: "workerId",
          foreignField: "_id",
          as: "worker"
        }
      },

      // ✅ Convert worker array → object
      {
        $unwind: {
          path: "$worker",
          preserveNullAndEmptyArrays: true
        }
      },

      // ✅ Search by worker name OR status
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

      // ✅ Sort latest first
      { $sort: { createdAt: -1 } },

      // ✅ Pagination + Total Count
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

    // 1️⃣ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shift ID",
      });
    }

    const shift = await ShiftModel.aggregate([
      // 2️⃣ Match Shift
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
        },
      },

      // 3️⃣ Lookup Worker
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

      // 4️⃣ Lookup Nozzles
      {
        $lookup: {
          from: "nozzles",
          localField: "nozzleIds",
          foreignField: "_id",
          as: "nozzles",
        },
      },

      // 5️⃣ Project Required Fields
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
                currentReading: "$$nz.currentReading", // 🔥 Added
              },
            },
          },
        },
      },
    ]);

    // 6️⃣ If Not Found
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

    const validatedData = closeShiftSchema.parse(req.body);
    const { shiftId, cashCollected, onlineCollected } = validatedData;


    const shift = await ShiftModel.findOne({ _id: shiftId, status: "OPEN" });
    if (!shift) {
      return res.status(404).json({ success: false, message: "Open shift not found" });
    }

    shift.status = "CLOSED";
    shift.shiftEnd = new Date();
    shift.cashCollected = cashCollected;
    shift.onlineCollected = onlineCollected;

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

    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


module.exports = { createShift, getAllShifts, getShiftById, closeShift };