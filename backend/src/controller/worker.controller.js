const workerModel = require("../model/worker.model")
const UserModel = require("../model/user.model")






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

        const existingWorker = await Worker.findOne({
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

        const worker = await WorkerModel.findOneAndUpdate(
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

        const workers = await workerModel.find({
            createdBy: userId,
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: workers
        });

    } catch (error) {
        return res.status(400).json({
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

        const worker = await workerModel.findOneAndUpdate(
            {
                _id: req.params.id,
                createdBy: userId
            },
            { isActive: false },
            { new: true }
        );

        if (!worker) {
            return res.status(404).json({
                success: false,
                message: "Worker not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Worker deleted successfully"
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {addWorker,updateWorker,getWorkerById,getWorkers,deleteWorker}