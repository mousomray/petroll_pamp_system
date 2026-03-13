const mongoose = require("mongoose");
const puppeteer = require("puppeteer-core");
const { PurchaseModel, PurchaseItemModel } = require("../model/purchase.model");
const Product = require("../model/product.model");
const Tank = require("../model/tank.model");
const CurrentStock = require("../model/currentStock.model");
const OpningStockModle = require("../model/opningStock.model");
const AccountHead = require("../model/accountHead.model");
const TransactionModel = require("../model/transaction.model");
const { createPurchaseSchema } = require("../schema/purchase.schema");
const path = require("path");
const ejs = require("ejs");

const getFinancialYear = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;

    if (month >= 4) {
        return `${year}-${year + 1}`;
    } else {
        return `${year - 1}-${year}`;
    }
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
            instrumentId,
            instrumentDate,
            items
        } = req.body;

        if (!supplierId) throw new Error("Supplier required");
        if (!invoiceNo) throw new Error("Invoice number required");
        if (!purchaseDate) throw new Error("Purchase date required");
        if (!items || !Array.isArray(items) || items.length === 0)
            throw new Error("Purchase items required");


        // ==========================
        // FINANCIAL YEAR FROM DATE
        // ==========================
        const getFinancialYear = (date) => {

            const d = new Date(date);
            const year = d.getFullYear();
            const month = d.getMonth() + 1;

            if (month >= 4) {
                return `${year}-${year + 1}`;
            } else {
                return `${year - 1}-${year}`;
            }
        };

        const financialYear = getFinancialYear(purchaseDate);


        // ==========================
        // DUPLICATE INVOICE CHECK
        // ==========================
        const existingInvoice = await PurchaseModel.findOne({
            userId,
            invoiceNo
        }).session(session);

        if (existingInvoice)
            throw new Error("Invoice number already exists");


        let subTotal = 0;
        let totalCgst = 0;
        let totalSgst = 0;
        let totalIgst = 0;
        let grandTotal = 0;

        const purchaseItemsData = [];

        // ACCOUNT HEAD TOTAL TRACK
        let fuelExpense = 0;
        let accessoryExpense = 0;


        // ==========================
        // PROCESS ITEMS
        // ==========================
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


            // ==========================
            // ACCOUNT HEAD EXPENSE CALCULATION
            // ==========================
            if (product.type === "FUEL") {
                fuelExpense += baseAmount;
            }

            if (product.type === "ACCESSORY") {
                accessoryExpense += baseAmount;
            }


            // ==========================
            // TANK PRODUCT
            // ==========================
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

                    const tank = await Tank.findOne({
                        _id: dist.tankId,
                        userId,
                        isActive: true
                    }).session(session);

                    if (!tank)
                        throw new Error("Tank not found");

                    if (tank.currentQuantity + dist.quantity > tank.capacity)
                        throw new Error(`Tank capacity exceeded for ${tank.name}`);


                    // update tank
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

                // ==========================
                // NORMAL PRODUCT
                // ==========================

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


            // ==========================
            // UPDATE CURRENT STOCK
            // ==========================
            await CurrentStock.updateOne(
                { userId, productId: product._id },
                { $inc: { quantity: item.quantity } },
                { upsert: true, session }
            );


            // ==========================
            // UPDATE OPENING STOCK
            // ==========================

            const existingOpeningStock = await OpningStockModle.findOne({
                userId,
                productId: product._id,
                financialYear
            }).session(session);


            if (existingOpeningStock) {

                existingOpeningStock.totalPurchase += item.quantity;
                existingOpeningStock.closingStock += item.quantity;

                await existingOpeningStock.save({ session });

            } else {

                await OpningStockModle.create([{
                    userId,
                    productId: product._id,
                    financialYear,
                    openingStock: 0,
                    totalPurchase: item.quantity,
                    totalSale: 0,
                    closingStock: item.quantity
                }], { session });

            }

        }


        // ==========================
        // CREATE PURCHASE
        // ==========================
        const purchaseDoc = await PurchaseModel.create([{
            userId,
            supplierId,
            invoiceNo,
            purchaseDate,
            paymentStatus: "PAID",
            paymentMethod,
            instrumentId,
            instrumentDate,
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

        purchaseItemsData.forEach(i => {
            i.purchaseId = purchaseId;
        });

        await PurchaseItemModel.insertMany(purchaseItemsData, { session });


        // ==========================
        // ACCOUNT HEAD EXPENSE ENTRY
        // ==========================

        const fuelHead = await AccountHead.findOne({
            userId,
            name: "Fuel Purchase",
            type: "EXPENSE"
        }).session(session);

        const accessoryHead = await AccountHead.findOne({
            userId,
            name: "Accessory Expenses",
            type: "EXPENSE"
        }).session(session);


        const transactions = [];

        if (fuelExpense > 0 && fuelHead) {

            transactions.push({
                userId,
                accountHead: fuelHead._id,
                amount: fuelExpense,
                type: "EXPENSE",
                paymentMethod,
                note: `Fuel purchase invoice ${invoiceNo}`,
                transactionDate: purchaseDate
            });

        }

        if (accessoryExpense > 0 && accessoryHead) {

            transactions.push({
                userId,
                accountHead: accessoryHead._id,
                amount: accessoryExpense,
                type: "EXPENSE",
                paymentMethod,
                note: `Accessory purchase invoice ${invoiceNo}`,
                transactionDate: purchaseDate
            });

        }

        if (transactions.length > 0) {
            await TransactionModel.insertMany(transactions, { session });
        }


        await session.commitTransaction();
        session.endSession();


        return res.status(201).json({
            success: true,
            message: "Purchase created successfully",
            data: {
                purchaseId,
                invoiceNo,
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
        const limit = parseInt(req.query.limit) || parseInt(process.env.DEFAULT_PAGE_SIZE) || 10;
        const skip = (page - 1) * limit;

        const search = req.query.search ? req.query.search.trim() : "";
        const year = req.query.year ? parseInt(req.query.year) : null;
        const month = req.query.month ? parseInt(req.query.month) : null;
        const isPdf = req.query.pdf === "true"; // PDF generate হলে true

        const matchStage = { userId };

        if (year) {
            matchStage.createdAt = {
                ...matchStage.createdAt,
                $gte: new Date(`${year}-01-01`),
                $lte: new Date(`${year}-12-31`)
            };
        }

        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);
            matchStage.createdAt = { $gte: startDate, $lte: endDate };
        }

        const pipeline = [
            { $match: matchStage },

            // Supplier join
            {
                $lookup: {
                    from: "suppliers",
                    localField: "supplierId",
                    foreignField: "_id",
                    as: "supplier"
                }
            },
            { $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true } },

            // Items join + nested product & tank
            {
                $lookup: {
                    from: "purchaseitems",
                    let: { purchaseId: "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$purchaseId", "$$purchaseId"] } } },
                        { $lookup: { from: "products", localField: "productId", foreignField: "_id", as: "product" } },
                        { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
                        { $lookup: { from: "tanks", localField: "tankId", foreignField: "_id", as: "tank" } },
                        { $unwind: { path: "$tank", preserveNullAndEmptyArrays: true } }
                    ],
                    as: "items"
                }
            },
            { $addFields: { totalItems: { $size: "$items" } } }
        ];

        // Search filter
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

        if (!isPdf) {
            pipeline.push({
                $facet: {
                    data: [{ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit }],
                    totalCount: [{ $count: "count" }]
                }
            });
        } else {
            pipeline.push({ $sort: { createdAt: -1 } }); // full data for PDF
        }

        const result = await PurchaseModel.aggregate(pipeline).exec();

        if (isPdf) {
            const purchases = result;
            const templatePath = path.join(process.cwd(), "src", "views", "purchaseReport.ejs");

            const html = await ejs.renderFile(templatePath, { purchases });

            const browser = await puppeteer.launch({
                headless: true,
                executablePath: process.env.CHROME_PATH || undefined
            });
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: "networkidle0" });

            const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
            await browser.close();

            res.set({
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename=purchase_report.pdf`,
                "Content-Length": pdfBuffer.length
            });

            return res.send(pdfBuffer);
        }

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
        console.log("Error in listPurchases:", error);
        return res.status(500).json({ success: false, message: error.message });
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
            instrumentId,
            instrumentDate,
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
        existingPurchase.instrumentId = instrumentId;
        existingPurchase.instrumentDate = instrumentDate;
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

const generatePurchaseInvoice = async (req, res) => {
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
                        },

                        // FINAL ITEM SHAPE
                        {
                            $project: {

                                productName: "$product.name",
                                productType: "$product.type",
                                unit: "$product.unit",

                                quantity: 1,
                                costPrice: 1,

                                cgstPercent: 1,
                                sgstPercent: 1,
                                igstPercent: 1,

                                cgstAmount: 1,
                                sgstAmount: 1,
                                igstAmount: 1,

                                taxAmount: 1,
                                total: 1,

                                tankName: "$tank.name"
                            }
                        }

                    ],
                    as: "items"
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

        const purchase = result[0];

        const html = await ejs.renderFile(
            path.join(__dirname, "../views/purchaseDetails.ejs"),
            { purchase }
        );

        const browser = await puppeteer.launch({
            headless: true,
            executablePath: process.env.CHROME_PATH
        });

        const page = await browser.newPage();

        await page.setContent(html, { waitUntil: "networkidle0" });

        const pdf = await page.pdf({
            format: "A4",
            printBackground: true
        });

        await browser.close();

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename=purchase-${purchase.invoiceNo}.pdf`
        });

        res.send(pdf);

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

module.exports = {
    createPurchase,
    listPurchases,
    getPurchaseDetails,
    updatePurchase,
    generatePurchaseInvoice
};