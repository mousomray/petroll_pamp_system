const TempStockModel = require("../model/tempStock")
const Product = require("../model/product.model");
const Tank = require("../model/tank.model");
const DEFAULT_PAGE_SIZE = parseInt(process.env.DEFAULT_PAGE_SIZE) || 10;
const mongoose = require("mongoose");

const { createOpeningStockSchema } = require("../schema/openingStock.schema");

const getFinancialYear = (date = new Date()) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    return month >= 4
        ? `${year}-${year + 1}`
        : `${year - 1}-${year}`;
};


const createTempStock = async (req, res) => {

    const session = await mongoose.startSession();
    session.startTransaction();

    try {

        const { products } = createOpeningStockSchema.parse(req.body);

        const userId = req.user.id;
        const financialYear = getFinancialYear();

        for (const item of products) {

            const { productId, openingStock, tanks = [] } = item;

            const product = await Product.findOne({
                _id: productId,
                userId
            }).session(session);

            if (!product) {
                throw new Error("Product not found");
            }

            const existing = await TempStockModel.findOne({
                userId,
                productId,
                financialYear
            }).session(session);

            if (existing) {
                throw new Error(
                    `Opening stock already exists for ${product.name}`
                );
            }

            let tankData = [];

            if (product.type === "FUEL") {

                if (openingStock > 0 && !tanks.length) {
                    throw new Error(
                        `Tank distribution required for ${product.name}`
                    );
                }

                const tankIds = tanks.map(t => t.tankId.toString());

                const uniqueTankIds = new Set(tankIds);

                if (tankIds.length !== uniqueTankIds.size) {
                    throw new Error("Duplicate tanks are not allowed");
                }

                const totalTankQty = tanks.reduce(
                    (sum, t) => sum + t.quantity,
                    0
                );

                if (totalTankQty !== openingStock) {
                    throw new Error(
                        `Tank quantity mismatch for ${product.name}`
                    );
                }

                const tankDocs = await Tank.find({
                    _id: { $in: tankIds },
                    userId
                }).session(session);

                if (tankDocs.length !== tankIds.length) {
                    throw new Error("One or more tanks are invalid");
                }

                for (const tank of tankDocs) {

                    const tankInput = tanks.find(
                        t => t.tankId.toString() === tank._id.toString()
                    );

                    if (
                        tank.capacity &&
                        tankInput.quantity > tank.capacity
                    ) {
                        throw new Error(
                            `Tank capacity exceeded (${tank.name})`
                        );
                    }

                    tankData.push({
                        tankId: tank._id,
                        quantity: tankInput.quantity
                    });

                }

            } else {

                if (tanks.length) {
                    throw new Error(
                        `Tanks not allowed for non-fuel product (${product.name})`
                    );
                }

            }

            await TempStockModel.create(
                [{
                    userId,
                    productId,
                    financialYear,
                    openingStock,
                    tanks: tankData,
                    closingStock: openingStock
                }],
                { session }
            );

        }

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            success: true,
            message: "Temp stock saved successfully"
        });

    } catch (error) {

        await session.abortTransaction();
        session.endSession();

        return res.status(400).json({
            success: false,
            message: error.message || "Internal server error"
        });

    }

};

const deleteTempStock = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { productId } = req.params;
        const userId = req.user.id;
        const financialYear = getFinancialYear();


        const tempStock = await TempStockModel.findOne({
            userId,
            productId,
            financialYear
        }).session(session);

        if (!tempStock) {
            throw new Error("Temp stock not found");
        }


        await TempStockModel.deleteOne({
            _id: tempStock._id
        }).session(session);


        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            success: true,
            message: "Temp stock deleted successfully"
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        return res.status(400).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};


const getAllTempStock = async (req, res) => {
  try {

    const userId = new mongoose.Types.ObjectId(req.user.id);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || DEFAULT_PAGE_SIZE || 10;
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    const financialYear = getFinancialYear();

    const pipeline = [

      {
        $match: {
          userId,
          financialYear
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

      { $unwind: "$product" },

      {
        $match: {
          "product.name": { $regex: search, $options: "i" }
        }
      },

      {
        $lookup: {
          from: "tanks",
          localField: "tanks.tankId",
          foreignField: "_id",
          as: "tankDocs"
        }
      },

      {
        $addFields: {

          tankIds: {
            $map: {
              input: "$tanks",
              as: "t",
              in: "$$t.tankId"
            }
          },

          tankAllocations: {
            $map: {
              input: "$tanks",
              as: "t",
              in: {
                tankId: "$$t.tankId",
                openingStock: "$$t.quantity",
                tankName: {
                  $let: {
                    vars: {
                      tank: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$tankDocs",
                              as: "td",
                              cond: { $eq: ["$$td._id", "$$t.tankId"] }
                            }
                          },
                          0
                        ]
                      }
                    },
                    in: "$$tank.name"
                  }
                }
              }
            }
          }

        }
      },

      {
        $project: {
          _id: "$product._id",
          name: "$product.name",
          type: "$product.type",
          unit: "$product.unit",
          quantity: "$openingStock",
          costPrice: "$product.costPrice",
          sellingPrice: "$product.sellingPrice",
          minimumStockAlert: "$product.minimumStockAlert",
          openingStock: "$openingStock",
          tankIds: 1,
          tankAllocations: 1
        }
      },

      { $sort: { name: 1 } },

      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit }
          ],
          totalCount: [
            { $count: "count" }
          ]
        }
      }

    ];

    const result = await TempStockModel.aggregate(pipeline);

    const data = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      page,
      totalPages,
      totalProducts: total,
      data
    });

  } catch (error) {

    console.error("Error fetching temp stock:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });

  }
};

module.exports = {createTempStock, deleteTempStock , getAllTempStock}

