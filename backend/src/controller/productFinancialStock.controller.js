const mongoose = require("mongoose");
const ProductFinancialStock = require("../model/productFinancialStock.model");
const CurrentStockModel = require("../model/currentStock.model");
const { createProductFinancialStockSchema, updateProductFinancialStockSchema } = require("../schema/productFinancialStock");
const Product = require("../model/product.model");

function getFinancialYear() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    return month >= 4
        ? `${year}-${year + 1}`
        : `${year - 1}-${year}`;
}

const createProductFinancialStock = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user._id;
        const { products } = req.body;
        // products = [{ productId, openingStock }]

        if (!products || !Array.isArray(products) || products.length === 0) {
            throw new Error("Products array is required");
        }

        const financialYear = getFinancialYear();

        // Check if financial year stock already created for this user
        const existingFY = await ProductFinancialStock.findOne({
            userId,
            financialYear
        }).session(session);

        if (existingFY) {
            throw new Error("Opening stock already created for this financial year");
        }

        const stockProducts = [];

        for (const item of products) {

            if (item.openingStock < 0) {
                throw new Error("Opening stock cannot be negative");
            }

            const product = await Product.findById(item.productId).session(session);
            if (!product) {
                throw new Error("Product not found");
            }

            stockProducts.push({
                productId: item.productId,
                openingStock: item.openingStock,
                totalPurchase: 0,
                totalSale: 0,
                closingStock: item.openingStock
            });

            // Update Current Stock table
            await CurrentStockModel.updateOne(
                { userId, productId: item.productId },
                { $set: { quantity: item.openingStock } },
                { upsert: true, session }
            );
        }

        const stock = await ProductFinancialStock.create(
            [{
                userId,
                financialYear,
                products: stockProducts
            }],
            { session }
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

        return res.status(400).json({
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
        const financialYear = req.query.financialYear || "";
        const skip = (page - 1) * limit;

        const pipeline = [
            {
                $match: { userId }
            },

            ...(financialYear
                ? [{ $match: { financialYear } }]
                : []),

            {
                $unwind: "$products"
            },

            {
                $lookup: {
                    from: "products",
                    localField: "products.productId",
                    foreignField: "_id",
                    as: "product"
                }
            },
            {
                $unwind: {
                    path: "$product",
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
            {
                $project: {
                    _id: 0,
                    financialYear: 1,
                    productId: "$products.productId",
                    productName: "$product.name",
                    unit: "$product.unit",
                    openingStock: "$products.openingStock",
                    totalPurchase: "$products.totalPurchase",
                    totalSale: "$products.totalSale",
                    closingStock: "$products.closingStock",
                    createdAt: 1
                }
            },
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

const getAllCurrentStock = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user._id);
        const DEFAULT_PAGE_SIZE = Number(process.env.DEFAULT_PAGE_SIZE) || 10;
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.max(1, Number(req.query.limit) || DEFAULT_PAGE_SIZE);
        const search = req.query.search || "";
        const skip = (page - 1) * limit;
        const pipeline = [
            {
                $match: { userId }
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
        const totalResult = await CurrentStockModel.aggregate(countPipeline);
        const total = totalResult[0]?.total || 0;

        pipeline.push(
            {
                $project: {
                    _id: 0,
                    productId: 1,
                    quantity: 1,
                    productName: "$product.name",
                    unit: "$product.unit",
                    type: "$product.type",
                    costPrice: "$product.costPrice",
                    sellingPrice: "$product.sellingPrice",
                    createdAt: 1
                }
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit }
        );

        const stocks = await CurrentStockModel.aggregate(pipeline);

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

const carryForwardFinancialYear = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user._id;

        const currentFY = getFinancialYear();
        const [startYear, endYear] = currentFY.split("-").map(Number);
        const nextFY = `${endYear}-${endYear + 1}`;

        const currentStockDoc = await ProductFinancialStock.findOne({
            userId,
            financialYear: currentFY
        }).session(session);

        if (!currentStockDoc) {
            throw new Error("Current financial year stock not found");
        }

        const existingNextFY = await ProductFinancialStock.findOne({
            userId,
            financialYear: nextFY
        }).session(session);

        if (existingNextFY) {
            throw new Error("Next financial year already created");
        }

        const newProducts = currentStockDoc.products.map(item => ({
            productId: item.productId,
            openingStock: item.closingStock,
            totalPurchase: 0,
            totalSale: 0,
            closingStock: item.closingStock
        }));
        const newFinancialYearDoc = await ProductFinancialStock.create(
            [{
                userId,
                financialYear: nextFY,
                products: newProducts
            }],
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({
            success: true,
            message: `Financial year closed successfully. ${nextFY} created.`,
            data: newFinancialYearDoc[0]
        });

    } catch (error) {
        console.log("Error in carryForwardFinancialYear:", error);
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
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
    deleteProductFinancialStock,
    getAllCurrentStock,
    carryForwardFinancialYear
};