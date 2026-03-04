const router = require("express").Router();

const verifyJwt = require("../middleware/verifiyUser.js");
const authorize = require("../middleware/authorize.js");

const { addWorker, updateWorker, getWorkerById, getWorkers, deleteWorker,dropDownWorkers } = require("../controller/worker.controller.js")

router.post("/create-worker", verifyJwt, authorize("ADMIN"), addWorker);
router.get("/get-workers", verifyJwt, authorize("ADMIN"), getWorkers);
router.get("/get-single-worker/:id", verifyJwt, authorize("ADMIN"), getWorkerById);
router.put("/update-worker/:id", verifyJwt, authorize("ADMIN"), updateWorker);
router.delete("/delete-worker/:id", verifyJwt, authorize("ADMIN"), deleteWorker);
router.get("/dropdown-workers", verifyJwt, authorize("ADMIN"), dropDownWorkers);

module.exports = router;