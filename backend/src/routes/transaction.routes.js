const router = require("express").Router();
const verifyJwt = require("../middleware/verifiyUser.js");
const authorize = require("../middleware/authorize.js");
const { getTransactions } = require("../controller/transaction.controller");

router.get("/get-transactions", verifyJwt, getTransactions);

module.exports = router;