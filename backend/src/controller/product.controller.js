const mongoose = require("mongoose");
const ProductModel = require("../model/product.model.js")
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createProductSchema, updateProductSchema } = require("../schema/product.schema.js");
const uploadSingleImage = require("../helper/upload.js");

const createProduct = async (req, res) => {
    try {
        const parsedData = createProductSchema.parse(req.body);
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        let photoUrl = null;

        if (req.files?.image?.length > 0) {
            imageUrl = await uploadSingleImage(req.files.image[0]);
        }

        const product = await ProductModel.create({
            name: parsedData.name,
        });

        return res.status(201).json({
            message: "Product created successfully",
            product,
            credentials: {
                email: parsedData.email,
                password: plainPassword,
            },
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