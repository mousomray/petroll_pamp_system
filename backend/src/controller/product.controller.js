const mongoose = require("mongoose");
const ProductModel = require("../model/product.model.js")
const UserModel = require("../model/user.model.js")
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createProductSchema, updateProductSchema } = require("../schema/product.schema.js");
const { ZodError } = require("zod");
const uploadSingleImage = require("../helper/upload.js");

const createProduct = async (req, res) => {
    try {
        const parsedData = createProductSchema.parse(req.body);
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const user = await UserModel.findById(userId)
        if (user.role !== "ADMIN") {
            return res.status(401).json({ message: "Unauthorized user role" });
        }
        let photoUrl = null;

        if (req.files?.image?.length > 0) {
            imageUrl = await uploadSingleImage(req.files.image[0]);
        }

        const product = await ProductModel.create({
            name: parsedData.name,
            type: parsedData.type,
            costPrice: parsedData.costPrice,
            sellingPrice: parsedData.sellingPrice,
            minimumStockAlert: parsedData.minimumStockAlert,
            unit: parsedData.unit,
            userId: user._id
        });

        await product.save();

        return res.status(200).json({
            message: "Product created successfully",
            product,
        });

    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                message: "Validation failed",
                errors: error.issues.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                })),
            });
        }
        console.error("Create Product Error:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};


const getAllProducts = async (req, res) => {
    try {
        const userId = req.user.id;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || parseInt(process.env.DEFAULT_PAGE_SIZE) || 10;
        const search = req.query.search || "";

        const filter = {
            isActive: true,
            userId: userId,
            name: { $regex: search, $options: "i" }
        };

        const totalProducts = await ProductModel.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);
        const skip = (page - 1) * limit;

        const products = await ProductModel.find(filter)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        return res.status(200).json({
            page,
            totalPages,
            totalProducts,
            products,
        });

    } catch (error) {
        console.error("Error fetching products:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};


const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const parsedData = updateProductSchema.parse(req.body);

        const product = await ProductModel.findByIdAndUpdate(
            id,
            parsedData,
            { new: true }
        );
        product.save()

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        return res.status(200).json({
            message: "Product updated successfully",
            product,
        });

    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                message: "Validation failed",
                errors: error.issues.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                })),
            });
        }

        console.error("Update Product Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await ProductModel.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        return res.status(200).json({
            message: "Product deleted successfully (soft delete)",
        });

    } catch (error) {
        console.error("Delete Product Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

const getSingleProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await ProductModel.findOne({
            _id: id,
            isActive: true
        });

        console.log("==>", product)

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        return res.status(200).json({
            message: "Product get successfully",
            product
        });

    } catch (error) {
        console.error("Get Single Product Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

const dropDownProducts = async (req, res) => {
    try {
        const userId = req.user.id;
        const products = await ProductModel.find({
            isActive: true,
            userId: userId,
            unit: "LITRE"
        })
        return res.json({
            success: true,
            data: products
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}



module.exports = {
    createProduct,
    getAllProducts,
    getSingleProduct,
    updateProduct,
    deleteProduct,
    dropDownProducts
};