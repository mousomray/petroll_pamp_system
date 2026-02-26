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
        session.startTransaction();

        const parsed = req.body;
        const userId = req.user._id;

        const {
            supplierId,
            financialYearId,
            invoiceNo,
            purchaseDate,
            paymentStatus,
            paymentMethod,
            paidAmount,
            items
        } = parsed;

        let subTotal = 0;
        let totalCgst = 0;
        let totalSgst = 0;
        let totalIgst = 0;
        let grandTotal = 0;

        const purchaseItemsData = [];

        // =====================================================
        // 🔁 PROCESS EACH ITEM
        // =====================================================
        for (const item of items) {

            const product = await Product.findOne({
                _id: item.productId,
                userId
            }).session(session);

            if (!product) throw new Error("Product not found");

            const costPrice = product.costPrice;

            const baseAmount = item.quantity * costPrice;

            const discountAmount =
                (baseAmount * (item.discount || 0)) / 100;

            const afterDiscount = baseAmount - discountAmount;

            // ================= GST Calculation =================
            const cgstAmount =
                (afterDiscount * (item.cgstPercent || 0)) / 100;

            const sgstAmount =
                (afterDiscount * (item.sgstPercent || 0)) / 100;

            const igstAmount =
                (afterDiscount * (item.igstPercent || 0)) / 100;

            // ❌ Prevent wrong GST combination
            if (
                (item.cgstPercent > 0 || item.sgstPercent > 0) &&
                item.igstPercent > 0
            ) {
                throw new Error(
                    "Use either CGST/SGST or IGST, not both"
                );
            }

            const totalTax = cgstAmount + sgstAmount + igstAmount;

            const itemTotal = afterDiscount + totalTax;

            // ================= MASTER TOTAL UPDATE =================
            subTotal += baseAmount;
            totalCgst += cgstAmount;
            totalSgst += sgstAmount;
            totalIgst += igstAmount;
            grandTotal += itemTotal;

            purchaseItemsData.push({
                productId: item.productId,
                quantity: item.quantity,
                costPrice,
                discount: item.discount || 0,

                cgstPercent: item.cgstPercent || 0,
                sgstPercent: item.sgstPercent || 0,
                igstPercent: item.igstPercent || 0,

                cgstAmount,
                sgstAmount,
                igstAmount,

                taxAmount: totalTax,
                total: itemTotal,

                tankId: item.tankId || null
            });
        }

        // =====================================================
        // 💰 PAYMENT VALIDATION
        // =====================================================
        if (paidAmount > grandTotal) {
            throw new Error("Paid amount cannot exceed total amount");
        }

        const dueAmount = grandTotal - paidAmount;

        if (paymentStatus === "PAID" && dueAmount !== 0) {
            throw new Error("For PAID status, due must be 0");
        }

        if (paymentStatus === "DUE" && paidAmount !== 0) {
            throw new Error("For DUE status, paidAmount must be 0");
        }

        if (
            paymentStatus === "PARTIAL" &&
            (paidAmount === 0 || paidAmount === grandTotal)
        ) {
            throw new Error(
                "For PARTIAL status, paidAmount must be between 0 and total"
            );
        }

        // =====================================================
        // 💾 CREATE PURCHASE MASTER
        // =====================================================
        const purchaseDoc = await PurchaseModel.create([{
            userId,
            supplierId,
            financialYearId,
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

        // attach purchaseId to items
        purchaseItemsData.forEach(item => {
            item.purchaseId = purchaseId;
        });

        await PurchaseItemModel.insertMany(purchaseItemsData, { session });

        // =====================================================
        // 📦 STOCK + FINANCIAL + TANK UPDATE
        // =====================================================
        for (const item of purchaseItemsData) {

            // ---------- CURRENT STOCK ----------
            let currentStock = await CurrentStock.findOne({
                userId,
                productId: item.productId
            }).session(session);

            if (!currentStock) {
                currentStock = new CurrentStock({
                    userId,
                    productId: item.productId,
                    quantity: 0,
                    amount: 0
                });
            }

            currentStock.quantity += item.quantity;
            currentStock.amount += item.quantity * item.costPrice;

            await currentStock.save({ session });

            // ---------- FINANCIAL STOCK ----------
            let financialStock = await FinancialStock.findOne({
                userId,
                productId: item.productId,
                financialYearId
            }).session(session);

            if (!financialStock) {
                financialStock = new FinancialStock({
                    userId,
                    productId: item.productId,
                    financialYearId,
                    openingStock: 0,
                    totalPurchase: item.quantity,
                    totalSale: 0,
                    closingStock: item.quantity
                });
            } else {
                financialStock.totalPurchase += item.quantity;
                financialStock.closingStock =
                    financialStock.openingStock +
                    financialStock.totalPurchase -
                    financialStock.totalSale;
            }

            await financialStock.save({ session });

            // ---------- TANK UPDATE ----------
            if (item.tankId) {

                const tank = await Tank.findOne({
                    _id: item.tankId,
                    userId,
                    isActive: true
                }).session(session);

                if (!tank) throw new Error("Tank not found");

                if (!tank.productId.equals(item.productId)) {
                    throw new Error("Tank product mismatch");
                }

                const newQuantity =
                    tank.currentQuantity + item.quantity;

                if (newQuantity > tank.capacity) {
                    throw new Error(
                        `Tank capacity exceeded. Max: ${tank.capacity}`
                    );
                }

                tank.currentQuantity = newQuantity;

                await tank.save({ session });
            }
        }

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({
            success: true,
            message: "Purchase created successfully",
            data: {
                purchaseId,
                subTotal,
                cgst: totalCgst,
                sgst: totalSgst,
                igst: totalIgst,
                totalAmount: grandTotal,
                paidAmount,
                dueAmount
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