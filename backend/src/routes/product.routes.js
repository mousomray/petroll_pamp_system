const router = require("express").Router();

const verifyJwt = require("../middleware/verifiyUser.js");
const authorize = require("../middleware/authorize.js");

const {createProduct,getAllProducts,updateProduct,deleteProduct,getSingleProduct} = require("../controller/product.controller.js")

router.post("/create-product",verifyJwt,authorize("ADMIN"),createProduct)
router.put("/update-product/:id",updateProduct)
router.get("/all-products", verifyJwt, authorize("ADMIN"), getAllProducts);
router.get("/single-product/:id", getSingleProduct);
router.delete("/delete-product/:id", deleteProduct);


module.exports = router
