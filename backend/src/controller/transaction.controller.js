const mongoose = require("mongoose");
const TransactionModel = require('../model/transaction.model');

const getTransactions = async (req, res) => {
    try {
        const userId = req.user._id;
        const {
            page = 1,
            limit = process.env.DEFAULT_PAGE_SIZE,
            type,
            paymentMethod,
            search,
            startDate,
            endDate
        } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const matchStage = {
            userId: new mongoose.Types.ObjectId(userId)
        };

        // type filter (INCOME / EXPENSE)
        if (type) {
            matchStage.type = type;
        }

        // payment method filter
        if (paymentMethod) {
            matchStage.paymentMethod = paymentMethod;
        }

        // date range filter
        if (startDate || endDate) {
            matchStage.transactionDate = {};

            if (startDate) {
                matchStage.transactionDate.$gte = new Date(startDate);
            }

            if (endDate) {
                matchStage.transactionDate.$lte = new Date(endDate);
            }
        }

        const pipeline = [

            {
                $match: matchStage
            },

            // join account head
            {
                $lookup: {
                    from: "accountheads",
                    localField: "accountHead",
                    foreignField: "_id",
                    as: "accountHead"
                }
            },

            {
                $unwind: "$accountHead"
            }

        ];

        // search filter (accountHead name or note)
        if (search) {
            pipeline.push({
                $match: {
                    $or: [
                        {
                            "accountHead.name": {
                                $regex: search,
                                $options: "i"
                            }
                        },
                        {
                            note: {
                                $regex: search,
                                $options: "i"
                            }
                        }
                    ]
                }
            });
        }

        pipeline.push(
            {
                $project: {
                    _id: 1,
                    amount: 1,
                    type: 1,
                    paymentMethod: 1,
                    note: 1,
                    transactionDate: 1,

                    accountHeadId: "$accountHead._id",
                    accountHeadName: "$accountHead.name",
                    accountHeadType: "$accountHead.type"
                }
            },
            {
                $sort: { transactionDate: -1 }
            },
            {
                $skip: skip
            },
            {
                $limit: Number(limit)
            }
        );

        const transactions = await TransactionModel.aggregate(pipeline);

        // total count pipeline
        const countPipeline = [
            {
                $match: matchStage
            },
            {
                $lookup: {
                    from: "accountheads",
                    localField: "accountHead",
                    foreignField: "_id",
                    as: "accountHead"
                }
            },
            {
                $unwind: "$accountHead"
            }
        ];

        if (search) {
            countPipeline.push({
                $match: {
                    $or: [
                        {
                            "accountHead.name": {
                                $regex: search,
                                $options: "i"
                            }
                        },
                        {
                            note: {
                                $regex: search,
                                $options: "i"
                            }
                        }
                    ]
                }
            });
        }

        countPipeline.push({
            $count: "total"
        });

        const totalResult = await TransactionModel.aggregate(countPipeline);
        const total = totalResult[0]?.total || 0;

        return res.status(200).json({
            success: true,
            message: "Transactions fetched successfully",

            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit)
            },

            data: transactions
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

module.exports = {
    getTransactions
};