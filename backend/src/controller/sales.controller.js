const mongoose = require("mongoose")
const SaleItemModel = require("../model/saleItem.model")
const SalesModel = require("../model/sales.model")
const ShiftModel = require("../model/shiftModel")
const NozzleModel = require("../model/nozzel.model")
const MeterReadingModel = require("../model/meterReading.model")
const ProductModel = require("../model/product.model")
const OpeningStockModel = require("../model/opningStock.model")
const CurrentStock = require("../model/currentStock.model")
const AccountHead = require("../model/accountHead.model")
const TransactionModel = require("../model/transaction.model")
const { createAccessorySaleSchema } = require("../schema/saleSchema")
const puppeteer = require("puppeteer-core");
const path = require("path");
const ejs = require("ejs");


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

    const getFinancialYear = () => {

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();

      if (month < 3) {
        return `${year - 1}-${year}`;
      }

      return `${year}-${year + 1}`;
    };

    const userId = req.user?._id;
    const { items, paymentMethod, workerId } = req.body;

    if (!items || items.length === 0) {
      throw new Error("No items provided");
    }

    const productIds = items.map(i => i.productId);

    const products = await ProductModel.find({
      _id: { $in: productIds },
      userId,
      type: "ACCESSORY",
      isActive: true
    }).session(session);

    const stocks = await CurrentStock.find({
      userId,
      productId: { $in: productIds }
    }).session(session);

    const stockMap = {};
    stocks.forEach(s => {
      stockMap[s.productId.toString()] = s.quantity;
    });

    // =====================
    // STOCK VALIDATION
    // =====================

    for (const item of items) {

      const availableQty = stockMap[item.productId] || 0;

      if (item.qty > availableQty) {
        throw new Error(
          `Not enough stock for product ${item.productId}. Available: ${availableQty}`
        );
      }
    }

    const invoiceNumber = `INV-${Date.now()}`;

    let totalQty = 0;
    let totalAmount = 0;

    const financialYear = getFinancialYear();

    const [saleDoc] = await SalesModel.create([{
      saleType: "ACCESSORY",
      invoiceNumber,
      totalQty: 0,
      totalAmount: 0,
      paymentMethod: paymentMethod || "CASH",
      workerId: workerId || null,
      userId
    }], { session });

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

      // =====================
      // UPDATE CURRENT STOCK
      // =====================

      await CurrentStock.updateOne(
        { userId, productId: product._id },
        { $inc: { quantity: -qty } },
        { session }
      );

      const currentStock = stockMap[item.productId];

      const openingStock = await OpeningStockModel.findOne({
        userId,
        productId: product._id,
        financialYear
      }).session(session);

      if (openingStock) {

        await OpeningStockModel.updateOne(
          { _id: openingStock._id },
          {
            $inc: {
              totalSale: qty,
              closingStock: -qty
            }
          },
          { session }
        );

      } else {

        const openingQty = currentStock;

        const closingQty = openingQty - qty;

        await OpeningStockModel.create([{

          userId,
          productId: product._id,
          financialYear,
          openingStock: openingQty,
          totalPurchase: 0,
          totalSale: qty,
          closingStock: closingQty < 0 ? 0 : closingQty

        }], { session });

      }

    }

    if (saleItemsData.length === 0) {
      throw new Error("No valid accessory items");
    }

    await SaleItemModel.insertMany(saleItemsData, { session });

    await SalesModel.updateOne(
      { _id: saleDoc._id },
      {
        $set: {
          totalQty,
          totalAmount
        }
      },
      { session }
    );

    // =====================
    // TRANSACTION ENTRY
    // =====================

    const accessorySalesHead = await AccountHead.findOne({
      userId,
      name: "Accessory Sales",
      type: "INCOME"
    }).session(session);

    if (accessorySalesHead) {

      await TransactionModel.create([{

        userId,
        workerId: workerId || null,
        accountHead: accessorySalesHead._id,
        amount: totalAmount,
        type: "INCOME",
        paymentMethod: paymentMethod || "CASH",
        note: `Accessory sale invoice ${invoiceNumber}`,
        transactionDate: new Date()

      }], { session });

    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Accessory sale created successfully",
      data: {
        sales: {
          ...saleDoc.toObject(),
          totalQty,
          totalAmount
        },
        saleItems: saleItemsData
      }
    });

  }

  catch (error) {

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

    const userId = new mongoose.Types.ObjectId(req.user._id);

    let { page = 1, limit, search, year, month, pdf } = req.query;

    page = parseInt(page);
    limit = parseInt(limit) || 10;

    const skip = (page - 1) * limit;

    const isPdf = pdf === "true";

    // =============================
    // MATCH STAGE
    // =============================

    const matchStage = { userId };

    if (search) {
      matchStage.$or = [
        { invoiceNumber: { $regex: search, $options: "i" } },
        { paymentMethod: { $regex: search, $options: "i" } }
      ];
    }

    // Year filter
    if (year) {

      const start = new Date(`${year}-01-01`);
      const end = new Date(`${year}-12-31`);

      matchStage.createdAt = { $gte: start, $lte: end };
    }

    // Month filter
    if (month && year) {

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      matchStage.createdAt = { $gte: startDate, $lte: endDate };
    }

    // =============================
    // PIPELINE
    // =============================

    const pipeline = [

      { $match: matchStage },

      // sale items lookup
      {
        $lookup: {
          from: "saleitems",
          localField: "_id",
          foreignField: "saleId",
          as: "saleItems"
        }
      },

      {
        $unwind: {
          path: "$saleItems",
          preserveNullAndEmptyArrays: true
        }
      },

      // product lookup
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

      // group
      {
        $group: {

          _id: "$_id",

          invoiceNumber: { $first: "$invoiceNumber" },

          totalQty: { $first: "$totalQty" },

          totalAmount: { $first: "$totalAmount" },

          paymentMethod: { $first: "$paymentMethod" },

          createdAt: { $first: "$createdAt" },

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

      { $sort: { createdAt: -1 } }

    ];

    // =============================
    // PAGINATION (only normal API)
    // =============================

    if (!isPdf) {

      pipeline.push({

        $facet: {

          data: [

            { $skip: skip },

            { $limit: limit }

          ],

          totalCount: [

            { $count: "count" }

          ]

        }

      });

    }

    const result = await SalesModel.aggregate(pipeline).exec();

    // =============================
    // PDF GENERATE
    // =============================

    if (isPdf) {

      const sales = result;

      const html = await ejs.renderFile(

        path.join(process.cwd(), "src", "views", "salesReport.ejs"),

        { sales }

      );

      const browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.CHROME_PATH || undefined
      });

      const page = await browser.newPage();

      await page.setContent(html, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({

        format: "A4",

        printBackground: true

      });

      await browser.close();

      res.set({

        "Content-Type": "application/pdf",

        "Content-Disposition": "inline; filename=sales_report.pdf",

        "Content-Length": pdfBuffer.length

      });

      return res.send(pdfBuffer);

    }

    // =============================
    // NORMAL RESPONSE
    // =============================

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

const generateSalesInvoice = async (req, res) => {
  try {

    const userId = new mongoose.Types.ObjectId(req.user._id);
    const saleId = new mongoose.Types.ObjectId(req.params.id);

    const pipeline = [

      {
        $match: {
          _id: saleId,
          userId
        }
      },

      // ======================
      // SHIFT
      // ======================

      {
        $lookup: {
          from: "shifts",
          localField: "shiftId",
          foreignField: "_id",
          as: "shift"
        }
      },

      { $unwind: { path: "$shift", preserveNullAndEmptyArrays: true } },

      // ======================
      // FINAL WORKER ID
      // ======================

      {
        $addFields: {
          finalWorkerId: {
            $ifNull: ["$shift.workerId", "$workerId"]
          }
        }
      },

      // ======================
      // WORKER
      // ======================

      {
        $lookup: {
          from: "workers",
          localField: "finalWorkerId",
          foreignField: "_id",
          as: "worker"
        }
      },

      { $unwind: { path: "$worker", preserveNullAndEmptyArrays: true } },

      // ======================
      // SALE ITEMS
      // ======================

      {
        $lookup: {
          from: "saleitems",
          let: { saleId: "$_id" },
          pipeline: [

            {
              $match: {
                $expr: { $eq: ["$saleId", "$$saleId"] }
              }
            },

            // PRODUCT
            {
              $lookup: {
                from: "products",
                localField: "productId",
                foreignField: "_id",
                as: "product"
              }
            },

            { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },

            // NOZZLE
            {
              $lookup: {
                from: "nozzles",
                localField: "nozzleId",
                foreignField: "_id",
                as: "nozzle"
              }
            },

            { $unwind: { path: "$nozzle", preserveNullAndEmptyArrays: true } },

            // AMOUNT CALCULATION
            {
              $addFields: {
                amount: {
                  $cond: [
                    { $gt: ["$litres", 0] },
                    { $multiply: ["$litres", "$pricePerLitre"] },
                    { $multiply: ["$qty", "$price"] }
                  ]
                }
              }
            },

            {
              $project: {
                productName: "$product.name",
                productType: "$product.type",
                qty: 1,
                litres: 1,
                price: 1,
                pricePerLitre: 1,
                amount: 1,
                nozzleNumber: "$nozzle.nozzleNumber"
              }
            }

          ],
          as: "items"
        }
      },

      // ======================
      // TOTAL SALE
      // ======================

      {
        $addFields: {
          workerTotalSale: { $sum: "$items.amount" }
        }
      },

      // ======================
      // FINAL RESPONSE
      // ======================

      {
        $project: {

          invoiceNumber: 1,
          createdAt: 1,

          workerId: "$finalWorkerId",

          worker: {
            name: "$worker.name",
            phone: "$worker.phone",
            workerType: "$worker.workerType"
          },

          shiftStart: "$shift.shiftStart",
          shiftEnd: "$shift.shiftEnd",

          workerTotalSale: 1,

          items: 1
        }
      }

    ];

    const result = await SalesModel.aggregate(pipeline);

    if (!result.length) {
      return res.status(404).json({
        success: false,
        message: "Sales not found"
      });
    }

    const sale = result[0];

    // =========================
    // RENDER EJS TEMPLATE
    // =========================

    const html = await ejs.renderFile(
      path.join(__dirname, "../views/salesDetails.ejs"),
      { sale }
    );

    // =========================
    // GENERATE PDF
    // =========================

    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.CHROME_PATH || undefined
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0"
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=invoice-${sale.invoiceNumber}.pdf`
    });

    res.send(pdf);

  } catch (error) {

    console.error("Generate Sales Invoice Error:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};


module.exports = { createShiftWiseSales, createSalesForAccessory, getSalesList, generateSalesInvoice }