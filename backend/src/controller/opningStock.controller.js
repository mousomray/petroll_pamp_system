const mongoose = require("mongoose");
const { ZodError } = require("zod");

const { createOpeningStockSchema } = require("../schema/openingStock.schema");

const OpningStockModle = require("../model/opningStock.model");
const Product = require("../model/product.model");
const Tank = require("../model/tank.model");
const CurrentStock = require("../model/currentStock.model");
const TempStockModel = require("../model/tempStock")


const getFinancialYear = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  return month >= 4
    ? `${year}-${year + 1}`
    : `${year - 1}-${year}`;
};

 function getNextFinancialYear(date = new Date()) {
  const currentFY = getFinancialYear(date);

  const [startYear] = currentFY.split("-").map(Number);

  return `${startYear + 1}-${startYear + 2}`;
}


const createOpeningStock = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    const userId = req.user.id;
    const financialYear = getFinancialYear();

    const tempStocks = await TempStockModel.find({
      userId,
      financialYear
    }).session(session);

    if (!tempStocks.length) {
      throw new Error("No temp stock found to freeze");
    }

    for (const tempStock of tempStocks) {

      const { productId, openingStock, tanks } = tempStock;

      const product = await Product.findOne({
        _id: productId,
        userId
      }).session(session);

      if (!product) {
        throw new Error("Product not found");
      }

      const existing = await OpningStockModle.findOne({
        userId,
        productId,
        financialYear
      }).session(session);

      if (existing) {
        throw new Error(
          `Opening stock already exists for ${product.name}`
        );
      }

      // FUEL PRODUCT
      if (product.type === "FUEL") {

        if (openingStock > 0 && !tanks.length) {
          throw new Error(
            `Tank distribution missing for ${product.name}`
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

          const tankData = tanks.find(
            t => t.tankId.toString() === tank._id.toString()
          );

          if (
            tank.capacity &&
            tankData.quantity > tank.capacity
          ) {
            throw new Error(
              `Tank capacity exceeded (${tank.name})`
            );
          }

          tank.currentQuantity = tankData.quantity;
          await tank.save({ session });
        }

      } else {

        if (tanks.length) {
          throw new Error(
            `Tanks not allowed for non-fuel product (${product.name})`
          );
        }

      }

     
      await OpningStockModle.create(
        [{
          userId,
          productId,
          financialYear,
          openingStock,
          closingStock: openingStock
        }],
        { session }
      );

     
      await CurrentStock.findOneAndUpdate(
        { userId, productId },
        { $set: { quantity: openingStock } },
        { upsert: true, new: true, session }
      );

   
      await TempStockModel.deleteOne({
        _id: tempStock._id
      }).session(session);

    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Opening stock frozen successfully"
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


const updateOpeningStock = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user.id;
    const { id } = req.params;

    // ✅ Parse request
    const { products } = createOpeningStockSchema.parse(req.body);

    if (products.length !== 1) {
      throw new Error("Update requires exactly one product");
    }

    const { openingStock, tanks = [] } = products[0];

    // ===============================
    // FIND EXISTING STOCK
    // ===============================
    const stock = await OpningStockModle.findOne({
      _id: id,
      userId
    }).session(session);

    if (!stock) {
      throw new Error("Opening stock not found");
    }

    // ===============================
    // GET PRODUCT
    // ===============================
    const product = await Product.findOne({
      _id: stock.productId,
      userId
    }).session(session);

    if (!product) {
      throw new Error("Product not found");
    }

    // ===============================
    // FUEL PRODUCT LOGIC
    // ===============================
    if (product.type === "FUEL") {

      if (openingStock > 0 && !tanks.length) {
        throw new Error("Tank distribution required");
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
        throw new Error("Tank quantity mismatch with openingStock");
      }

      // Reset existing tanks
      await Tank.updateMany(
        { userId, productId: stock.productId },
        { $set: { currentQuantity: 0 } },
        { session }
      );

      // Fetch tanks in one query
      const tankDocs = await Tank.find({
        _id: { $in: tankIds },
        userId,
        productId: stock.productId
      }).session(session);

      if (tankDocs.length !== tankIds.length) {
        throw new Error("One or more tanks are invalid");
      }

      for (const tank of tankDocs) {
        const tankData = tanks.find(
          t => t.tankId.toString() === tank._id.toString()
        );

        if (
          tank.capacity &&
          tankData.quantity > tank.capacity
        ) {
          throw new Error(
            `Tank capacity exceeded (${tank.name})`
          );
        }

        tank.currentQuantity = tankData.quantity;
        await tank.save({ session });
      }

    } else {
      // NON FUEL should not receive tanks
      if (tanks.length) {
        throw new Error(
          `Tanks not allowed for non-fuel product (${product.name})`
        );
      }
    }

    // ===============================
    // UPDATE STOCK
    // ===============================
    stock.openingStock = openingStock;
    stock.closingStock = openingStock;
    await stock.save({ session });

    // ===============================
    // UPDATE CURRENT STOCK
    // ===============================
    await CurrentStock.findOneAndUpdate(
      { userId, productId: stock.productId },
      { $set: { quantity: openingStock } },
      { upsert: true, session }
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
        errors: error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message
        }))
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Internal server error"
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
      throw new Error("Opening stock not found");
    }

    const product = await Product.findOne({
      _id: stock.productId,
      userId
    }).session(session);

    if (!product) {
      throw new Error("Product not found");
    }

    // ✅ Reset tanks only if FUEL
    if (product.type === "FUEL") {
      await Tank.updateMany(
        { userId, productId: stock.productId },
        { $set: { currentQuantity: 0 } },
        { session }
      );
    }

    // ✅ Reset current stock
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

    return res.status(400).json({
      success: false,
      message: error.message || "Internal server error"
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
          totalPurchase: 1,
          totalSale: 1,
          createdAt: 1,

          productId: "$product._id",
          productName: "$product.name",
          productUnit: "$product.unit",
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
      stocks: stocks
    });

  } catch (error) {
    console.error("Error fetching opening stocks:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};


const carryForwardFinancialYear = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const userId = req.user.id;

    const currentFY = getFinancialYear();
    const nextFY = getNextFinancialYear();

    // =====================================================
    // ✅ CHECK IF ALREADY CARRIED FORWARD
    // =====================================================
    const alreadyForwarded = await OpningStockModle.findOne({
      userId,
      financialYear: nextFY
    }).session(session);

    if (alreadyForwarded) {
      throw new Error("Financial year already carried forward");
    }

    // =====================================================
    // GET CURRENT STOCKS
    // =====================================================
    const currentStocks = await CurrentStock.find({
      userId
    }).session(session);

    if (!currentStocks.length) {
      throw new Error("No stock found to carry forward");
    }

    // =====================================================
    // LOOP PRODUCTS
    // =====================================================
    for (const stock of currentStocks) {

      const previousYearStock = await OpningStockModle.findOne({
        userId,
        productId: stock.productId,
        financialYear: currentFY
      }).session(session);

      if (!previousYearStock) {
        continue;
      }

      // ✅ UPDATE PREVIOUS YEAR CLOSING STOCK
      previousYearStock.closingStock = stock.quantity;
      await previousYearStock.save({ session });

      // =====================================================
      // ✅ CREATE NEXT YEAR RECORD
      // =====================================================
      await OpningStockModle.create(
        [{
          userId,
          productId: stock.productId,
          financialYear: nextFY,

          // 🔥 Carry forward logic
          openingStock: stock.quantity,
          closingStock: stock.quantity,

          // ✅ RESET FOR NEW YEAR
          totalPurchase: 0,
          totalSale: 0
        }],
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Financial year carried forward successfully"
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

module.exports = {carryForwardFinancialYear, createOpeningStock, updateOpeningStock, getOpeningStocks, deleteOpeningStock };