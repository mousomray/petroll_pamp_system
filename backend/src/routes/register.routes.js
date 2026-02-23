const router = require("express").Router();

const { registerAdmin, createUser, allUsers, singleUser,updateUser } = require("../controller/register.controller.js");
const verifyJwt = require("../middleware/verifiyUser.js");
const authorize = require("../middleware/authorize.js");
const { uploadStudentImages } = require("../middleware/multiMulter.js")

router.post("/create-admin", registerAdmin);
router.post("/create-user", verifyJwt, authorize("ADMIN"), createUser);
router.get("/all-users", verifyJwt, authorize("ADMIN"), allUsers);
router.get("/single-user/:userId", verifyJwt, authorize("ADMIN"), singleUser);
router.put("/update-user/:userId", verifyJwt, authorize("ADMIN"), updateUser);

module.exports = router;