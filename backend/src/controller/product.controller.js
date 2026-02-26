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
        // ===============================
        // ✅ Validate Body
        // ===============================
        const parsedData = createProductSchema.parse(req.body);

        const userId = req.user?._id || req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        // ===============================
        // ✅ Check User & Role
        // ===============================
        const user = await UserModel.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (user.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Only ADMIN can create product"
            });
        }

        // ===============================
        // 🖼 Upload Image (Optional)
        // ===============================
        let imageUrl = null;

        if (req.files?.image?.length > 0) {
            imageUrl = await uploadSingleImage(req.files.image[0]);
        }

        // ===============================
        // 💾 Create Product
        // ===============================
        const product = await ProductModel.create({
            name: parsedData.name,
            image: imageUrl,
            type: parsedData.type,
            unit: parsedData.unit,

            costPrice: parsedData.costPrice,
            sellingPrice: parsedData.sellingPrice,

            quantity: parsedData.quantity || 0,
            minimumStockAlert: parsedData.minimumStockAlert || 0,

            cgstPercent: parsedData.cgstPercent || 0,
            sgstPercent: parsedData.sgstPercent || 0,
            igstPercent: parsedData.igstPercent || 0,

            hsnCode: parsedData.hsnCode || null,

            userId: user._id
        });

        return res.status(201).json({
            success: true,
            message: "Product created successfully",
            data: product
        });

    } catch (error) {

        // ===============================
        // ❌ Zod Validation Error
        // ===============================
        if (error instanceof ZodError) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: error.issues.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                })),
            });
        }

        console.error("Create Product Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


const getAllProducts = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;

        let page = parseInt(req.query.page) || 1;
        let limit =
            parseInt(req.query.limit) ||
            parseInt(process.env.DEFAULT_PAGE_SIZE) ||
            10;

        const search = req.query.search || "";

        const matchStage = {
            userId: new mongoose.Types.ObjectId(userId),
            isActive: true
        };

        if (search) {
            matchStage.name = { $regex: search, $options: "i" };
        }

        const pipeline = [
            { $match: matchStage },

            {
                $project: {
                    name: 1,
                    image: 1,
                    type: 1,
                    unit: 1,
                    costPrice: 1,
                    sellingPrice: 1,
                    quantity: 1,
                    minimumStockAlert: 1,

                    cgstPercent: { $ifNull: ["$cgstPercent", 0] },
                    sgstPercent: { $ifNull: ["$sgstPercent", 0] },
                    igstPercent: { $ifNull: ["$igstPercent", 0] },

                    hsnCode: 1,
                    createdAt: 1,

                    totalGstPercent: {
                        $add: [
                            { $ifNull: ["$cgstPercent", 0] },
                            { $ifNull: ["$sgstPercent", 0] },
                            { $ifNull: ["$igstPercent", 0] }
                        ]
                    }
                }
            },

            { $sort: { createdAt: -1 } },

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

        const result = await ProductModel.aggregate(pipeline);

        const products = result[0].data;
        const totalProducts = result[0].totalCount[0]?.count || 0;
        const totalPages = Math.ceil(totalProducts / limit);

        return res.status(200).json({
            success: true,
            page,
            limit,
            totalPages,
            totalProducts,
            data: products
        });

    } catch (error) {
        console.error("Error fetching products:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id || req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        // ✅ Validate body
        const parsedData = updateProductSchema.parse(req.body);

        // ✅ Check Product Ownership
        const existingProduct = await ProductModel.findOne({
            _id: id,
            userId: userId,
            isActive: true
        });

        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        // ===============================
        // ✅ Prepare Update Object
        // ===============================
        const updateData = {
            ...parsedData
        };

        // GST overwrite protection
        if (parsedData.cgstPercent !== undefined)
            updateData.cgstPercent = parsedData.cgstPercent;

        if (parsedData.sgstPercent !== undefined)
            updateData.sgstPercent = parsedData.sgstPercent;

        if (parsedData.igstPercent !== undefined)
            updateData.igstPercent = parsedData.igstPercent;

        // ===============================
        // ✅ Update Product
        // ===============================
        const updatedProduct = await ProductModel.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        return res.status(200).json({
            success: true,
            message: "Product updated successfully",
            data: updatedProduct
        });

    } catch (error) {

        if (error instanceof ZodError) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: error.issues.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                })),
            });
        }

        console.error("Update Product Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
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
            products: products
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}

const allProductDropDownProducts = async (req, res) => {
    try {
        const userId = req.user.id;
        const products = await ProductModel.find({
            isActive: true,
            userId: userId,
        })
        return res.json({
            success: true,
            products: products
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
    dropDownProducts,
    allProductDropDownProducts
};