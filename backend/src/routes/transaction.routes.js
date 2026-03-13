const router = require("express").Router();
const verifyJwt = require("../middleware/verifiyUser.js");
const authorize = require("../middleware/authorize.js");
const { createTransaction, getTransactions } = require("../controller/transaction.controller");

router.get("/get-transactions", verifyJwt, getTransactions);
router.post("/create-transaction", verifyJwt, createTransaction);

module.exports = router;