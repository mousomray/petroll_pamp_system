const mongoose = require("mongoose");
const UserModel = require("../model/user.model.js")
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { passwordGenerator } = require("../helper/PasswordGenerator.js")
const { createUserSchema } = require("../schema/user.schema.js");
const uploadSingleImage = require("../helper/upload.js");
const sendPasswordEmail = require("../helper/mail.service.js")


const registerAdmin = async (req, res) => {
  try {
    const parsedData = createUserSchema.parse(req.body);
    const existingAdmin = await UserModel.findOne({ role: "ADMIN" });

    if (existingAdmin) {
      return res.status(400).json({
        message: "Admin already exists. Only one admin is allowed.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(parsedData.password, salt);
    const user = new UserModel({...parsedData, password: hashedPassword });

    await user.save();

    return res.status(201).json({ message: "Admin registered successfully", user });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.email) {
      return res.status(409).json({
        message: "Email already in use",
      });
    }

    if (error.name === "ZodError") {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.errors,
      });
    }
    console.error("Admin registration error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = { registerAdmin };

