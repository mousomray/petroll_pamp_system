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
            invoiceNo,   
            purchaseDate,
            paymentMethod = "CASH",
            items
        } = req.body;

        if (!supplierId) throw new Error("Supplier required");
        if (!invoiceNo) throw new Error("Invoice number required");  // ✅ required
        if (!purchaseDate) throw new Error("Purchase date required");
        if (!items || !Array.isArray(items) || items.length === 0)
            throw new Error("Purchase items required");

        // ============================
        // ✅ DUPLICATE INVOICE CHECK
        // ============================
        const existingInvoice = await PurchaseModel.findOne({
            userId,
            invoiceNo
        }).session(session);

        if (existingInvoice) {
            throw new Error("Invoice number already exists");
        }

        let subTotal = 0;
        let totalCgst = 0;
        let totalSgst = 0;
        let totalIgst = 0;
        let grandTotal = 0;

        const purchaseItemsData = [];

        // ============================
        // PROCESS ITEMS
        // ============================
        for (const item of items) {

            if (!item.productId || !item.quantity || item.quantity <= 0)
                throw new Error("Invalid product or quantity");

            const product = await Product.findOne({
                _id: item.productId,
                userId
            }).session(session);

            if (!product) throw new Error("Product not found");

            const costPrice = product.costPrice ?? 0;
            if (!costPrice)
                throw new Error(`Cost price missing for ${product.name}`);

            const cgstPercent = product.cgstPercent || 0;
            const sgstPercent = product.sgstPercent || 0;
            const igstPercent = product.igstPercent || 0;

            const baseAmount = item.quantity * costPrice;
            subTotal += baseAmount;

            // ============================
            // 🛢 TANK PRODUCT
            // ============================
            if (product.tankIds && product.tankIds.length > 0) {

                if (!item.tankDistributions || item.tankDistributions.length === 0)
                    throw new Error(`Tank distribution required for ${product.name}`);

                const totalDistributed = item.tankDistributions.reduce(
                    (sum, t) => sum + Number(t.quantity),
                    0
                );

                if (totalDistributed !== item.quantity)
                    throw new Error(`Tank quantity mismatch for ${product.name}`);

                for (const dist of item.tankDistributions) {

                    if (!dist.tankId || !dist.quantity || dist.quantity <= 0)
                        throw new Error("Invalid tank distribution");

                    const tank = await Tank.findOne({
                        _id: dist.tankId,
                        userId,
                        isActive: true
                    }).session(session);

                    if (!tank)
                        throw new Error("Tank not found");

                    if (tank.currentQuantity + dist.quantity > tank.capacity)
                        throw new Error(
                            `Tank capacity exceeded for ${tank.name}`
                        );

                    tank.currentQuantity += dist.quantity;
                    await tank.save({ session });

                    const splitBase = dist.quantity * costPrice;
                    const cgstAmount = (splitBase * cgstPercent) / 100;
                    const sgstAmount = (splitBase * sgstPercent) / 100;
                    const igstAmount = (splitBase * igstPercent) / 100;
                    const totalTax = cgstAmount + sgstAmount + igstAmount;
                    const splitTotal = splitBase + totalTax;

                    totalCgst += cgstAmount;
                    totalSgst += sgstAmount;
                    totalIgst += igstAmount;
                    grandTotal += splitTotal;

                    purchaseItemsData.push({
                        productId: product._id,
                        quantity: dist.quantity,
                        costPrice,
                        cgstPercent,
                        sgstPercent,
                        igstPercent,
                        cgstAmount,
                        sgstAmount,
                        igstAmount,
                        taxAmount: totalTax,
                        total: splitTotal,
                        tankId: dist.tankId
                    });
                }

            } else {

                // ============================
                // 📦 NON-TANK PRODUCT
                // ============================

                const cgstAmount = (baseAmount * cgstPercent) / 100;
                const sgstAmount = (baseAmount * sgstPercent) / 100;
                const igstAmount = (baseAmount * igstPercent) / 100;
                const totalTax = cgstAmount + sgstAmount + igstAmount;
                const itemTotal = baseAmount + totalTax;

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
                    tankId: null
                });
            }

            // ============================
            // 📦 UPDATE CURRENT STOCK
            // ============================
            await CurrentStock.updateOne(
                { userId, productId: product._id },
                { $inc: { quantity: item.quantity } },
                { upsert: true, session }
            );
        }

        // ============================
        // CREATE PURCHASE
        // ============================
        const purchaseDoc = await PurchaseModel.create([{
            userId,
            supplierId,
            invoiceNo, // ✅ manual invoice
            purchaseDate,
            paymentStatus: "PAID",
            paymentMethod,
            paidAmount: grandTotal,
            dueAmount: 0,
            subTotal,
            cgstAmount: totalCgst,
            sgstAmount: totalSgst,
            taxAmount: totalCgst + totalSgst + totalIgst,
            totalAmount: grandTotal,
            createdBy: userId
        }], { session });

        const purchaseId = purchaseDoc[0]._id;

        purchaseItemsData.forEach(item => {
            item.purchaseId = purchaseId;
        });

        await PurchaseItemModel.insertMany(purchaseItemsData, { session });

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

