const router = require("express").Router();

const verifyJwt = require("../middleware/verifiyUser.js");
const authorize = require("../middleware/authorize.js");

const {allProductDropDownProducts,createProduct,getAllProducts,updateProduct,deleteProduct,getSingleProduct,dropDownProducts} = require("../controller/product.controller.js")

router.post("/create-product",verifyJwt,authorize("ADMIN"),createProduct)
router.put("/update-product/:id",updateProduct)
router.get("/all-products", verifyJwt, getAllProducts);
router.get("/single-product/:id", getSingleProduct);
router.get("/dropdown-products", verifyJwt, dropDownProducts);
router.delete("/delete-product/:id", deleteProduct);
router.get("/dropdown-all-products", verifyJwt, allProductDropDownProducts);


module.exports = router
