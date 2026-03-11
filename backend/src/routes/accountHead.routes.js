const router = require("express").Router();

const verifyJwt = require("../middleware/verifiyUser.js");
const authorize = require("../middleware/authorize.js");

const { createAccountHead,getAccountHeads,getSingleAccountHead,updateAccountHead,inactiveAccountHead} = require("../controller/accountHead.controller.js")

router.post("/create-account-head",verifyJwt,createAccountHead)
router.get("/account-heads", verifyJwt, getAccountHeads);
router.get("/account-head/:id", getSingleAccountHead);
router.put("/update-account-head/:id",verifyJwt,updateAccountHead)
router.delete("/inactive-account-head/:id",verifyJwt,inactiveAccountHead)

module.exports = router
