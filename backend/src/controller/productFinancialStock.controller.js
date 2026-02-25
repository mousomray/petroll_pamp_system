const mongoose = require("mongoose");
const ProductFinancialStock = require("../model/productFinancialStock.model");
const { createProductFinancialStockSchema, updateProductFinancialStockSchema } = require("../schema/productFinancialStock");

const createProductFinancialStock = async (req, res) => {
    try {
        const parsed = createProductFinancialStockSchema.parse(req.body);
        const userId = req.user._id;

        const { productId, financialYearId, openingStock = 0 } = parsed;

        const existing = await ProductFinancialStock.findOne({
            userId,
            productId,
            financialYearId
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Stock already exists for this product and financial year"
            });
        }

        if (openingStock < 0) {
            return res.status(400).json({
                success: false,
                message: "Opening stock cannot be negative"
            });
        }

        const totalPurchase = 0;
        const totalSale = 0;

        const closingStock = openingStock;

        const stock = await ProductFinancialStock.create({
            userId,
            productId,
            financialYearId,
            openingStock,
            totalPurchase,
            totalSale,
            closingStock
        });

        return res.status(201).json({
            success: true,
            message: "Opening stock created successfully",
            data: stock
        });

    } catch (error) {

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
    try {
        const parsed = updateProductFinancialStockSchema.parse(req.body);

        const userId = req.user._id;
        const { id } = req.params;

        const existing = await ProductFinancialStock.findOne({
            _id: id,
            userId
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Stock not found"
            });
        }

        const openingStock =
            parsed.openingStock !== undefined
                ? parsed.openingStock
                : existing.openingStock;

        if (openingStock < 0) {
            return res.status(400).json({
                success: false,
                message: "Opening stock cannot be negative"
            });
        }

        const closingStock =
            openingStock +
            existing.totalPurchase -
            existing.totalSale;

        if (closingStock < 0) {
            return res.status(400).json({
                success: false,
                message: "Closing stock cannot be negative"
            });
        }

        existing.openingStock = openingStock;
        existing.closingStock = closingStock;

        await existing.save();

        return res.json({
            success: true,
            message: "Opening stock updated successfully",
            data: existing
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const deleteProductFinancialStock = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const deleted = await ProductFinancialStock.findOneAndDelete({
            _id: id,
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