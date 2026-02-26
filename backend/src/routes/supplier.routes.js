const router = require("express").Router();

const verifyJwt = require("../middleware/verifiyUser.js");
const authorize = require("../middleware/authorize.js");

const {createSupplier,getAllSuppliers,getSingleSupplier,updateSupplier,deleteSupplier,dropDownSuppliers} = require("../controller/supplier.controller.js")


router.post("/create-supplier",verifyJwt,authorize("ADMIN"),createSupplier)
router.put("/update-supplier/:id",updateSupplier)
router.get("/all-supplier",verifyJwt,authorize("ADMIN"),getAllSuppliers)
router.get("/single-supplier/:id",getSingleSupplier)
router.delete("/delete-supplier/:id",deleteSupplier)
router.get("/dropdown-suppliers",verifyJwt,dropDownSuppliers)

module.exports = router