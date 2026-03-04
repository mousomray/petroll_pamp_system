const router = require("express").Router();

const verifyJwt = require("../middleware/verifiyUser.js");
const authorize = require("../middleware/authorize.js");


const {createShift ,getAllShifts,getShiftById} = require("../controller/shift.controller.js")

router.post("/create-shift",verifyJwt,authorize("ADMIN"),createShift)
router.put("/get-single-shift/:id",verifyJwt,getShiftById)
router.get("/all-shifts", verifyJwt, getAllShifts);


module.exports = router