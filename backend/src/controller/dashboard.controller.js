const mongoose = require("mongoose");
const User = require("../model/user.model");
const Worker = require("../model/worker.model");
const Product = require("../model/product.model");
const Tank = require("../model/tank.model");
const Nozzle = require("../model/nozzel.model");
const Supplier = require("../model/supplier.model");
const CurrentStock = require("../model/currentStock.model");
const { PurchaseModel } = require("../model/purchase.model");
// const SaleModel = require("../model/sale.model");

const getDashboard = async (req, res) => {
    try {
        const userId = req.user?._id;
        const role = req.user?.role;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const objectUserId = new mongoose.Types.ObjectId(userId);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const response = {};

        // ===================== ADMIN DASHBOARD =====================
        if (role === "ADMIN") {
            const [
                totalUsers,
                totalWorkers,
                totalProducts,
                totalTanks,
                totalNozzles,
                totalSuppliers,
                totalPurchases,
                purchaseSummary,
                stockSummary,
                recentPurchases,
                todayPurchaseAgg,
                monthlyPurchaseAgg
            ] = await Promise.all([

                User.countDocuments({ createdBy: userId }),
                Worker.countDocuments({ createdBy: userId }),
                Product.countDocuments({ userId }),
                Tank.countDocuments({ userId }),
                Nozzle.countDocuments({ userId }),

                // ⚡ FIXED Suppliers
                Supplier.countDocuments({ userId }),

                PurchaseModel.countDocuments({ createdBy: userId }),

                // Total Purchase Aggregation
                PurchaseModel.aggregate([
                    { $match: { createdBy: objectUserId } },
                    {
                        $group: {
                            _id: null,
                            totalAmount: { $sum: "$totalAmount" },
                            totalPaid: { $sum: "$paidAmount" },
                            totalDue: { $sum: "$dueAmount" }
                        }
                    }
                ]),

                // Total Stock Quantity
                CurrentStock.aggregate([
                    { $match: { userId: objectUserId } },
                    { $group: { _id: null, totalQuantity: { $sum: "$quantity" } } }
                ]),

                // Recent Purchases with Products & Supplier
                PurchaseModel.aggregate([
                    { $match: { createdBy: objectUserId } },
                    { $sort: { createdAt: -1 } },
                    { $limit: 5 },

                    {
                        $lookup: {
                            from: "purchaseitems",
                            localField: "_id",
                            foreignField: "purchaseId",
                            as: "items"
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
                    { $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true } },

                    {
                        $project: {
                            invoiceNo: 1,
                            purchaseDate: 1,
                            totalAmount: 1,
                            paymentStatus: 1,
                            supplierName: "$supplier.name",
                            products: {
                                $map: {
                                    input: "$items",
                                    as: "item",
                                    in: {
                                        productId: "$$item.productId",
                                        quantity: "$$item.quantity",
                                        costPrice: "$$item.costPrice",
                                        total: "$$item.total"
                                    }
                                }
                            }
                        }
                    }
                ]),

                // Today's Purchase Amount
                PurchaseModel.aggregate([
                    { $match: { createdBy: objectUserId, purchaseDate: { $gte: todayStart } } },
                    { $group: { _id: null, total: { $sum: "$totalAmount" } } }
                ]),

                // Monthly Purchase Amount
                PurchaseModel.aggregate([
                    { $match: { createdBy: objectUserId, purchaseDate: { $gte: monthStart } } },
                    { $group: { _id: null, total: { $sum: "$totalAmount" } } }
                ])
            ]);

            response.admin = {
                totals: {
                    totalUsers,
                    totalWorkers,
                    totalProducts,
                    totalTanks,
                    totalNozzles,
                    totalSuppliers,
                    totalPurchases,

                    totalPurchaseAmount: purchaseSummary?.[0]?.totalAmount || 0,
                    totalPaidAmount: purchaseSummary?.[0]?.totalPaid || 0,
                    totalDueAmount: purchaseSummary?.[0]?.totalDue || 0,

                    totalStockQuantity: stockSummary?.[0]?.totalQuantity || 0,

                    todayPurchaseAmount: todayPurchaseAgg?.[0]?.total || 0,
                    monthlyPurchaseAmount: monthlyPurchaseAgg?.[0]?.total || 0
                },

                recentPurchases
            };
        }

        // ===================== MANAGER DASHBOARD =====================
        if (role === "MANAGER") {
            const [
                totalWorkers,
                totalProducts,
                totalTanks,
                totalPurchases,
                recentPurchases
            ] = await Promise.all([
                Worker.countDocuments({ createdBy: userId }),
                Product.countDocuments({ userId }),
                Tank.countDocuments({ userId }),
                PurchaseModel.countDocuments({ createdBy: userId }),

                PurchaseModel.find({ createdBy: userId })
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .select("invoiceNo totalAmount purchaseDate")
            ]);

            response.manager = { totalWorkers, totalProducts, totalTanks, totalPurchases, recentPurchases };
        }

        // ===================== ACCOUNTANT DASHBOARD =====================
        if (role === "ACCOUNTANT") {
            const purchaseSummary = await PurchaseModel.aggregate([
                { $match: { createdBy: objectUserId } },
                {
                    $group: {
                        _id: "$paymentStatus",
                        totalAmount: { $sum: "$totalAmount" }
                    }
                }
            ]);

            response.accountant = purchaseSummary;
        }

        // ===================== CASHIER DASHBOARD =====================
        if (role === "CASHIER") {
            const [totalNozzles, totalWorkers] = await Promise.all([
                Nozzle.countDocuments({ userId }),
                Worker.countDocuments({ createdBy: userId })
            ]);

            response.cashier = { totalNozzles, totalWorkers, shift: req.user.shiftType };
        }

        return res.status(200).json({ success: true, role, data: response });

    } catch (error) {
        console.error("Dashboard Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getDashboard };