const mongoose = require("mongoose");
const { ZodError } = require("zod");

const NozzleModel = require("../model/nozzel.model.js")
const TankModel = require("../model/tank.model.js")
const UserModel = require("../model/user.model.js")

const { createNozzleSchema, updateNozzleSchema } = require("../schema/nozzle.schema.js")

const createNozzle = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await UserModel.findById(userId);
    if (!user || user.role !== "ADMIN") {
      return res.status(403).json({ message: "Unauthorized user role" });
    }

    const parsedData = createNozzleSchema.parse(req.body);

    const validTank = await TankModel.findOne({
      _id: parsedData.tank,
      userId,
    });

    if (!validTank) {
      return res.status(400).json({
        message: "Tank not found or not authorized",
      });
    }

    const existing = await NozzleModel.findOne({
      nozzleNumber: parsedData.nozzleNumber,
      userId,
    });

    if (existing) {
      return res.status(400).json({
        message: "Nozzle number already exists",
      });
    }

    const nozzle = await NozzleModel.create({
      nozzleNumber: parsedData.nozzleNumber,
      tank: parsedData.tank,
      machineName: parsedData.machineName || null,
      initialReading: parsedData.initialReading,
      currentReading: parsedData.initialReading,
      userId,
    });

    return res.status(201).json({
      message: "Nozzle created successfully",
      data: nozzle,
    });

  } catch (error) {

    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        message: "Nozzle number already exists",
      });
    }

    console.error("Create Nozzle Error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const getAllNozzles = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit =
      parseInt(req.query.limit) ||
      parseInt(process.env.DEFAULT_PAGE_SIZE) ||
      10;

    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    const filter = { userId };


    if (search) {
      filter.$or = [
        { nozzleNumber: { $regex: search, $options: "i" } },
        { machineName: { $regex: search, $options: "i" } },
      ];
    }

    const totalRecords = await NozzleModel.countDocuments(filter);
    const totalPages = Math.ceil(totalRecords / limit);

    const nozzles = await NozzleModel.find(filter)
      .populate("tank")
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      page,
      totalPages,
      totalRecords,
      nozzles,
    });

  } catch (error) {
    console.error("Get All Nozzles Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getSingleNozzle = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid nozzle id" });
    }

    const nozzle = await NozzleModel.findOne({
      _id: id,
      userId,
    })
      .populate("tank")
      .populate("userId", "name email");

    if (!nozzle) {
      return res.status(404).json({ message: "Nozzle not found" });
    }

    return res.status(200).json({
      success: true,
      data: nozzle,
    });

  } catch (error) {
    console.error("Get Single Nozzle Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const updateNozzle = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid nozzle id" });
    }

    const nozzle = await NozzleModel.findOne({
      _id: id,
      userId,
    });

    if (!nozzle) {
      return res.status(404).json({ message: "Nozzle not found" });
    }

    const parsedData = updateNozzleSchema.parse(req.body);

    if (parsedData.nozzleNumber) {
      const existing = await NozzleModel.findOne({
        nozzleNumber: parsedData.nozzleNumber,
        userId,
        _id: { $ne: id },
      });

      if (existing) {
        return res.status(400).json({
          message: "Nozzle number already exists",
        });
      }

      nozzle.nozzleNumber = parsedData.nozzleNumber;
    }

    if (parsedData.machineName !== undefined) {
      nozzle.machineName = parsedData.machineName;
    }

    if (parsedData.status) {
      nozzle.status = parsedData.status;
    }

    if (parsedData.tank) {
      const validTank = await TankModel.findOne({
        _id: parsedData.tank,
        userId,
      });

      if (!validTank) {
        return res.status(400).json({
          message: "Tank not found or not authorized",
        });
      }

      nozzle.tank = parsedData.tank;
    }
    await nozzle.save();
    return res.status(200).json({
      success: true,
      message: "Nozzle updated successfully",
      data: nozzle,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Nozzle number already exists",
      });
    }
    console.error("Update Nozzle Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


const deleteNozzle = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid nozzle id" });
    }

    const nozzle = await NozzleModel.findOne({
      _id: id,
      userId,
    });

    if (!nozzle) {
      return res.status(404).json({ message: "Nozzle not found" });
    }

    await nozzle.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Nozzle deleted successfully",
    });

  } catch (error) {
    console.error("Delete Nozzle Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const dropDownNozzles = async (req, res) => {
  try {
    const userId = req.user?.id;
    const nozzles = await NozzleModel.find({ userId, status: "ACTIVE" })
    return res.status(200).json({
      success: true,
      data: nozzles,
    });
  } catch (error) {
    console.error("Dropdown Nozzles Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = { createNozzle, updateNozzle, getAllNozzles, getSingleNozzle, deleteNozzle, dropDownNozzles }