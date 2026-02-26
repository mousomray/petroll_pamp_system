const mongoose = require("mongoose");
const { PurchaseModel, PurchaseItemModel } = require("../model/purchase.model");
const Product = require("../model/product.model");
const Tank = require("../model/tank.model");
const CurrentStock = require("../model/currentStock.model");
const FinancialStock = require("../model/productFinancialStock.model");
const { createPurchaseSchema } = require("../schema/purchase.schema");

const createPurchase = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        await session.startTransaction();

        const userId = req.user._id;
        const {
            supplierId,
            purchaseDate,
            paymentMethod,
            items
        } = req.body;

        if (!items || items.length === 0) {
            throw new Error("Purchase items required");
        }

        // ===============================
        // 🔢 AUTO INVOICE GENERATION
        // ===============================
        const lastPurchase = await PurchaseModel.findOne({ userId })
            .sort({ createdAt: -1 })
            .session(session);

        let invoiceNo = "INV-1";

        if (lastPurchase) {
            const lastNumber = parseInt(lastPurchase.invoiceNo.split("-")[1]);
            invoiceNo = `INV-${lastNumber + 1}`;
        }

        let subTotal = 0;
        let totalCgst = 0;
        let totalSgst = 0;
        let totalIgst = 0;
        let grandTotal = 0;

        const purchaseItemsData = [];

        // =====================================================
        // 🔁 PROCESS ITEMS
        // =====================================================
        for (const item of items) {

            const product = await Product.findOne({
                _id: item.productId,
                userId
            }).session(session);

            if (!product) throw new Error("Product not found");

            const costPrice = product.costPrice;

            const baseAmount = item.quantity * costPrice;

            const cgstPercent = product.cgstPercent || 0;
            const sgstPercent = product.sgstPercent || 0;
            const igstPercent = product.igstPercent || 0;

            if ((cgstPercent > 0 || sgstPercent > 0) && igstPercent > 0) {
                throw new Error("Invalid GST setup in product");
            }

            const cgstAmount = (baseAmount * cgstPercent) / 100;
            const sgstAmount = (baseAmount * sgstPercent) / 100;
            const igstAmount = (baseAmount * igstPercent) / 100;

            const totalTax = cgstAmount + sgstAmount + igstAmount;
            const itemTotal = baseAmount + totalTax;

            subTotal += baseAmount;
            totalCgst += cgstAmount;
            totalSgst += sgstAmount;
            totalIgst += igstAmount;
            grandTotal += itemTotal;

            purchaseItemsData.push({
                productId: product._id,
                quantity: item.quantity,
                costPrice,
                cgstPercent,
                sgstPercent,
                igstPercent,
                cgstAmount,
                sgstAmount,
                igstAmount,
                taxAmount: totalTax,
                total: itemTotal,
                tankId: item.tankId || null
            });
        }

        // ===============================
        // 💰 FULL PAYMENT SYSTEM
        // ===============================
        const paidAmount = grandTotal;
        const dueAmount = 0;
        const paymentStatus = "PAID";

        // ===============================
        // 💾 CREATE PURCHASE MASTER
        // ===============================
        const purchaseDoc = await PurchaseModel.create([{
            userId,
            supplierId,
            invoiceNo,
            purchaseDate,
            paymentStatus,
            paymentMethod,
            paidAmount,
            dueAmount,
            subTotal,
            cgstAmount: totalCgst,
            sgstAmount: totalSgst,
            igstAmount: totalIgst,
            taxAmount: totalCgst + totalSgst + totalIgst,
            totalAmount: grandTotal,
            createdBy: userId
        }], { session });

        const purchaseId = purchaseDoc[0]._id;

        purchaseItemsData.forEach(item => {
            item.purchaseId = purchaseId;
        });

        await PurchaseItemModel.insertMany(purchaseItemsData, { session });

        // =====================================================
        // 📦 STOCK UPDATE
        // =====================================================
        for (const item of purchaseItemsData) {

            // ===== CURRENT STOCK
            await CurrentStock.updateOne(
                { userId, productId: item.productId },
                { $inc: { quantity: item.quantity } },
                { upsert: true, session }
            );

            // ===== TANK UPDATE
            if (item.tankId) {

                const tank = await Tank.findOne({
                    _id: item.tankId,
                    userId,
                    isActive: true
                }).session(session);

                if (!tank) throw new Error("Tank not found");

                if (!tank.productId.equals(item.productId))
                    throw new Error("Tank product mismatch");

                if (tank.currentQuantity + item.quantity > tank.capacity)
                    throw new Error("Tank capacity exceeded");

                tank.currentQuantity += item.quantity;
                await tank.save({ session });
            }
        }

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({
            success: true,
            message: "Purchase created successfully",
            data: {
                invoiceNo,
                purchaseId,
                totalAmount: grandTotal
            }
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

const listPurchases = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user._id);

        const page = parseInt(req.query.page) || 1;
        const limit =
            parseInt(req.query.limit) ||
            parseInt(process.env.DEFAULT_PAGE_SIZE) ||
            10;

        const search = req.query.search ? req.query.search.trim() : "";
        const skip = (page - 1) * limit;

        const matchStage = { userId };

        const pipeline = [
            { $match: matchStage },

            // ===============================
            // ✅ Supplier Lookup
            // ===============================
            {
                $lookup: {
                    from: "suppliers",
                    localField: "supplierId",
                    foreignField: "_id",
                    as: "supplier"
                }
            },
            { $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true } },

            // ===============================
            // ✅ Items Lookup with Nested Product + Tank
            // ===============================
            {
                $lookup: {
                    from: "purchaseitems",
                    let: { purchaseId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$purchaseId", "$$purchaseId"] }
                            }
                        },

                        // Product Join
                        {
                            $lookup: {
                                from: "products",
                                localField: "productId",
                                foreignField: "_id",
                                as: "product"
                            }
                        },
                        { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },

                        // Tank Join (Only if tankId exists)
                        {
                            $lookup: {
                                from: "tanks",
                                localField: "tankId",
                                foreignField: "_id",
                                as: "tank"
                            }
                        },
                        { $unwind: { path: "$tank", preserveNullAndEmptyArrays: true } }

                    ],
                    as: "items"
                }
            },

            // ===============================
            // ✅ Add Total Items Count
            // ===============================
            {
                $addFields: {
                    totalItems: { $size: "$items" }
                }
            }
        ];

        // ===============================
        // ✅ Search Filter
        // ===============================
        if (search) {
            pipeline.push({
                $match: {
                    $or: [
                        { invoiceNo: { $regex: search, $options: "i" } },
                        { "supplier.name": { $regex: search, $options: "i" } }
                    ]
                }
            });
        }

        pipeline.push({
            $facet: {
                data: [
                    { $sort: { createdAt: -1 } },
                    { $skip: skip },
                    { $limit: limit }
                ],
                totalCount: [{ $count: "count" }]
            }
        });

        const result = await PurchaseModel.aggregate(pipeline);

        const purchases = result[0].data;
        const totalCount = result[0].totalCount[0]?.count || 0;

        return res.status(200).json({
            success: true,
            message: "Purchase list fetched successfully",
            data: purchases,
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit)
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    createPurchase,
    listPurchases
};