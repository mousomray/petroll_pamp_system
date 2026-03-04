const ShiftModel = require("../model/shiftModel")
const WorkerModel = require("../model/worker.model");


const DEFAULT_PAGE_SIZE = parseInt(process.env.DEFAULT_PAGE_SIZE) || 10;
const createShift = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { workerId } = req.body;

    if (!workerId) {
      return res.status(400).json({
        success: false,
        message: "Worker ID is required"
      });
    }

    
    const worker = await WorkerModel.findById(workerId);

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found"
      });
    }

    
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

    
    const shift = await ShiftModel.create({
      workerId,
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

    const shift = await ShiftModel.findById(id)
      .populate("workerId");

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Shift not found"
      });
    }

    res.status(200).json({
      success: true,
      data: shift
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = { createShift ,getAllShifts,getShiftById};