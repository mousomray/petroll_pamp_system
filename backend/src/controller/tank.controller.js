const mongoose = require("mongoose");
const Tank = require("../model/tank.model.js");
const Product = require("../model/product.model.js");

const DEFAULT_PAGE_SIZE = parseInt(process.env.DEFAULT_PAGE_SIZE) || 10;


const addTank = async (req, res) => {
    try {
        const userId = req.user._id;
        const { tankName, productId, capacity } = req.body;

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

        const tank = await Tank.create({
            userId,
            tankName,
            productId,
            capacity
        });

        return res.status(201).json({
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
            isActive: true
        };

        if (search) {
            matchStage.tankName = { $regex: search, $options: "i" };
        }

        const pipeline = [
            { $match: matchStage },

            {
                $lookup: {
                    from: "products",
                    localField: "productId",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },

            {
                $project: {
                    tankName: 1,
                    capacity: 1,
                    currentQuantity: 1,
                    isActive: 1,
                    createdAt: 1,
                    product: {
                        _id: "$product._id",
                        name: "$product.name"
                    }
                }
            },

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

        const result = await Tank.aggregate(pipeline);

        const tanks = result[0].data;
        const total = result[0].totalCount[0]?.count || 0;

        return res.json({
            success: true,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            data: tanks
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const getSingleTank = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const tank = await Tank.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(id),
                    userId: new mongoose.Types.ObjectId(userId),
                    isActive: true
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "productId",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" }
        ]);

        if (!tank.length) {
            return res.status(404).json({
                success: false,
                message: "Tank not found"
            });
        }

        return res.json({
            success: true,
            data: tank[0]
        });

    } catch (error) {
        console.log("Error fetching tank:", error);
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const updateTank = async (req, res) => {
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

        if (req.body.tankName !== undefined)
            tank.tankName = req.body.tankName;

        if (req.body.capacity !== undefined) {
            if (tank.currentQuantity > req.body.capacity) {
                return res.status(400).json({
                    success: false,
                    message: "Capacity cannot be less than current quantity"
                });
            }
            tank.capacity = req.body.capacity;
        }

        if (req.body.isActive !== undefined)
            tank.isActive = req.body.isActive;

        await tank.save();

        return res.json({
            success: true,
            message: "Tank updated successfully",
            data: tank
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


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

        const tanks = await Tank.find({
            userId,
            productId,
            isActive: true
        })
            .select("tankName capacity currentQuantity createdAt")
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            total: tanks.length,
            data: tanks
        });

    } catch (error) {
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
    getTanksByProduct
}