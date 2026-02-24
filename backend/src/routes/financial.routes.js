const router = require("express").Router();
const { createFinancialYear, getFinancialYears, getActiveFinancialYear, updateFinancialYear, deleteFinancialYear } = require("../controller/financialYear.controller.js");
const verifyJwt = require("../middleware/verifiyUser.js");
const authorize = require("../middleware/authorize.js");
const { uploadStudentImages } = require("../middleware/multiMulter.js")

router.post("/", verifyJwt, authorize("ADMIN"), createFinancialYear);
router.get("/", verifyJwt, getFinancialYears);
router.get("/active", verifyJwt, getActiveFinancialYear);
router.put("/:id", verifyJwt, authorize("ADMIN"), updateFinancialYear);
router.delete("/:id", verifyJwt, authorize("ADMIN"), deleteFinancialYear);


module.exports = router;