const express = require("express");
const router = express.Router();
const {
  getInventory,
  getInventoryItem,
  upsertInventory,
  getLowStock,
  deleteInventory,
} = require("../controllers/inventoryController");

router.get("/", getInventory);
router.get("/low-stock", getLowStock);
router.get("/:id", getInventoryItem);
router.post("/", upsertInventory);
router.delete("/:id", deleteInventory);

module.exports = router;
