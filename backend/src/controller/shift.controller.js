const mongoose = require("mongoose");
const ShiftModel = require("../model/shiftModel")
const WorkerModel = require("../model/worker.model");
const NozzleModel = require("../model/nozzel.model");
const { closeShiftMultipleReadingsSchema } = require("../schema/shiftSchema")
const MeterReadingModel = require("../model/meterReading.model")
const { z } = require("zod");
const { createShiftSchema } = require("../schema/shiftSchema");
const TankModel = require("../model/tank.model")
const SalesModel = require("../model/sales.model")
const ProductModel = require("../model/product.model")
const SaleItemModel = require("../model/saleItem.model")
const CurrentStockModel = require("../model/currentStock.model")
const OpningStockModle = require("../model/opningStock.model")
const AccountHead = require("../model/accountHead.model")
const Transaction = require("../model/transaction.model")

const DEFAULT_PAGE_SIZE = parseInt(process.env.DEFAULT_PAGE_SIZE) || 10;

const getFinancialYear = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = Jan

  if (month >= 3) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
};

const createShift = async (req, res) => {
  try {
    const validatedData = createShiftSchema.parse(req.body);

    const userId = req.user?._id;
    const { workerId, nozzles = [] } = validatedData;

    const worker = await WorkerModel.findOne({
      _id: workerId,
      createdBy: userId
    });

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found"
      });
    }

    const existingShift = await ShiftModel.findOne({
      workerId,
      status: "OPEN"
    });

    if (existingShift) {
      return res.status(400).json({
        success: false,
        message: "Worker already has an open shift"
      });
    }

    let nozzleIds = [];

    console.log("Worker Type:", nozzleIds);

    if (worker.workerType === "NOZZLE_BOY") {

      if (!nozzles || nozzles.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Nozzles are required for nozzle boy"
        });
      }

      const missingReading = nozzles.find(n => n.openingReading === undefined);

      if (missingReading) {
        return res.status(400).json({
          success: false,
          message: "Opening reading required for each nozzle"
        });
      }

      nozzleIds = nozzles.map(n => n.nozzleId);


      const validNozzles = await NozzleModel.find({
        _id: { $in: nozzleIds },
        userId
      });

      if (validNozzles.length !== nozzleIds.length) {
        return res.status(400).json({
          success: false,
          message: "Some nozzleIds are invalid"
        });
      }


      const nozzleInUse = await ShiftModel.findOne({
        nozzleIds: { $in: nozzleIds },
        status: "OPEN"
      });

      if (nozzleInUse) {
        return res.status(400).json({
          success: false,
          message: "One or more nozzles already assigned"
        });
      }

    }


    const shift = await ShiftModel.create({
      workerId,
      nozzleIds,
      userId,
      status: "OPEN",
      shiftStart: new Date()
    });


    if (worker.workerType === "NOZZLE_BOY") {

      const meterReadings = nozzles.map(n => ({
        shiftId: shift._id,
        nozzleId: n.nozzleId,
        openingReading: n.openingReading,
        userId
      }));

      await MeterReadingModel.insertMany(meterReadings);
    }

    return res.status(200).json({
      success: true,
      message: "Shift started successfully",
      data: shift
    });

  } catch (error) {
    console.error("Create Shift Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getAllShifts = async (req, res) => {
  try {

    const userId = req.user._id;

    let { page = 1, limit, search } = req.query;

    page = parseInt(page);
    limit = parseInt(limit) || DEFAULT_PAGE_SIZE;

    const pipeline = [

      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId)
        }
      },

      // Worker Lookup
      {
        $lookup: {
          from: "workers",
          localField: "workerId",
          foreignField: "_id",
          as: "worker"
        }
      },

      { $unwind: { path: "$worker", preserveNullAndEmptyArrays: true } },

      // Nozzle Lookup
      {
        $lookup: {
          from: "nozzles",
          localField: "nozzleIds",
          foreignField: "_id",
          as: "nozzles"
        }
      },

      { $unwind: { path: "$nozzles", preserveNullAndEmptyArrays: true } },

      // Tank Lookup
      {
        $lookup: {
          from: "tanks",
          localField: "nozzles.tankId",
          foreignField: "_id",
          as: "tank"
        }
      },

      { $unwind: { path: "$tank", preserveNullAndEmptyArrays: true } },

      // Product Lookup
      {
        $lookup: {
          from: "products",
          localField: "tank.productId",
          foreignField: "_id",
          as: "product"
        }
      },

      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },

      // Meter Reading Lookup
      {
        $lookup: {
          from: "meterreadings",
          let: {
            shiftId: "$_id",
            nozzleId: "$nozzles._id"
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$shiftId", "$$shiftId"] },
                    { $eq: ["$nozzleId", "$$nozzleId"] }
                  ]
                }
              }
            }
          ],
          as: "meterReading"
        }
      },

      { $unwind: { path: "$meterReading", preserveNullAndEmptyArrays: true } },

      // Search Filter
      ...(search
        ? [{
          $match: {
            $or: [
              { "worker.name": { $regex: search, $options: "i" } },
              { "nozzles.nozzleNumber": { $regex: search, $options: "i" } },
              { "product.name": { $regex: search, $options: "i" } },
              { status: { $regex: search, $options: "i" } }
            ]
          }
        }]
        : []),

      // Group Data
      {
        $group: {

          _id: "$_id",

          shiftStart: { $first: "$shiftStart" },
          shiftEnd: { $first: "$shiftEnd" },
          status: { $first: "$status" },
          createdAt: { $first: "$createdAt" },

          worker: { $first: "$worker" },

          // Calculate shift duration in seconds
          shiftDurationSeconds: {
            $first: {
              $dateDiff: {
                startDate: "$shiftStart",
                endDate: { $ifNull: ["$shiftEnd", "$$NOW"] },
                unit: "second"
              }
            }
          },

          nozzles: {
            $push: {

              _id: "$nozzles._id",
              nozzleName: "$nozzles.nozzleNumber",

              tank: {
                _id: "$tank._id",
                name: "$tank.name",
                quantity: "$tank.quantity"
              },

              product: {
                _id: "$product._id",
                name: "$product.name",
                sellingPrice: "$product.sellingPrice",
                costPrice: "$product.costPrice"
              },

              meterReading: {

                _id: "$meterReading._id",

                openingReading: "$meterReading.openingReading",
                closingReading: "$meterReading.closingReading",

                totalLitres: "$meterReading.totalLitres",

                totalSale: {
                  $cond: [
                    {
                      $and: [
                        { $ifNull: ["$meterReading.closingReading", false] },
                        { $ifNull: ["$meterReading.openingReading", false] }
                      ]
                    },
                    {
                      $subtract: [
                        "$meterReading.closingReading",
                        "$meterReading.openingReading"
                      ]
                    },
                    0
                  ]
                }

              }

            }
          }

        }
      },

      // Add Shift Duration Field
      {
        $addFields: {

          shiftEnd: {
            $cond: [
              { $eq: ["$status", "CLOSED"] },
              "$shiftEnd",
              null
            ]
          },

          shiftDuration: {
            $cond: [

              { $eq: ["$status", "CLOSED"] },

              {
                $switch: {

                  branches: [

                    {
                      case: { $lt: ["$shiftDurationSeconds", 60] },
                      then: {
                        value: "$shiftDurationSeconds",
                        unit: "seconds"
                      }
                    },

                    {
                      case: { $lt: ["$shiftDurationSeconds", 3600] },
                      then: {
                        value: {
                          $floor: {
                            $divide: ["$shiftDurationSeconds", 60]
                          }
                        },
                        unit: "minutes"
                      }
                    }

                  ],

                  default: {
                    value: {
                      $floor: {
                        $divide: ["$shiftDurationSeconds", 3600]
                      }
                    },
                    unit: "hours"
                  }

                }
              },

              null

            ]
          }

        }
      },

      // Remove helper field
      {
        $project: {
          shiftDurationSeconds: 0
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

          totalCount: [
            { $count: "count" }
          ]

        }
      }

    ];

    const result = await ShiftModel.aggregate(pipeline);

    const shifts = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: shifts
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};


