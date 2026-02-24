const router = require("express").Router();

const { registerAdmin, allAdmin, createUser, allUsers, singleUser, updateUser,createUserForAdmin } = require("../controller/register.controller.js");
const verifyJwt = require("../middleware/verifiyUser.js");
const authorize = require("../middleware/authorize.js");
const { uploadStudentImages } = require("../middleware/multiMulter.js")

router.post("/create-admin", registerAdmin);
router.get("/all-admins", allAdmin);
router.post("/create-user", verifyJwt, authorize("ADMIN"), createUser);
router.get("/all-users", verifyJwt, authorize("ADMIN"), allUsers);
router.get("/single-user/:userId", singleUser);
router.put("/update-user/:userId", updateUser);
router.post("/create-user-for-admin", verifyJwt, authorize("ADMIN"), createUserForAdmin);

module.exports = router;