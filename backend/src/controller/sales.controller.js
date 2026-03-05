const mongoose = require("mongoose")
const SaleItemModel = require("../model/saleItem.model")
const SalesModel = require("../model/sales.model")

const ShiftModel = require("../model/shiftModel")
const NozzleModel = require("../model/nozzel.model")
const MeterReadingModel = require("../model/meterReading.model")
const ProductModel = require("../model/product.model")
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
  try {
    const userId = req.user?._id;

    // Validate input
    const parsedData = req.body;
    const { items, paymentMethod } = parsedData;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No items provided"
      });
    }

    // Find user's OPEN shift
    const shift = await ShiftModel.findOne({
      userId,
      status: "OPEN"
    });

    if (!shift) {
      return res.status(400).json({
        success: false,
        message: "No open shift found for this user"
      });
    }

    // Fetch products
    const productIds = items.map(i => i.productId);
    const products = await ProductModel.find({
      _id: { $in: productIds },
      userId,
      type: "ACCESSORY",
      isActive: true
    });

    if (!products.length) {
      return res.status(400).json({
        success: false,
        message: "Accessory products not found"
      });
    }

    // Create sale
    const invoiceNumber = `INV-${Date.now()}`;
    let totalQty = 0;
    let totalAmount = 0;

    const sales = await SalesModel.create({
      shiftId: shift._id,
      workerId: shift.workerId,
      saleType: "ACCESSORY",
      invoiceNumber,
      totalQty: 0,
      totalAmount: 0,
      paymentMethod: paymentMethod || "CASH",
      userId
    });

    const saleItems = [];

    for (const item of items) {
      const product = products.find(p => p._id.toString() === item.productId);
      if (!product) continue;

      const qty = item.qty;
      const price = product.sellingPrice;
      const amount = qty * price;

      totalQty += qty;
      totalAmount += amount;

      saleItems.push({
        saleId: sales._id,
        productId: product._id,
        qty,
        price,
        amount,
        userId
      });
    }

    if (saleItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid accessory items"
      });
    }

    await SaleItemModel.insertMany(saleItems);

    sales.totalQty = totalQty;
    sales.totalAmount = totalAmount;
    await sales.save();

    return res.status(200).json({
      success: true,
      message: "Accessory sale created successfully",
      data: {
        sales,
        saleItems
      }
    });

  } catch (error) {
    console.error("Accessory Sales Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = { createShiftWiseSales, createSalesForAccessory }