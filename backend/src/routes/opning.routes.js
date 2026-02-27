const express = require("express");
const router = express.Router();


const verifyJwt = require("../middleware/verifiyUser.js");
const authorize = require("../middleware/authorize.js");
const { uploadStudentImages } = require("../middleware/multiMulter.js")
const {createOpeningStock,updateOpeningStock,deleteOpeningStock,getOpeningStockById,getOpeningStocks} = require("../controller/opningStockcontroller.js")

router.post("/create-opning-stock",verifyJwt,authorize("ADMIN"),createOpeningStock)


module.exports = router