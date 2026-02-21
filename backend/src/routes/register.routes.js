const router = require("express").Router();

const { registerAdmin } = require("../controller/register.controller.js");
const verifyJwt = require("../middleware/verifiyUser.js");
const { uploadStudentImages } = require("../middleware/multiMulter.js")

router.post("/create-admin", registerAdmin);

module.exports = router;