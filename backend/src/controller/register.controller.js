const mongoose = require("mongoose");
const UserModel = require("../model/user.model.js")
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { passwordGenerator } = require("../helper/PasswordGenerator.js")
const { createUserSchema, updateUserSchema } = require("../schema/user.schema.js");
const uploadSingleImage = require("../helper/upload.js");
const sendPasswordEmail = require("../helper/mail.service.js")


const registerAdmin = async (req, res) => {
  try {
    const parsedData = createUserSchema.parse(req.body);
    const existingEmail = await UserModel.findOne({ email: parsedData.email });
    if (existingEmail) {
      return res.status(409).json({
        message: "Email already in use",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(parsedData.password, salt);
    const user = new UserModel({ ...parsedData, password: hashedPassword });

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

const createUser = async (req, res) => {
  try {
    const parsedData = createUserSchema.parse(req.body);

    const existingUser = await UserModel.findOne({ email: parsedData.email });
    if (existingUser) {
      return res.status(400).json({
        message: "User already exists with this email",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(parsedData.password, salt);

    const user = new UserModel({ ...parsedData, password: hashedPassword });
    await user.save();

    try {
      await sendPasswordEmail(parsedData.email, parsedData.password);
    } catch (emailError) {
      console.error("Failed to send password email:", emailError);
    }

    return res.status(201).json({
      message: `Hii ${parsedData.name}, you are registered as ${parsedData.role}`,
      user: { ...user.toObject(), password: undefined },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.errors,
      });
    }

    if (error.code === 11000 && error.keyPattern?.email) {
      return res.status(409).json({
        message: "Email already in use",
      });
    }

    console.error("User creation error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const allUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || process.env.DEFAULT_PAGE_SIZE;
    const search = req.query.search || "";

    const filter = {
      role: { $ne: "ADMIN" },
      name: { $regex: search, $options: "i" },
    };
    const totalUsers = await UserModel.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / limit);
    const skip = (page - 1) * limit;

    const users = await UserModel.find(filter)
      .select("-password")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      page,
      totalPages,
      totalUsers,
      users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const singleUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await UserModel.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching single user:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

const updateUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const parsedData = updateUserSchema.parse(req.body);

    // find user to update
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // email uniqueness check
    if (parsedData.email && parsedData.email !== user.email) {
      const emailExists = await UserModel.findOne({ email: parsedData.email });
      if (emailExists) {
        return res.status(400).json({ message: "User already exists with this email" });
      }
    }

    // hash password if provided
    if (parsedData.password) {
      const salt = await bcrypt.genSalt(10);
      parsedData.password = await bcrypt.hash(parsedData.password, salt);
    }

    // update user with only provided fields
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $set: parsedData },
      { new: true }
    ).select("-password"); // exclude password from response

    return res.status(200).json({
      message: `User ${updatedUser.name} updated successfully as ${updatedUser.role}`,
      user: updatedUser,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.errors,
      });
    }

    if (error.code === 11000 && error.keyPattern?.email) {
      return res.status(409).json({
        message: "Email already in use",
      });
    }

    console.error("User update error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


module.exports = { registerAdmin, createUser, allUsers, singleUser, updateUser };

