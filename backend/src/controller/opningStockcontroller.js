const mongoose = require("mongoose");
const { ZodError } = require("zod");

const { createOpeningStockSchema } = require("../schema/openingStock.schema");

const OpningStockModle = require("../model/opningStock.model");
const Product = require("../model/product.model");
const Tank = require("../model/tank.model");
const CurrentStock = require("../model/currentStock.model");

const getFinancialYear = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  return month >= 4
    ? `${year}-${year + 1}`
    : `${year - 1}-${year}`;
};

const createOpeningStock = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    const parsedData = createOpeningStockSchema.parse(req.body);
    const { productId, openingStock, tanks = [] } = parsedData;

    const userId = req.user.id;
    const financialYear = getFinancialYear();


    const product = await Product.findById(productId).session(session);
    if (!product) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Product not found"
      });
    }


    if (product.type === "FUEL") {

      if (!Array.isArray(tanks) || tanks.length === 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Tank distribution is required for FUEL product"
        });
      }

      const totalTankQty = tanks.reduce(
        (sum, t) => sum + Number(t.quantity),
        0
      );

      if (totalTankQty !== Number(openingStock)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Sum of tank quantities must equal openingStock"
        });
      }

      for (const tankData of tanks) {

        const tank = await Tank.findOne({
          _id: tankData.tankId,
          userId,
          productId
        }).session(session);

        if (!tank) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            success: false,
            message: `Invalid tank: ${tankData.tankId}`
          });
        }

        if (
          tank.capacity &&
          tank.currentQuantity + Number(tankData.quantity) > tank.capacity
        ) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            success: false,
            message: `Tank capacity exceeded for tank ${tank.name}`
          });
        }

        tank.currentQuantity += Number(tankData.quantity);
        await tank.save({ session });
      }

    } else {
      if (tanks.length > 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Tanks not allowed for non-FUEL products"
        });
      }
    }

   
    const existing = await OpningStockModle.findOne({
      userId,
      productId,
      financialYear
    }).session(session);

    if (existing) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Opening stock already exists for this financial year"
      });
    }

   
    const stock = await OpningStockModle.create([{
      userId,
      productId,
      financialYear,
      openingStock,
      closingStock: openingStock
    }], { session });

 
    await CurrentStock.findOneAndUpdate(
      { userId, productId },
      {
        $set: { quantity: openingStock }
      },
      {
        upsert: true,
        new: true,
        session
      }
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

    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message
        }))
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Opening stock already exists for this financial year"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const getOpeningStockById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const stock = await OpningStockModle.findOne({
      _id: id,
      userId
    }).populate("productId", "name type");

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: "Opening stock not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: stock
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};


const updateOpeningStock = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    const userId = req.user.id;
    const { id } = req.params;

    const parsedData = createOpeningStockSchema.parse(req.body);
    const { openingStock, tanks = [] } = parsedData;

    const stock = await OpningStockModle.findOne({
      _id: id,
      userId
    }).session(session);

    if (!stock) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Opening stock not found"
      });
    }

    const product = await Product.findById(stock.productId).session(session);

   
    if (product.type === "FUEL") {
      const existingTanks = await Tank.find({
        userId,
        productId: stock.productId
      }).session(session);

      for (const tank of existingTanks) {
        tank.currentQuantity = 0;
        await tank.save({ session });
      }

      const totalTankQty = tanks.reduce(
        (sum, t) => sum + Number(t.quantity),
        0
      );

      if (totalTankQty !== Number(openingStock)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Sum of tank quantities must equal openingStock"
        });
      }

      for (const tankData of tanks) {
        const tank = await Tank.findOne({
          _id: tankData.tankId,
          userId
        }).session(session);

        tank.currentQuantity += Number(tankData.quantity);
        await tank.save({ session });
      }
    }

    stock.openingStock = openingStock;
    stock.closingStock = openingStock;
    await stock.save({ session });

    await CurrentStock.findOneAndUpdate(
      { userId, productId: stock.productId },
      { $set: { quantity: openingStock } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Opening stock updated successfully"
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const deleteOpeningStock = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    const userId = req.user.id;
    const { id } = req.params;

    const stock = await OpningStockModle.findOne({
      _id: id,
      userId
    }).session(session);

    if (!stock) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Opening stock not found"
      });
    }

    
    await Tank.updateMany(
      { userId, productId: stock.productId },
      { $set: { currentQuantity: 0 } },
      { session }
    );

    
    await CurrentStock.findOneAndUpdate(
      { userId, productId: stock.productId },
      { $set: { quantity: 0 } },
      { session }
    );

    await stock.deleteOne({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Opening stock deleted successfully"
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};


const getOpeningStocks = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    let page = parseInt(req.query.page) || 1;
    let limit =
      parseInt(req.query.limit) ||
      parseInt(process.env.DEFAULT_PAGE_SIZE) ||
      10;

    const search = req.query.search || "";
    const financialYear = req.query.financialYear || "";

    const matchStage = {
      userId: new mongoose.Types.ObjectId(userId)
    };

    // ✅ Financial Year Filter
    if (financialYear) {
      matchStage.financialYear = financialYear;
    }

    const pipeline = [
      { $match: matchStage },

      // ✅ Join Product
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },

      // ✅ Search by Product Name
      ...(search
        ? [
            {
              $match: {
                "product.name": { $regex: search, $options: "i" }
              }
            }
          ]
        : []),

      {
        $project: {
          financialYear: 1,
          openingStock: 1,
          closingStock: 1,
          createdAt: 1,

          productId: "$product._id",
          productName: "$product.name",
          productType: "$product.type"
        }
      },

      { $sort: { createdAt: -1 } },

      {
        $facet: {
          data: [
            { $skip: (page - 1) * limit },
            { $limit: limit }
          ],
          totalCount: [
            { $count: "count" }
          ]
        }
      }
    ];

    const result = await OpningStockModle.aggregate(pipeline);

    const stocks = result[0].data;
    const totalRecords = result[0].totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    return res.status(200).json({
      success: true,
      page,
      limit,
      totalPages,
      totalRecords,
      data: stocks
    });

  } catch (error) {
    console.error("Error fetching opening stocks:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

module.exports = { createOpeningStock, updateOpeningStock,getOpeningStockById,getOpeningStocks, deleteOpeningStock };