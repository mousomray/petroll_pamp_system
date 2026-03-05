const router = require("express").Router();

const verifyJwt = require("../middleware/verifiyUser.js");
const authorize = require("../middleware/authorize.js");

const { createShiftWiseSales, createSalesForAccessory,getSalesList } = require("../controller/sales.controller.js")

router.post("/create-shift-wise-sales/:id", verifyJwt, authorize("ADMIN"), createShiftWiseSales)
router.post("/create-accessory-sales", verifyJwt, authorize("ADMIN"), createSalesForAccessory)
router.get("/list", verifyJwt, authorize("ADMIN"), getSalesList)


module.exports = router
