const express = require("express");
const router = express.Router();
const verifyJwt = require("../middleware/verifiyUser.js");
const authorize = require("../middleware/authorize.js");


const {carryForwardFinancialYear,createOpeningStock,updateOpeningStock,getOpeningStockById,getOpeningStocks,deleteOpeningStock} = require("../controller/opningStockcontroller.js")

router.post("/create-opening-stock",verifyJwt, authorize("ADMIN"),createOpeningStock)
router.get("/all-opening-stocks", verifyJwt, authorize("ADMIN"), getOpeningStocks);
router.get("/single-opening-stocks/:id", verifyJwt, authorize("ADMIN"), getOpeningStockById);
router.put("/update-opening-stock/:id", verifyJwt, authorize("ADMIN"), updateOpeningStock);
router.delete("/delete-opening-stock/:id", verifyJwt, authorize("ADMIN"), deleteOpeningStock);
router.post("/carry-forward-financial-year", verifyJwt, authorize("ADMIN"), carryForwardFinancialYear);



module.exports = router;

