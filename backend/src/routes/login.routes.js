const router = require("express").Router();

const { login, GetProfile, LogOut } = require("../controller/login.controller.js");
const verifyJwt = require("../middleware/verifiyUser.js");
const { uploadStudentImages } = require("../middleware/multiMulter.js")

router.post("/", login);
router.get("/profile-page", verifyJwt, GetProfile);
router.post("/logout", verifyJwt, LogOut);
module.exports = router;