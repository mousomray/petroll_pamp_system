const mongoose = require("mongoose")
const SaleItemModel = require("../model/saleItem.model")
const SalesModel = require("../model/sales.model")

const ShiftModel = require("../model/shiftModel")
const NozzleModel = require("../model/nozzel.model")
const MeterReadingModel = require("../model/meterReading.model")
const ProductModel = require("../model/product.model")
const OpeningStockModel = require("../model/opningStock.model")
const CurrentStock = require("../model/currentStock.model")
const { createAccessorySaleSchema } = require("../schema/saleSchema")


const createShiftWiseSales = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const shift = await ShiftModel.findOne({
      _id: id,
      userId,
      status: "CLOSED"
    });

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Shift not found or not closed"
      });
    }

    const nozzles = await NozzleModel.find({
      _id: { $in: shift.nozzleIds },
      userId
    }).select("_id nozzleNumber tankId");

    if (!nozzles.length) {
      return res.status(400).json({
        success: false,
        message: "Nozzles not found for this shift"
      });
    }

    // Safety: Remove any nozzle without tankId
    const validNozzles = nozzles.filter(n => n.tankId);
    if (!validNozzles.length) {
      return res.status(400).json({
        success: false,
        message: "No valid nozzles with tank assigned"
      });
    }

    const tankIds = [...new Set(validNozzles.map(n => n.tankId.toString()))];

    const tanks = await TankModel.find({
      _id: { $in: tankIds },
      userId
    }).select("_id productId");

    if (!tanks.length) {
      return res.status(400).json({
        success: false,
        message: "Tanks not found"
      });
    }

    const productIds = [...new Set(tanks.map(t => t.productId.toString()))];

    const products = await ProductModel.find({
      _id: { $in: productIds },
      userId,
      type: "FUEL",
      isActive: true
    });

    if (!products.length) {
      return res.status(400).json({
        success: false,
        message: "Products not found"
      });
    }

    const meterData = await MeterReadingModel.aggregate([
      {
        $match: {
          shiftId: new mongoose.Types.ObjectId(id),
          userId: new mongoose.Types.ObjectId(userId)
        }
      },
      {
        $group: {
          _id: "$nozzleId",
          totalLitres: { $sum: "$totalLitres" }
        }
      }
    ]);

    if (!meterData.length) {
      return res.status(400).json({
        success: false,
        message: "No meter readings found"
      });
    }

    const invoiceNumber = `INV-${Date.now()}`;

    let totalLitres = 0;
    let totalAmount = 0;

    const sales = await SalesModel.create({
      shiftId: id,
      workerId: shift.workerId,
      invoiceNumber,
      totalLitres: 0,
      totalAmount: 0,
      userId
    });

    const saleItems = [];

    for (const reading of meterData) {
      const nozzle = validNozzles.find(
        n => n._id.toString() === reading._id.toString()
      );
      if (!nozzle) continue;

      const tank = tanks.find(
        t => t._id.toString() === nozzle.tankId?.toString()
      );
      if (!tank) continue;

      const product = products.find(
        p => p._id.toString() === tank.productId.toString()
      );
      if (!product) continue;

      const litres = reading.totalLitres;
      const price = product.sellingPrice;
      const amount = litres * price;

      totalLitres += litres;
      totalAmount += amount;

      saleItems.push({
        saleId: sales._id,
        productId: product._id,
        nozzleId: nozzle._id,
        litres,
        pricePerLitre: price,
        amount,
        userId
      });
    }

    if (saleItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid sales data generated"
      });
    }

    await SaleItemModel.insertMany(saleItems);

    sales.totalLitres = totalLitres;
    sales.totalAmount = totalAmount;

    await sales.save();

    return res.status(200).json({
      success: true,
      message: "Sales created successfully",
      data: { sales, saleItems }
    });

  } catch (error) {
    console.error("Create Sales Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


const createSalesForAccessory = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user?._id;
    const { items, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      throw new Error("No items provided");
    }

    // Fetch accessory products
    const productIds = items.map(i => i.productId);
    const products = await ProductModel.find({
      _id: { $in: productIds },
      userId,
      type: "ACCESSORY",
      isActive: true
    }).session(session);

    if (!products.length) {
      throw new Error("Accessory products not found");
    }

    // Fetch current stock for all products
    const stocks = await CurrentStock.find({
      userId,
      productId: { $in: productIds }
    }).session(session);

    const stockMap = {};
    stocks.forEach(s => {
      stockMap[s.productId.toString()] = s.quantity;
    });

    // Validate stock availability
    for (const item of items) {
      const availableQty = stockMap[item.productId] || 0;
      if (item.qty > availableQty) {
        throw new Error(`Not enough stock for product ${item.productId}. Available: ${availableQty}, Requested: ${item.qty}`);
      }
    }

    // Create sale
    const invoiceNumber = `INV-${Date.now()}`;
    let totalQty = 0;
    let totalAmount = 0;

    const sales = await SalesModel.create([{
      saleType: "ACCESSORY",
      invoiceNumber,
      totalQty: 0,
      totalAmount: 0,
      paymentMethod: paymentMethod || "CASH",
      userId
    }], { session });

    const saleDoc = sales[0];
    const saleItemsData = [];

    for (const item of items) {
      const product = products.find(p => p._id.toString() === item.productId);
      if (!product) continue;

      const qty = item.qty;
      const price = product.sellingPrice;
      const amount = qty * price;

      totalQty += qty;
      totalAmount += amount;

      saleItemsData.push({
        saleId: saleDoc._id,
        productId: product._id,
        qty,
        price,
        amount,
        userId
      });

      // Update Current Stock
      await CurrentStock.updateOne(
        { userId, productId: product._id },
        { $inc: { quantity: -qty } },
        { session }
      );

      // Update Opening Stock
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;
      const financialYear = `${currentYear}-${nextYear}`;

      let openingStock = await OpeningStockModel.findOne({
        userId,
        productId: product._id,
        financialYear
      }).session(session);

      if (openingStock) {
        openingStock.totalSale += qty;
        openingStock.closingStock -= qty;
        await openingStock.save({ session });
      } else {
        await OpeningStockModel.create([{
          userId,
          productId: product._id,
          financialYear,
          openingStock: 0,
          totalPurchase: 0,
          totalSale: qty,
          closingStock: -qty
        }], { session });
      }
    }

    if (saleItemsData.length === 0) {
      throw new Error("No valid accessory items");
    }

    await SaleItemModel.insertMany(saleItemsData, { session });

    saleDoc.totalQty = totalQty;
    saleDoc.totalAmount = totalAmount;
    await saleDoc.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Accessory sale created successfully",
      data: {
        sales: saleDoc,
        saleItems: saleItemsData
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("Accessory Sales Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


const getSalesList = async (req, res) => {
  try {
    const userId = req.user?._id;
    let { page = 1, limit, search } = req.query;

    page = parseInt(page);
    limit = parseInt(limit) || 10;

    const matchStage = { userId: new mongoose.Types.ObjectId(userId) };

    if (search) {
      matchStage.$or = [
        { invoiceNumber: { $regex: search, $options: "i" } },
        { paymentMethod: { $regex: search, $options: "i" } }
      ];
    }

    const pipeline = [
      { $match: matchStage },

      // Lookup sale items
      {
        $lookup: {
          from: "saleitems",
          localField: "_id",
          foreignField: "saleId",
          as: "saleItems"
        }
      },

      // Lookup product info for each sale item
      {
        $unwind: {
          path: "$saleItems",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "products",
          localField: "saleItems.productId",
          foreignField: "_id",
          as: "saleItems.product"
        }
      },
      {
        $unwind: {
          path: "$saleItems.product",
          preserveNullAndEmptyArrays: true
        }
      },

      // Group back sale items under each sale
      {
        $group: {
          _id: "$_id",
          invoiceNumber: { $first: "$invoiceNumber" },
          totalQty: { $first: "$totalQty" },
          totalAmount: { $first: "$totalAmount" },
          paymentMethod: { $first: "$paymentMethod" },
          userId: { $first: "$userId" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
          saleItems: {
            $push: {
              _id: "$saleItems._id",
              productId: "$saleItems.productId",
              qty: "$saleItems.qty",
              price: "$saleItems.price",
              amount: "$saleItems.amount",
              product: "$saleItems.product"
            }
          }
        }
      },

      { $sort: { createdAt: -1 } },

      // Pagination
      {
        $facet: {
          data: [
            { $skip: (page - 1) * limit },
            { $limit: limit }
          ],
          totalCount: [{ $count: "count" }]
        }
      }
    ];

    const result = await SalesModel.aggregate(pipeline);

    const sales = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: sales
    });

  } catch (error) {
    console.error("Get Sales List Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


module.exports = { createShiftWiseSales, createSalesForAccessory, getSalesList }