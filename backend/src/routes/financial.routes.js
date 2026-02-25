const router = require("express").Router();
const { createFinancialYear, getFinancialYears, getActiveFinancialYear,getSingleFinancialYear, updateFinancialYear, deleteFinancialYear } = require("../controller/financialYear.controller.js");
const verifyJwt = require("../middleware/verifiyUser.js");
const authorize = require("../middleware/authorize.js");
const { uploadStudentImages } = require("../middleware/multiMulter.js")

router.post("/create-financial", verifyJwt, authorize("ADMIN"), createFinancialYear);
router.get("/all-financials", verifyJwt, getFinancialYears);
router.get("/all-financials/active", verifyJwt, getActiveFinancialYear);
router.put("/update-financial/:id", verifyJwt, authorize("ADMIN"), updateFinancialYear);
router.delete("/delete-financial/:id", verifyJwt, authorize("ADMIN"), deleteFinancialYear);
router.get("/get-single-financial/:id", verifyJwt, getSingleFinancialYear);

module.exports = router;