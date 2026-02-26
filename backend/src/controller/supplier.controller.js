
const mongoose = require("mongoose");

const SupplierModel = require("../model/supplier.model")
const UserModel = require("../model/user.model")
const { ZodError } = require("zod");
const { createSupplierSchema, updateSupplierSchema } = require("../schema/supplier.schema")

const createSupplier = async (req, res) => {
    try {
        const parsedData = createSupplierSchema.parse(req.body);
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const user = await UserModel.findById(userId);
        if (!user || user.role !== "ADMIN") {
            return res.status(403).json({ message: "Only admin can create supplier" });
        }

        const supplier = await SupplierModel.create({
            ...parsedData,
            userId: user._id,
        });

        return res.status(201).json({
            success: true,
            message: "Supplier created successfully",
            suppliers: supplier,
        });
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                success: false,
                errors: error.issues,
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


const getAllSuppliers = async (req, res) => {
    try {
        const userId = req.user?.id;

        const page = parseInt(req.query.page) || 1;
        const limit =
            parseInt(req.query.limit) ||
            parseInt(process.env.DEFAULT_PAGE_SIZE) ||
            10;

        const search = req.query.search || "";
        const skip = (page - 1) * limit;

        const filter = { userId };

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } },
                { gstId: { $regex: search, $options: "i" } },
            ];
        }

        const totalRecords = await SupplierModel.countDocuments(filter);
        const totalPages = Math.ceil(totalRecords / limit);

        const suppliers = await SupplierModel.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        return res.status(200).json({
            success: true,
            page,
            totalPages,
            totalRecords,
            suppliers: suppliers,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


const getSingleSupplier = async (req, res) => {
    try {
        const { id } = req.params;

        const supplier = await SupplierModel.findOne({
            _id: id,
        });

        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: "Supplier not found",
            });
        }

        return res.status(200).json({
            success: true,
            supplier: supplier,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const updateSupplier = async (req, res) => {
    try {
        const { id } = req.params;

        const parsedData = updateSupplierSchema.parse(req.body);

        const updated = await SupplierModel.findOneAndUpdate(
            { _id: id},
            parsedData,
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Supplier not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Supplier updated successfully",
            suppliers: updated,
        });
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                success: false,
                errors: error.issues,
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const deleteSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await SupplierModel.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }

        );

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Supplier not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Supplier deleted successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const dropDownSuppliers = async(req,res) =>{
    try{
        const userId = req.user?.id;
        const suppliers = await SupplierModel.find({ userId, isActive: true });
        return res.status(200).json({
            success: true,
            suppliers: suppliers,
        });
    }catch(error){
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

module.exports = {
  createSupplier,
  getAllSuppliers,
  getSingleSupplier,
  updateSupplier,
  deleteSupplier,
  dropDownSuppliers
};