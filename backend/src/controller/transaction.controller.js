const mongoose = require("mongoose");
const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer-core");
const Transaction = require('../model/transaction.model');
const AccountHead = require("../model/accountHead.model");

const createTransaction = async (req, res) => {
  try {

    const userId = req.user._id;

    const {
      accountHead,
      amount,
      type,
      paymentMethod,
      note,
      transactionDate
    } = req.body;

    // =========================
    // VALIDATION
    // =========================

    if (!accountHead || !amount || !type) {
      return res.status(400).json({
        success: false,
        message: "accountHead, amount and type are required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(accountHead)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account head id"
      });
    }

    const accountHeadExists = await AccountHead.findById(accountHead);

    if (!accountHeadExists) {
      return res.status(404).json({
        success: false,
        message: "Account head not found"
      });
    }

    // =========================
    // CREATE TRANSACTION
    // =========================

    const transaction = await Transaction.create({

      userId,
      accountHead,
      amount,
      type,
      paymentMethod,
      note,
      transactionDate

    });

    return res.status(201).json({

      success: true,
      message: "Transaction created successfully",
      data: transaction

    });

  } catch (error) {

    console.log("Error in createTransaction:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

const getTransactions = async (req, res) => {
  try {

    const userId = req.user._id;

    let {
      page = 1,
      limit = process.env.DEFAULT_PAGE_SIZE || 10,
      type,
      paymentMethod,
      search,
      startDate,
      endDate,
      year,
      month,
      day,
      pdf
    } = req.query;

    page = Number(page);
    limit = Number(limit);

    const skip = (page - 1) * limit;
    const isPdf = pdf === "true";

    // =========================
    // MATCH STAGE
    // =========================

    const matchStage = {
      userId: new mongoose.Types.ObjectId(userId)
    };

    if (type) matchStage.type = type;
    if (paymentMethod) matchStage.paymentMethod = paymentMethod;

    // =========================
    // DATE FILTER
    // =========================

    if (year) {
      matchStage.transactionDate = {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`)
      };
    }

    if (month && year) {
      matchStage.transactionDate = {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0, 23, 59, 59)
      };
    }

    if (day && month && year) {
      matchStage.transactionDate = {
        $gte: new Date(year, month - 1, day),
        $lte: new Date(year, month - 1, day, 23, 59, 59)
      };
    }

    if (startDate || endDate) {

      matchStage.transactionDate = {};

      if (startDate)
        matchStage.transactionDate.$gte = new Date(startDate);

      if (endDate)
        matchStage.transactionDate.$lte = new Date(endDate);

    }

    // =========================
    // PIPELINE
    // =========================

    const pipeline = [

      { $match: matchStage },

      {
        $lookup: {
          from: "accountheads",
          localField: "accountHead",
          foreignField: "_id",
          as: "accountHead"
        }
      },

      { $unwind: "$accountHead" }

    ];

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
          accountHeadName: "$accountHead.name"
        }
      },
      { $sort: { transactionDate: -1 } }
    );

    if (!isPdf) {
      pipeline.push({ $skip: skip }, { $limit: limit });
    }

    const transactions = await Transaction.aggregate(pipeline);

    // =========================
    // SUMMARY CALCULATION
    // =========================

    const summaryPipeline = [

      { $match: matchStage },

      {
        $group: {
          _id: "$type",
          totalAmount: { $sum: "$amount" }
        }
      }

    ];

    const summary = await Transaction.aggregate(summaryPipeline);

    let totalCredit = 0;
    let totalDebit = 0;

    summary.forEach(item => {

      if (item._id === "INCOME" || item._id === "DEBIT") {
        totalDebit = item.totalAmount;
      }

      if (item._id === "EXPENSE" || item._id === "CREDIT") {
        totalCredit = item.totalAmount;
      }

    });

    const totalCount = Array.isArray(transactions) ? transactions.length : 0;
    const totalAmount = (Number(totalCredit) || 0) + (Number(totalDebit) || 0);
    const netBalance = (Number(totalDebit) || 0) - (Number(totalCredit) || 0);

    // =========================
    // PDF GENERATION
    // =========================

    if (isPdf) {

      const html = await ejs.renderFile(

        path.join(process.cwd(), "src/views/transactionReport.ejs"),

        {
          transactions,
          totalCount,
          totalAmount,
          totalCredit,
          totalDebit,
          netBalance
        }

      );

      const browser = await puppeteer.launch({

        headless: true,
        executablePath: process.env.CHROME_PATH

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
        "Content-Disposition": "inline; filename=transaction_report.pdf",
        "Content-Length": pdfBuffer.length

      });

      return res.send(pdfBuffer);

    }

    // =========================
    // NORMAL RESPONSE
    // =========================

    const total = await Transaction.countDocuments(matchStage);

    return res.status(200).json({

      success: true,

      summary: {
        totalCredit,
        totalDebit,
        netBalance
      },

      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },

      data: transactions

    });

  } catch (error) {

    console.log("Error in getTransactions:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

module.exports = {
  getTransactions,
  createTransaction
};