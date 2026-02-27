const router = require("express").Router();

const verifyJwt = require("../middleware/verifiyUser.js");
const authorize = require("../middleware/authorize.js");

const {allProductDropDownProducts,createProduct,getAllProducts,updateProduct,deleteProduct,getSingleProduct,dropDownProducts,activeStatus} = require("../controller/product.controller.js")

router.post("/create-product",verifyJwt,authorize("ADMIN"),createProduct)
router.put("/update-product/:id",verifyJwt,updateProduct)
router.get("/all-products", verifyJwt, getAllProducts);
router.get("/single-product/:id", getSingleProduct);
router.get("/dropdown-products", verifyJwt, dropDownProducts);
router.delete("/delete-product/:id", deleteProduct);
router.get("/dropdown-all-products", verifyJwt, allProductDropDownProducts);
router.patch("/toggle-status/:id",activeStatus)


module.exports = router
