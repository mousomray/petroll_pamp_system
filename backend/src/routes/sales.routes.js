const router = require("express").Router();

const verifyJwt = require("../middleware/verifiyUser.js");
const authorize = require("../middleware/authorize.js");

const { createShiftWiseSales, createSalesForAccessory } = require("../controller/sales.controller.js")

router.post("/create-shift-wise-sales/:id", verifyJwt, authorize("ADMIN"), createShiftWiseSales)
router.post("/create-accessory-sales", verifyJwt, authorize("ADMIN"), createSalesForAccessory)


module.exports = router
