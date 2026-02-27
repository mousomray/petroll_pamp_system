const router = require("express").Router();

const verifyJwt = require("../middleware/verifiyUser.js");
const authorize = require("../middleware/authorize.js");

const {emptyDropdownTanks,activeStatus, addTank,listTank,getSingleTank,updateTank,deleteTank,allTanks,getTanksByProduct } = require("../controller/tank.controller.js")

router.post("/create-tank", verifyJwt, authorize("ADMIN"), addTank)
router.put("/update-tank/:id", verifyJwt, authorize("ADMIN"), updateTank)
router.get("/all-tanks", verifyJwt, authorize("ADMIN"), listTank);
router.get("/single-tank/:id",verifyJwt, authorize("ADMIN"), getSingleTank);
router.delete("/delete-tank/:id", verifyJwt, authorize("ADMIN"), deleteTank);
router.get("/dropdown-tanks", verifyJwt, authorize("ADMIN"), allTanks);
router.get("/empty-dropdown-tanks", verifyJwt, authorize("ADMIN"), emptyDropdownTanks);
router.get("/tanks-by-product/:productId", verifyJwt, authorize("ADMIN"), getTanksByProduct);
router.patch("/toggle-status/:id",activeStatus)

module.exports = router
