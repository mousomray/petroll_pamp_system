const router = require("express").Router();

const verifyJwt = require("../middleware/verifiyUser.js");
const authorize = require("../middleware/authorize.js");

const { createPurchase, listPurchases } = require("../controller/purchase.controller.js")

router.post("/create-product-purchase", verifyJwt, authorize("ADMIN"), createPurchase)
router.get("/list-purchases", verifyJwt, authorize("ADMIN"), listPurchases)

module.exports = router
