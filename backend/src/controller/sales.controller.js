
const SaleItemModel = require("../model/saleItem.model")
const SalesModel = require("../model/sales.model")

const ShiftModel = require("../model/shiftModel")
const NozzleModel = require("../model/nozzel.model")
const MeterReadingModel = require("../model/meterReading.model")
const ProductModel = require("../model/product.model")
const {createAccessorySaleSchema} = require("../schema/saleSchema")

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
        message: "Shift not found"
      });
    }

    
    const nozzles = await NozzleModel.find({
      _id: { $in: shift.nozzleIds },
      userId
    }).select("_id nozzleNumber tank");

    if (!nozzles.length) {
      return res.status(400).json({
        success: false,
        message: "Nozzles not found for this shift"
      });
    }

   
    const tankIds = [...new Set(nozzles.map(n => n.tank.toString()))];

   
    const products = await ProductModel.find({
      tankIds: { $in: tankIds },
      userId,
      type: "FUEL",
      isActive: true
    });

    
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

      const nozzle = nozzles.find(n => n._id.toString() === reading._id.toString());
      if (!nozzle) continue;

      const product = products.find(p =>
        p.tankIds.some(t => t.toString() === nozzle.tank.toString())
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
      data: {
        sales,
        saleItems
      }
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
    
    const parsedData = createAccessorySaleSchema.parse(req.body);

    const { shiftId, items, paymentMethod } = parsedData;

    /*
      items example
      [
        { productId: "...", qty: 2 },
        { productId: "...", qty: 1 }
      ]
    */

    const shift = await ShiftModel.findOne({
      _id: shiftId,
      userId,
      status: "OPEN"
    });

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Shift not found or not open"
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No items provided"
      });
    }

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

    const invoiceNumber = `INV-${Date.now()}`;

    let totalQty = 0;
    let totalAmount = 0;

    const sales = await SalesModel.create({
      shiftId,
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

      const product = products.find(
        p => p._id.toString() === item.productId
      );

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

module.exports = {createShiftWiseSales,createSalesForAccessory}