const express = require("express");
const router = express.Router();
const verifyJwt = require("../middleware/verifiyUser.js");
const authorize = require("../middleware/authorize.js");


const {carryForwardFinancialYear,createOpeningStock,updateOpeningStock,getOpeningStocks,deleteOpeningStock} = require("../controller/opningStock.controller.js")
const {getAllTempStock,createTempStock,deleteTempStock} = require("../controller/Temp.controller.js")


router.post("/create-opening-stock",verifyJwt, authorize("ADMIN"),createOpeningStock)
router.get("/get-all-temp-stock", verifyJwt, authorize("ADMIN"), getAllTempStock);
router.post("/create-temp-stock", verifyJwt, authorize("ADMIN"), createTempStock);
router.delete("/delete-temp-stock/:id", verifyJwt, authorize("ADMIN"), deleteTempStock);
router.get("/all-opening-stocks", verifyJwt, authorize("ADMIN"), getOpeningStocks);
router.put("/update-opening-stock/:id", verifyJwt, authorize("ADMIN"), updateOpeningStock);
router.delete("/delete-opening-stock/:id", verifyJwt, authorize("ADMIN"), deleteOpeningStock);
router.post("/carry-forward-financial-year", verifyJwt, authorize("ADMIN"), carryForwardFinancialYear);



module.exports = router;

