const router = require("express").Router();

const verifyJwt = require("../middleware/verifiyUser.js");
const authorize = require("../middleware/authorize.js");


const { addOpeningMeterReadings, closeMultipleMeterReadings } = require("../controller/meterReading.controller.js")

router.post("/create-opening",verifyJwt,authorize("ADMIN", "MANAGER"), addOpeningMeterReadings);
router.post("/create-closing",verifyJwt,authorize("ADMIN", "MANAGER"),closeMultipleMeterReadings);


module.exports = router;