const getPurchaseDetails = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user._id);
        const purchaseId = new mongoose.Types.ObjectId(req.params.id);

        const pipeline = [

            {
                $match: {
                    _id: purchaseId,
                    userId
                }
            },

            {
                $lookup: {
                    from: "suppliers",
                    localField: "supplierId",
                    foreignField: "_id",
                    as: "supplier"
                }
            },
            {
                $unwind: {
                    path: "$supplier",
                    preserveNullAndEmptyArrays: true
                }
            },

            {
                $lookup: {
                    from: "purchaseitems",
                    let: { purchaseId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$purchaseId", "$$purchaseId"]
                                }
                            }
                        },

                        // PRODUCT JOIN
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

                        // TANK JOIN
                        {
                            $lookup: {
                                from: "tanks",
                                localField: "tankId",
                                foreignField: "_id",
                                as: "tank"
                            }
                        },
                        {
                            $unwind: {
                                path: "$tank",
                                preserveNullAndEmptyArrays: true
                            }
                        }
                    ],
                    as: "items"
                }
            },

            {
                $addFields: {
                    totalItems: { $size: "$items" }
                }
            }
        ];

        const result = await PurchaseModel.aggregate(pipeline);

        if (!result.length) {
            return res.status(404).json({
                success: false,
                message: "Purchase not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Purchase details fetched successfully",
            data: result[0]
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const updatePurchase = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        await session.startTransaction();

        const userId = req.user._id;
        const purchaseId = req.params.id;

        const {
            supplierId,
            purchaseDate,
            paymentMethod = "CASH",
            items
        } = req.body;

        if (!supplierId) throw new Error("Supplier required");
        if (!purchaseDate) throw new Error("Purchase date required");
        if (!items || !Array.isArray(items) || items.length === 0)
            throw new Error("Purchase items required");

        // =========================
        // FIND OLD PURCHASE
        // =========================
        const existingPurchase = await PurchaseModel.findOne({
            _id: purchaseId,
            userId
        }).session(session);

        if (!existingPurchase)
            throw new Error("Purchase not found");

        // =========================
        // GET OLD ITEMS
        // =========================
        const oldItems = await PurchaseItemModel.find({
            purchaseId
        }).session(session);

        // =========================
        // REVERSE OLD STOCK & TANK
        // =========================
        for (const oldItem of oldItems) {

            // Reverse Current Stock
            await CurrentStock.updateOne(
                { userId, productId: oldItem.productId },
                { $inc: { quantity: -oldItem.quantity } },
                { session }
            );

            // Reverse Tank Quantity if exists
            if (oldItem.tankId) {
                const tank = await Tank.findOne({
                    _id: oldItem.tankId,
                    userId
                }).session(session);

                if (tank) {
                    tank.currentQuantity -= oldItem.quantity;

                    if (tank.currentQuantity < 0)
                        throw new Error("Tank quantity mismatch during update");

                    await tank.save({ session });
                }
            }
        }

        // Delete Old Purchase Items
        await PurchaseItemModel.deleteMany(
            { purchaseId },
            { session }
        );

        // =========================
        // NOW RE-CREATE NEW DATA
        // =========================
        let subTotal = 0;
        let totalCgst = 0;
        let totalSgst = 0;
        let totalIgst = 0;
        let grandTotal = 0;

        const purchaseItemsData = [];

        for (const item of items) {

            if (!item.productId || !item.quantity || item.quantity <= 0)
                throw new Error("Invalid product or quantity");

            const product = await Product.findOne({
                _id: item.productId,
                userId
            }).session(session);

            if (!product) throw new Error("Product not found");

            const costPrice = product.costPrice ?? 0;
            if (!costPrice)
                throw new Error(`Cost price missing for ${product.name}`);

            const cgstPercent = product.cgstPercent || 0;
            const sgstPercent = product.sgstPercent || 0;
            const igstPercent = product.igstPercent || 0;

            const baseAmount = item.quantity * costPrice;
            subTotal += baseAmount;

            // ======================
            // TANK PRODUCT
            // ======================
            if (product.tankIds && product.tankIds.length > 0) {

                if (!item.tankDistributions || item.tankDistributions.length === 0)
                    throw new Error(`Tank distribution required`);

                const totalDistributed = item.tankDistributions.reduce(
                    (sum, t) => sum + Number(t.quantity),
                    0
                );

                if (totalDistributed !== item.quantity)
                    throw new Error("Tank quantity mismatch");

                for (const dist of item.tankDistributions) {

                    const tank = await Tank.findOne({
                        _id: dist.tankId,
                        userId,
                        isActive: true
                    }).session(session);

                    if (!tank)
                        throw new Error("Tank not found");

                    if (tank.currentQuantity + dist.quantity > tank.capacity)
                        throw new Error("Tank capacity exceeded");

                    tank.currentQuantity += dist.quantity;
                    await tank.save({ session });

                    const splitBase = dist.quantity * costPrice;
                    const cgstAmount = (splitBase * cgstPercent) / 100;
                    const sgstAmount = (splitBase * sgstPercent) / 100;
                    const igstAmount = (splitBase * igstPercent) / 100;
                    const totalTax = cgstAmount + sgstAmount + igstAmount;
                    const splitTotal = splitBase + totalTax;

                    totalCgst += cgstAmount;
                    totalSgst += sgstAmount;
                    totalIgst += igstAmount;
                    grandTotal += splitTotal;

                    purchaseItemsData.push({
                        purchaseId,
                        productId: product._id,
                        quantity: dist.quantity,
                        costPrice,
                        cgstPercent,
                        sgstPercent,
                        igstPercent,
                        cgstAmount,
                        sgstAmount,
                        igstAmount,
                        taxAmount: totalTax,
                        total: splitTotal,
                        tankId: dist.tankId
                    });
                }

            } else {

                const cgstAmount = (baseAmount * cgstPercent) / 100;
                const sgstAmount = (baseAmount * sgstPercent) / 100;
                const igstAmount = (baseAmount * igstPercent) / 100;
                const totalTax = cgstAmount + sgstAmount + igstAmount;
                const itemTotal = baseAmount + totalTax;

                totalCgst += cgstAmount;
                totalSgst += sgstAmount;
                totalIgst += igstAmount;
                grandTotal += itemTotal;

                purchaseItemsData.push({
                    purchaseId,
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
                    tankId: null
                });
            }

            // Update Current Stock
            await CurrentStock.updateOne(
                { userId, productId: product._id },
                { $inc: { quantity: item.quantity } },
                { upsert: true, session }
            );
        }

        // =========================
        // UPDATE MAIN PURCHASE DOC
        // =========================
        existingPurchase.supplierId = supplierId;
        existingPurchase.purchaseDate = purchaseDate;
        existingPurchase.paymentMethod = paymentMethod;
        existingPurchase.subTotal = subTotal;
        existingPurchase.cgstAmount = totalCgst;
        existingPurchase.sgstAmount = totalSgst;
        existingPurchase.taxAmount = totalCgst + totalSgst + totalIgst;
        existingPurchase.totalAmount = grandTotal;
        existingPurchase.paidAmount = grandTotal;
        existingPurchase.dueAmount = 0;

        await existingPurchase.save({ session });

        await PurchaseItemModel.insertMany(purchaseItemsData, { session });

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            success: true,
            message: "Purchase updated successfully"
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

module.exports = {
    createPurchase,
    listPurchases,
    getPurchaseDetails,
    updatePurchase
};