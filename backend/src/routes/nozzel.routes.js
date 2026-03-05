const router = require("express").Router();

const verifyJwt = require("../middleware/verifiyUser.js");
const authorize = require("../middleware/authorize.js");

const {createNozzle,updateNozzle,getAllNozzles,getSingleNozzle,deleteNozzle,dropDownNozzles} = require("../controller/nozzel.controller.js")

router.post("/create-nozzle",verifyJwt,authorize("ADMIN"),createNozzle)
router.put("/update-nozzle/:id",verifyJwt,updateNozzle)
router.get("/all-nozzles",verifyJwt,getAllNozzles)
router.get("/single-nozzle/:id",verifyJwt,getSingleNozzle)
router.delete("/delete-nozzle/:id",verifyJwt,deleteNozzle)
router.get("/dropdown-nozzles",verifyJwt,dropDownNozzles)

module.exports = router