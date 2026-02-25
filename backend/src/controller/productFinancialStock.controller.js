const mongoose = require("mongoose");
const ProductFinancialStock = require("../model/productFinancialStock.model");
const CurrentStockModel = require("../model/currentStock.model");
const { createProductFinancialStockSchema, updateProductFinancialStockSchema } = require("../schema/productFinancialStock");

const createProductFinancialStock = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const parsed = createProductFinancialStockSchema.parse(req.body);
        const userId = req.user._id;
        const { productId, financialYearId, openingStock = 0 } = parsed;
        if (openingStock < 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: "Opening stock cannot be negative"
            });
        }
        const existing = await ProductFinancialStock.findOne({
            userId,
            productId,
            financialYearId
        }).session(session);
        if (existing) {
            await session.abortTransaction();
            session.endSession();

            return res.status(400).json({
                success: false,
                message: "Stock already exists for this product and financial year"
            });
        }
        const stock = await ProductFinancialStock.create(
            [{
                userId,
                productId,
                financialYearId,
                openingStock,
                totalPurchase: 0,
                totalSale: 0,
                closingStock: openingStock
            }],
            { session }
        );
        await CurrentStockModel.updateOne(
            { userId, productId },
            { $set: { quantity: openingStock } },
            { upsert: true, session }
        );

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({
            success: true,
            message: "Opening stock created successfully",
            data: stock[0]
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Stock already exists for this product and financial year"
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getAllProductFinancialStock = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user._id);

        const DEFAULT_PAGE_SIZE = Number(process.env.DEFAULT_PAGE_SIZE) || 10;
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.max(1, Number(req.query.limit) || DEFAULT_PAGE_SIZE);
        const search = req.query.search || "";
        const skip = (page - 1) * limit;
        const pipeline = [
            {
                $match: {
                    userId: userId
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
            {
                $unwind: {
                    path: "$product",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "financialyears",
                    localField: "financialYearId",
                    foreignField: "_id",
                    as: "financialYear"
                }
            },
            {
                $unwind: {
                    path: "$financialYear",
                    preserveNullAndEmptyArrays: true
                }
            }
        ];

        if (search) {
            pipeline.push({
                $match: {
                    "product.name": { $regex: search, $options: "i" }
                }
            });
        }

        const countPipeline = [...pipeline, { $count: "total" }];
        const totalResult = await ProductFinancialStock.aggregate(countPipeline);
        const total = totalResult[0]?.total || 0;

        pipeline.push(
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit }
        );

        const stocks = await ProductFinancialStock.aggregate(pipeline);

        return res.json({
            success: true,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            },
            data: stocks
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getSingleProductFinancialStock = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user._id);
        const stockId = new mongoose.Types.ObjectId(req.params.stockId);
        const stock = await ProductFinancialStock.aggregate([
            {
                $match: {
                    _id: stockId,
                    userId: userId
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "productId",
                    foreignField: "_id",
                    as: "productId"
                }
            },
            {
                $lookup: {
                    from: "financialyears",
                    localField: "financialYearId",
                    foreignField: "_id",
                    as: "financialYearId"
                }
            },
            {
                $unwind: {
                    path: "$productId",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $unwind: {
                    path: "$financialYearId",
                    preserveNullAndEmptyArrays: true
                }
            }
        ]);

        if (!stock.length) {
            return res.status(404).json({
                success: false,
                message: "Stock not found"
            });
        }

        res.json({
            success: true,
            data: stock[0]
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const updateProductFinancialStock = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const parsed = updateProductFinancialStockSchema.parse(req.body);

        const userId = req.user._id;
        const { id } = req.params;

        const existing = await ProductFinancialStock.findOne({
            _id: id,
            userId
        }).session(session);

        if (!existing) {
            await session.abortTransaction();
            session.endSession();

            return res.status(404).json({
                success: false,
                message: "Stock not found"
            });
        }

        const oldClosingStock = existing.closingStock;

        const openingStock =
            parsed.openingStock !== undefined
                ? parsed.openingStock
                : existing.openingStock;

        if (openingStock < 0) {
            await session.abortTransaction();
            session.endSession();

            return res.status(400).json({
                success: false,
                message: "Opening stock cannot be negative"
            });
        }

        const newClosingStock =
            openingStock +
            existing.totalPurchase -
            existing.totalSale;

        if (newClosingStock < 0) {
            await session.abortTransaction();
            session.endSession();

            return res.status(400).json({
                success: false,
                message: "Closing stock cannot be negative"
            });
        }

        existing.openingStock = openingStock;
        existing.closingStock = newClosingStock;

        await existing.save({ session });

        await CurrentStockModel.updateOne(
            { userId, productId: existing.productId },
            { $set: { quantity: newClosingStock } },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        return res.json({
            success: true,
            message: "Opening stock updated and current stock synced successfully",
            data: existing
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const deleteProductFinancialStock = async (req, res) => {
    try {
        const userId = req.user._id;
        const { stockId } = req.params;

        const deleted = await ProductFinancialStock.findOneAndDelete({
            _id: stockId,
            userId
        });

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Stock not found"
            });
        }

        res.json({
            success: true,
            message: "Product financial stock deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    createProductFinancialStock,
    getAllProductFinancialStock,
    getSingleProductFinancialStock,
    updateProductFinancialStock,
    deleteProductFinancialStock
};