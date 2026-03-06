const mongoose = require("mongoose");
const Tank = require("../model/tank.model.js");
const Product = require("../model/product.model.js");
const UserModel = require("../model/user.model.js")
const { createTankSchema, updateTankSchema } = require("../schema/tank.schema.js");

const DEFAULT_PAGE_SIZE = parseInt(process.env.DEFAULT_PAGE_SIZE) || 10;


const addTank = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const parsedData = createTankSchema.parse(req.body);
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }
        const user = await UserModel.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }


        const tank = await Tank.create({
            userId: user._id,
            tankName: parsedData.tankName,
            capacity: parsedData.capacity
        });

        return res.status(200).json({
            success: true,
            message: "Tank created successfully",
            data: tank
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


const listTank = async (req, res) => {
    try {
        const userId = req.user._id;

        let { page = 1, limit, search } = req.query;

        page = parseInt(page);
        limit = parseInt(limit) || DEFAULT_PAGE_SIZE;

        const matchStage = {
            userId: new mongoose.Types.ObjectId(userId),
        };

        if (search) {
            matchStage.tankName = { $regex: search, $options: "i" };
        }


        const pipeline = [
            { $match: matchStage },

            { $sort: { createdAt: -1 } },

            {
                $facet: {
                    data: [
                        { $skip: (page - 1) * limit },
                        { $limit: limit },
                    ],
                    totalCount: [{ $count: "count" }],
                },
            },
        ];

        const result = await Tank.aggregate(pipeline);

        const tanks = result[0].data;
        const total = result[0].totalCount[0]?.count || 0;

        return res.json({
            success: true,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            tanks: tanks,
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};


const getSingleTank = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const tank = await Tank.findOne({
            _id: id,
            userId,
            isActive: true,
        });

        if (!tank) {
            return res.status(404).json({
                success: false,
                message: "Tank not found",
            });
        }

        return res.json({
            success: true,
            data: tank,
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const updateTank = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const parsedData = updateTankSchema.parse(req.body);

        const tank = await Tank.findOne({
            _id: id,
            userId,
            isActive: true,
        });

        if (!tank) {
            return res.status(404).json({
                success: false,
                message: "Tank not found",
            });
        }

        if (parsedData.tankName !== undefined)
            tank.tankName = parsedData.tankName;

        if (parsedData.capacity !== undefined) {
            if (tank.currentQuantity > parsedData.capacity) {
                return res.status(400).json({
                    success: false,
                    message: "Capacity cannot be less than current quantity",
                });
            }
            tank.capacity = parsedData.capacity;
        }

        if (parsedData.isActive !== undefined)
            tank.isActive = parsedData.isActive;

        await tank.save();

        return res.json({
            success: true,
            message: "Tank updated successfully",
            data: tank,
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const activeStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        if (!id) {
            return res.status(500).json({ message: "id is not found" });
        }
        const updateProduct = await Tank.findByIdAndUpdate(id, {
            isActive: isActive
        })
        return res.json({
            success: true,
            message: "Status is updated"
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}


const deleteTank = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const tank = await Tank.findOne({
            _id: id,
            userId,
            isActive: true
        });

        if (!tank) {
            return res.status(404).json({
                success: false,
                message: "Tank not found"
            });
        }

        tank.isActive = false;
        await tank.save();

        return res.json({
            success: true,
            message: "Tank deleted successfully"
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const allTanks = async (req, res) => {
    try {
        const userId = req.user.id;
        const tanks = await Tank.find({ userId: userId, isActive: true });
        return res.json({
            success: true,
            data: tanks
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
}

const emptyDropdownTanks = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const tanks = await Tank.find({
            userId: userId,
            isActive: true,
            currentQuantity: 0   // ✅ Only empty tanks
        });

        return res.json({
            success: true,
            data: tanks
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


const getTanksByProduct = async (req, res) => {
    try {

        const userId = req.user._id;
        const { productId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid productId"
            });
        }

        const product = await Product.findOne({
            _id: productId,
            userId
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        if (!product.tankIds || product.tankIds.length === 0) {
            return res.json({
                success: true,
                total: 0,
                data: []
            });
        }

        const tanks = await Tank.find({
            _id: { $in: product.tankIds },
            userId,
            isActive: true
        })
        .select("tankName capacity currentQuantity createdAt")
        .sort({ createdAt: -1 });


        // ✅ Add available capacity
        const formattedTanks = tanks.map(tank => ({
            _id: tank._id,
            tankName: tank.tankName,
            capacity: tank.capacity,
            currentQuantity: tank.currentQuantity,
            availableCapacity: tank.capacity - tank.currentQuantity,
            createdAt: tank.createdAt
        }));


        return res.json({
            success: true,
            total: formattedTanks.length,
            data: formattedTanks
        });

    } catch (error) {

        console.error("Error in getTanksByProduct:", error);

        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    addTank,
    listTank,
    getSingleTank,
    updateTank,
    deleteTank,
    allTanks,
    getTanksByProduct,
    activeStatus,
    emptyDropdownTanks
}