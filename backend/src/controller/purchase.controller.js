const mongoose = require("mongoose");
const { PurchaseModel, PurchaseItemModel } = require("../model/purchase.model");
const Product = require("../model/product.model");
const Tank = require("../model/tank.model");
const CurrentStock = require("../model/currentStock.model");
const FinancialStock = require("../model/productFinancialStock.model");
const { createPurchaseSchema } = require("../schema/purchase.schema");

const getFinancialYearFromDate = (date) => {
    const d = new Date(date);

    if (isNaN(d.getTime())) {
        throw new Error("Invalid purchase date");
    }

    const year = d.getFullYear();
    const month = d.getMonth(); // 0-based (April = 3)

    return month >= 3
        ? `${year}-${year + 1}`
        : `${year - 1}-${year}`;
};

const createPurchase = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        await session.startTransaction();

        const userId = req.user._id;
        const {
            supplierId,
            purchaseDate,
            paymentMethod = "CASH",
            items
        } = req.body;

        if (!purchaseDate) {
            throw new Error("Purchase date is required");
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            throw new Error("Purchase items required");
        }

        const financialYear = getFinancialYearFromDate(purchaseDate);

        // ==============================
        // INVOICE GENERATION
        // ==============================
        const lastPurchase = await PurchaseModel.findOne({ userId })
            .sort({ createdAt: -1 })
            .session(session);

        let invoiceNo = "INV-1";
        if (lastPurchase) {
            const lastNumber = parseInt(lastPurchase.invoiceNo.split("-")[1]) || 0;
            invoiceNo = `INV-${lastNumber + 1}`;
        }

        let subTotal = 0;
        let totalCgst = 0;
        let totalSgst = 0;
        let totalIgst = 0;
        let grandTotal = 0;

        const purchaseItemsData = [];

        // ===================================
        // 🔁 PROCESS ITEMS
        // ===================================
        for (const item of items) {

            if (!item.productId || !item.quantity || item.quantity <= 0) {
                throw new Error("Invalid product or quantity");
            }

            const product = await Product.findOne({
                _id: item.productId,
                userId
            }).session(session);

            if (!product) throw new Error("Product not found");

            // 🔥 SAFE COST PRICE
            const costPrice = product.costPrice ?? product.purchasePrice ?? 0;

            if (!costPrice) {
                throw new Error(`Cost price missing for ${product.name}`);
            }

            const baseAmount = item.quantity * costPrice;

            const cgstPercent = product.cgstPercent || 0;
            const sgstPercent = product.sgstPercent || 0;
            const igstPercent = product.igstPercent || 0;

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
                costPrice: Number(costPrice),
                cgstPercent,
                sgstPercent,
                igstPercent,
                cgstAmount,
                sgstAmount,
                igstAmount,
                taxAmount: totalTax,
                total: Number(itemTotal)
            });

            // ===================================
            // 📦 UPDATE CURRENT STOCK
            // ===================================
            await CurrentStock.updateOne(
                { userId, productId: product._id },
                { $inc: { quantity: item.quantity } },
                { upsert: true, session }
            );

            // ===================================
            // 🛢 UPDATE TANK (product er moddhe tankId ache)
            // ===================================
            if (!product.tankIds) {
                throw new Error(`Tank not assigned to product ${product.name}`);
            }

            const tank = await Tank.findOne({
                _id: product.tankIds[0],
                userId,
                isActive: true
            }).session(session);

            if (!tank) throw new Error("Assigned tank not found");

            if (tank.currentQuantity + item.quantity > tank.capacity) {
                throw new Error(
                    `Tank capacity exceeded for tank ${tank.name}`
                );
            }

            tank.currentQuantity += item.quantity;
            await tank.save({ session });
        }

        // ===================================
        // 💾 CREATE PURCHASE
        // ===================================
        const purchaseDoc = await PurchaseModel.create([{
            userId,
            supplierId,
            invoiceNo,
            purchaseDate,
            paymentStatus: "PAID",
            paymentMethod,
            paidAmount: grandTotal,
            dueAmount: 0,
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

        // ===================================
        // 📊 FINANCIAL STOCK UPDATE
        // ===================================
        let financialStock = await FinancialStock.findOne({
            userId,
            financialYear
        }).session(session);

        if (!financialStock) {
            const created = await FinancialStock.create([{
                userId,
                financialYear,
                products: []
            }], { session });

            financialStock = created[0];
        }

        for (const item of purchaseItemsData) {

            let productStock = financialStock.products.find(p =>
                p.productId.toString() === item.productId.toString()
            );

            if (!productStock) {
                financialStock.products.push({
                    productId: item.productId,
                    openingStock: 0,
                    totalPurchase: item.quantity,
                    totalSale: 0,
                    closingStock: item.quantity
                });
            } else {
                productStock.totalPurchase += item.quantity;
                productStock.closingStock =
                    productStock.openingStock +
                    productStock.totalPurchase -
                    productStock.totalSale;
            }
        }

        await financialStock.save({ session });

        // ===================================
        // ✅ COMMIT
        // ===================================
        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({
            success: true,
            message: "Purchase created successfully",
            data: {
                invoiceNo,
                purchaseId,
                financialYear,
                totalAmount: grandTotal
            }
        });

    } catch (error) {

        await session.abortTransaction();
        session.endSession();

        console.error("Error creating purchase:", error);

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