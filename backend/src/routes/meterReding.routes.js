const router = require("express").Router();

const verifyJwt = require("../middleware/verifiyUser.js");
const authorize = require("../middleware/authorize.js");


const { addOpeningMeterReadings,getMeterReadings, closeMultipleMeterReadings } = require("../controller/meterReading.controller.js")

router.post("/create-opening",verifyJwt,authorize("ADMIN", "MANAGER"), addOpeningMeterReadings);
router.get("/list",verifyJwt,authorize("ADMIN", "MANAGER"),getMeterReadings);
router.post("/create-closing",verifyJwt,authorize("ADMIN", "MANAGER"),closeMultipleMeterReadings);


module.exports = router;