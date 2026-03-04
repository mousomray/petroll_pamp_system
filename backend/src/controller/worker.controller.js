const mongoose = require("mongoose")
const workerModel = require("../model/worker.model")
const UserModel = require("../model/user.model")
const { createWorkerSchema, updateWorkerSchema } = require("../schema/worker.schema")

const addWorker = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }
        const parsedData = createWorkerSchema.parse(req.body);
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        const existingWorker = await workerModel.findOne({
            email: parsedData.email
        });
        if (existingWorker) {
            return res.status(400).json({
                success: false,
                message: "Worker with this email already exists"
            });
        }
        const worker = await workerModel.create({
            ...parsedData,
            createdBy: user._id
        });
        return res.status(200).json({
            success: true,
            message: "Worker created successfully",
            data: worker
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const updateWorker = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const parsedData = updateWorkerSchema.parse(req.body);

        const worker = await workerModel.findOneAndUpdate(
            {
                _id: req.params.id,
                createdBy: userId
            },
            parsedData,
            { new: true, runValidators: true }
        );

        if (!worker) {
            return res.status(404).json({
                success: false,
                message: "Worker not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Worker updated successfully",
            data: worker
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


const getWorkers = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const {
            page = 1,
            limit = process.env.DEFAULT_PAGE_SIZE ,
            search = "",
            role,
            status
        } = req.query;

        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        const skip = (pageNumber - 1) * pageSize;

        let filter = {
            createdBy: userId
        };

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } }
            ];
        }

        // Role filter
        if (role) {
            filter.role = role;
        }

        // Status filter
        if (status) {
            filter.status = status;
        }

        // ==============================
        // Get Data
        // ==============================
        const total = await workerModel.countDocuments(filter);

        const workers = await workerModel
            .find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageSize);

        return res.status(200).json({
            success: true,
            data: workers,
            meta: {
                total,
                page: pageNumber,
                limit: pageSize,
                totalPages: Math.ceil(total / pageSize)
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


const getWorkerById = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const worker = await workerModel.findOne({
            _id: req.params.id,
            createdBy: userId
        });

        if (!worker) {
            return res.status(404).json({
                success: false,
                message: "Worker not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: worker
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const deleteWorker = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const { id } = req.params;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid worker ID"
            });
        }

        const worker = await workerModel.findOneAndDelete({
            _id: id,
            createdBy: userId
        });

        if (!worker) {
            return res.status(404).json({
                success: false,
                message: "Worker not found or already deleted"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Worker permanently deleted successfully"
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = { addWorker, updateWorker, getWorkerById, getWorkers, deleteWorker }