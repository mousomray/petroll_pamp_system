const FinancialYear = require("../model/financialYear.model.js");
const { createFinancialYearSchema, updateFinancialYearSchema } = require("../schema/financialYear.schema.js");


const createFinancialYear = async (req, res) => {
    try {
        const parsed = createFinancialYearSchema.parse(req.body);
        const { name, startDate, endDate, isActive } = parsed;
        const userId = req.user._id;
        if (isActive) {
            await FinancialYear.updateMany(
                { userId, isActive: true },
                { isActive: false }
            );
        }
        const financialYear = await FinancialYear.create({
            userId,
            name,
            startDate,
            endDate,
            isActive: isActive || false
        });
        res.status(201).json({
            success: true,
            message: "Financial Year created successfully",
            data: financialYear
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const getFinancialYears = async (req, res) => {
  try {
    const userId = req.user._id;

    const page = parseInt(req.query.page) || 1;
    const limit =
      parseInt(req.query.limit) ||
      parseInt(process.env.DEFAULT_PAGE_SIZE) ||
      10;

    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    const filter = { userId };
    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const totalRecords = await FinancialYear.countDocuments(filter);
    const totalPages = Math.ceil(totalRecords / limit);

    const years = await FinancialYear.find(filter)
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      page,
      totalPages,
      totalRecords,
      financialYears: years,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getActiveFinancialYear = async (req, res) => {
  try {
    const userId = req.user._id;

    const page = parseInt(req.query.page) || 1;
    const limit =
      parseInt(req.query.limit) ||
      parseInt(process.env.DEFAULT_PAGE_SIZE) ||
      10;

    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    const filter = {
      userId,
      isActive: true,
    };

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const totalRecords = await FinancialYear.countDocuments(filter);
    const totalPages = Math.ceil(totalRecords / limit);

    const activeYears = await FinancialYear.find(filter)
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      page,
      totalPages,
      totalRecords,
      financialYears: activeYears,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateFinancialYear = async (req, res) => {
    try {
        const parsed = updateFinancialYearSchema.parse(req.body);

        const { id } = req.params;
        const userId = req.user._id;
        if (parsed.isActive === true) {
            await FinancialYear.updateMany(
                { userId, isActive: true },
                { isActive: false }
            );
        }
        const updated = await FinancialYear.findOneAndUpdate(
            { _id: id, userId },
            parsed,
            { new: true }
        );
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Financial Year not found"
            });
        }
       return res.json({
            success: true,
            message: "Financial Year updated",
            data: updated
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const deleteFinancialYear = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const deleted = await FinancialYear.findOneAndDelete({
            _id: id,
            userId
        });

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Financial Year not found"
            });
        }

       return res.json({
            success: true,
            message: "Financial Year deleted successfully"
        });

    } catch (error) {
       return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getSingleFinancialYear = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const financialYear = await FinancialYear.findOne({
      _id: id,
      userId,
    });

    if (!financialYear) {
      return res.status(404).json({
        success: false,
        message: "Financial Year not found",
      });
    }

    return res.status(200).json({
      success: true,
      financialYear: financialYear,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
    createFinancialYear,
    getFinancialYears,
    getActiveFinancialYear,
    getSingleFinancialYear, 
    updateFinancialYear,
    deleteFinancialYear
};