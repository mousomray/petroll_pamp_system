const express = require("express")
const dotenv = require("dotenv")
const path = require("path");
const cors = require("cors")
const Conect = require("./src/db/Connent.js")
const cookieParser = require('cookie-parser')

dotenv.config()

const app = express()
Conect()

app.use(cors(
    {
        origin: [process.env.FRONTEND_URL],
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        credentials: true
    }
))
app.use(cookieParser())

app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const registerRoutes = require("./src/routes/register.routes.js")
const loginRoutes = require("./src/routes/login.routes.js")
const productRoutes = require("./src/routes/product.routes.js")
const financialRoutes = require("./src/routes/financial.routes.js")
const productFinancialStockRoutes = require("./src/routes/productFinancialStock.routes.js")
const supplierRoutes = require("./src/routes/supplier.routes.js")
const tankRoutes = require("./src/routes/tank.routes.js")
const purchaseRoutes = require("./src/routes/purchase.routes.js")
const opningStock = require("./src/routes/openingStock.routes.js")
const nozzelRoutes = require("./src/routes/nozzel.routes.js")
const workerRoutes = require("./src/routes/worker.routes.js")

app.use("/api/register", registerRoutes)
app.use("/api/login", loginRoutes)
app.use("/api/product",productRoutes)
app.use("/api/financial-year", financialRoutes)
app.use("/api/financial-stock", productFinancialStockRoutes)
app.use("/api/supplier",supplierRoutes)
app.use("/api/tank", tankRoutes)
app.use("/api/purchase", purchaseRoutes)
app.use("/api/opening-stock",opningStock)
app.use("/api/nozzle", nozzelRoutes)
app.use("/api/worker", workerRoutes)

const port = process.env.PORT

app.listen(port, () => {
    console.log(`server is runing ${port}`)
})