const router = require("express").Router();

const verifyJwt = require("../middleware/verifiyUser.js");
const authorize = require("../middleware/authorize.js");

const { createPurchase, listPurchases,getPurchaseDetails,updatePurchase } = require("../controller/purchase.controller.js")

router.post("/create-product-purchase", verifyJwt, authorize("ADMIN"), createPurchase)
router.get("/list-purchases", verifyJwt, authorize("ADMIN"), listPurchases)
router.get("/purchase-details/:id", verifyJwt, authorize("ADMIN"), getPurchaseDetails)
router.put("/update-purchase/:id", verifyJwt, authorize("ADMIN"), updatePurchase)

module.exports = router
