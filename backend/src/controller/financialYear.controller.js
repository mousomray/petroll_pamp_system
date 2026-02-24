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

        const years = await FinancialYear.find({ userId })
            .sort({ startDate: -1 });

        res.json({
            success: true,
            data: years
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getActiveFinancialYear = async (req, res) => {
    try {
        const userId = req.user._id;
        const activeYear = await FinancialYear.findOne({
            userId,
            isActive: true
        });
        res.json({
            success: true,
            data: activeYear
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
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
        res.json({
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

        res.json({
            success: true,
            message: "Financial Year deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    createFinancialYear,
    getFinancialYears,
    getActiveFinancialYear,
    updateFinancialYear,
    deleteFinancialYear
};