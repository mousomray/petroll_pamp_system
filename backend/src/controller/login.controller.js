const mongoose = require("mongoose");
const UserModel = require("../model/user.model.js")
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { passwordGenerator } = require("../helper/PasswordGenerator.js")
const { loginSchema } = require("../schema/user.schema.js");
const uploadSingleImage = require("../helper/upload.js");
const sendPasswordEmail = require("../helper/mail.service.js")


const login = async (req, res) => {
    try {
        const parsedData = loginSchema.parse(req.body);
        const user = await UserModel.findOne({ email: parsedData.email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const isMatch = await bcrypt.compare(parsedData.password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const text = process.env.TOKEN_SECRET
        console.log("tokend", text)
        const token = jwt.sign(
            {
                userId: user._id,
                role: user.role,
                email: user.email,
                phone: user.phone,
                shiftType: user.shiftType,
                isActive: user.isActive,
            },
            process.env.TOKEN_SECRET,
            { expiresIn: process.env.TOKEN_EXPIRATION }
        );
        console.log(token)
        res.cookie('login-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            sameSite: "strict",
        })

        return res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                phone: user.phone,
                shiftType: user.shiftType,
                isActive: user.isActive,
            },
        });
    } catch (error) {
        res.status(500).json({ message: "Error logging in user", error });
    }
};

const LogOut = async (req, res) => {
    try {
        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const user = await UserModel.findById(userId);

        res.clearCookie("login-token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        });

        return res.status(200).json({
            message: "Logged out successfully",
        });
    } catch (error) {
        console.error("Logout error:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

const GetProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log("User ID from token:", userId);
        const user = await UserModel.findById(userId).select("-password");
        return res.status(200).json({ message: "User profile fetched successfully", user });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return res.status(500).json({ message: "Error fetching user profile", error });
    }
}

module.exports = { login, GetProfile, LogOut };

