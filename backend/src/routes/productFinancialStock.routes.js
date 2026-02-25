const express = require("express");
const router = express.Router();

const { createProductFinancialStock, getAllProductFinancialStock, getSingleProductFinancialStock, updateProductFinancialStock, deleteProductFinancialStock
} = require("../controller/productFinancialStock.controller.js");

const verifyJwt = require("../middleware/verifiyUser.js");
const authorize = require("../middleware/authorize.js");

router.post("/create-financial-stock", verifyJwt, authorize("ADMIN"), createProductFinancialStock);
router.get("/all-financial-stocks", verifyJwt, authorize("ADMIN"), getAllProductFinancialStock);
router.get("/single-financial-stocks/:stockId", verifyJwt, authorize("ADMIN"), getSingleProductFinancialStock);
router.put("/update-financial-stock/:id", verifyJwt, authorize("ADMIN"), updateProductFinancialStock);
router.delete("/delete-financial-stock/:stockId", verifyJwt, authorize("ADMIN"), deleteProductFinancialStock);

module.exports = router;