const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProduct,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

// ⚠️ IMPORTANTE: /barcode/:code DAPAT nasa TAAS ng /:id
router.get("/", getProducts);
router.get("/barcode/:code", getProductByBarcode);
router.get("/:id", getProduct);
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

module.exports = router;