const getShiftById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shift ID",
      });
    }

    const shift = await ShiftModel.aggregate([

      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
        },
      },


      {
        $lookup: {
          from: "workers",
          localField: "workerId",
          foreignField: "_id",
          as: "worker",
        },
      },
      {
        $unwind: {
          path: "$worker",
          preserveNullAndEmptyArrays: true,
        },
      },


      {
        $lookup: {
          from: "nozzles",
          localField: "nozzleIds",
          foreignField: "_id",
          as: "nozzles",
        },
      },


      {
        $project: {
          _id: 1,
          shiftStart: 1,
          shiftEnd: 1,
          status: 1,
          cashCollected: 1,
          onlineCollected: 1,
          createdAt: 1,
          updatedAt: 1,

          worker: {
            _id: "$worker._id",
            name: "$worker.name",
            phone: "$worker.phone",
          },

          nozzles: {
            $map: {
              input: "$nozzles",
              as: "nz",
              in: {
                _id: "$$nz._id",
                nozzleNumber: "$$nz.nozzleNumber",
                fuelType: "$$nz.fuelType",
                status: "$$nz.status",
                currentReading: "$$nz.currentReading",
              },
            },
          },
        },
      },
    ]);


    if (!shift || shift.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Shift not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: shift[0],
    });
  } catch (error) {
    console.error("Get Shift Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const closeShift = async (req, res) => {

  const MAX_RETRY = 3;
  let attempt = 0;

  while (attempt < MAX_RETRY) {

    const session = await mongoose.startSession();
    session.startTransaction();

    try {

      const validatedData = closeShiftMultipleReadingsSchema.parse(req.body);
      const { shiftId, readings } = validatedData;
      const userId = req.user?._id;

      const shift = await ShiftModel.findOne({
        _id: shiftId,
        status: "OPEN",
        userId
      }).session(session);

      if (!shift) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: "Open shift not found"
        });
      }

      const worker = await WorkerModel.findById(shift.workerId).session(session);

      if (!worker) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: "Worker not found"
        });
      }

      const tankUsage = {};
      const nozzleUsage = {};

      // -----------------------------
      // METER READINGS
      // -----------------------------

      if (worker.workerType === "NOZZLE_BOY" && readings?.length) {

        const nozzleIds = readings.map(r => r.nozzleId);

        const nozzles = await NozzleModel.find({
          _id: { $in: nozzleIds }
        }).select("tank").session(session);

        const nozzleMap = {};
        nozzles.forEach(n => {
          nozzleMap[n._id.toString()] = n;
        });

        for (const r of readings) {

          let meterReading = r.readingId
            ? await MeterReadingModel.findById(r.readingId).session(session)
            : null;

          let openingReading = 0;

          if (!meterReading) {

            const lastReading = await MeterReadingModel.findOne({
              nozzleId: r.nozzleId
            }).sort({ createdAt: -1 }).session(session);

            openingReading = lastReading?.closingReading || 0;

            meterReading = new MeterReadingModel({
              shiftId: shift._id,
              nozzleId: r.nozzleId,
              openingReading,
              closingReading: r.closingReading,
              totalLitres: r.closingReading - openingReading,
              userId
            });

            await meterReading.save({ session });

          } else {

            const totalLitres =
              r.closingReading - meterReading.openingReading;

            await MeterReadingModel.updateOne(
              { _id: meterReading._id },
              {
                $set: {
                  closingReading: r.closingReading,
                  totalLitres
                }
              },
              { session }
            );

            meterReading.totalLitres = totalLitres;
          }

          const nozzle = nozzleMap[r.nozzleId];

          if (!nozzle) continue;

          const tankId = nozzle.tank.toString();

          if (!tankUsage[tankId]) tankUsage[tankId] = 0;

          tankUsage[tankId] += meterReading.totalLitres;

          nozzleUsage[r.nozzleId] = meterReading.totalLitres;
        }
      }

      const tankIds = Object.keys(tankUsage);

      const tanks = await TankModel.find({
        _id: { $in: tankIds }
      }).session(session);

      for (const tank of tanks) {

        const used = tankUsage[tank._id.toString()];

        if (tank.currentQuantity - used < 0) {
          await session.abortTransaction();
          session.endSession();

          return res.status(400).json({
            success: false,
            message: `Not enough fuel in tank ${tank.tankName}`
          });
        }
      }

      // -----------------------------
      // PRODUCTS
      // -----------------------------

      const products = await ProductModel.find({
        tankIds: { $in: tankIds },
        type: "FUEL",
        userId
      }).session(session);

      const invoiceNumber = `INV-${Date.now()}`;

      const [saleDoc] = await SalesModel.create([{
        shiftId,
        workerId: shift.workerId,
        saleType: "FUEL",
        invoiceNumber,
        totalQty: 0,
        totalAmount: 0,
        userId
      }], { session });

      let totalQty = 0;
      let totalAmount = 0;

      const saleItems = [];
      const productUsage = {};

      for (const nozzleId in nozzleUsage) {

        const litres = nozzleUsage[nozzleId];

        const nozzle = await NozzleModel.findById(nozzleId)
          .select("tank")
          .session(session);

        if (!nozzle) continue;

        const product = products.find(p =>
          p.tankIds.some(t => t.toString() === nozzle.tank.toString())
        );

        if (!product) continue;

        const price = product.sellingPrice;
        const amount = litres * price;

        totalQty += litres;
        totalAmount += amount;

        const productId = product._id.toString();

        if (!productUsage[productId]) {
          productUsage[productId] = 0;
        }

        productUsage[productId] += litres;

        saleItems.push({
          saleId: saleDoc._id,
          productId: product._id,
          nozzleId,
          qty: litres,
          price,
          amount,
          userId
        });
      }

      if (saleItems.length) {
        await SaleItemModel.insertMany(saleItems, { session });
      }

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

      // -----------------------------
      // STOCK UPDATE
      // -----------------------------

      for (const productId in productUsage) {

        const usedQty = productUsage[productId];

        await CurrentStockModel.updateOne(
          { userId, productId },
          { $inc: { quantity: -usedQty } },
          { session }
        );

        const financialYear = getFinancialYear();

        const openingStock = await OpningStockModle.findOne({
          userId,
          productId,
          financialYear
        }).session(session);

        if (openingStock) {

          await OpningStockModle.updateOne(
            { _id: openingStock._id },
            {
              $inc: {
                totalSale: usedQty,
                closingStock: -usedQty
              }
            },
            { session }
          );

        } else {

          await OpningStockModle.create([{
            userId,
            productId,
            financialYear,
            openingStock: 0,
            totalPurchase: 0,
            totalSale: usedQty,
            closingStock: usedQty
          }], { session });

        }
      }

      // -----------------------------
      // ACCOUNT TRANSACTION
      // -----------------------------

      const fuelSalesHead = await AccountHead.findOne({
        userId,
        name: "Fuel Sales",
        type: "INCOME"
      }).session(session);

      if (fuelSalesHead) {

        await Transaction.create([{
          userId,
          accountHead: fuelSalesHead._id,
          amount: totalAmount,
          type: "INCOME",
          paymentMethod: "CASH",
          note: `Fuel sale invoice ${invoiceNumber}`,
          transactionDate: new Date()
        }], { session });

      }

      // -----------------------------
      // REDUCE TANK QUANTITY
      // -----------------------------

      for (const tank of tanks) {

        const used = tankUsage[tank._id.toString()];

        await TankModel.updateOne(
          { _id: tank._id },
          { $inc: { currentQuantity: -used } },
          { session }
        );
      }

      // -----------------------------
      // CLOSE SHIFT
      // -----------------------------

      await ShiftModel.updateOne(
        { _id: shift._id },
        {
          $set: {
            status: "CLOSED",
            shiftEnd: new Date()
          }
        },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({
        success: true,
        message: "Shift closed successfully",
        data: {
          shiftId,
          sales: {
            ...saleDoc.toObject(),
            totalQty,
            totalAmount
          },
          saleItems
        }
      });

    } catch (error) {

      await session.abortTransaction();
      session.endSession();

      if (error.code === 112 && attempt < MAX_RETRY) {
        attempt++;
        continue;
      }

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          errors: error.errors
        });
      }

      console.error("Close Shift Error:", error);

      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};

module.exports = { createShift, getAllShifts, getShiftById, closeShift };