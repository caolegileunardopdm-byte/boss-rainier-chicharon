const express = require("express");
const router = express.Router();
const {
  getOrders,
  getOrder,
  getMyOrders,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  refundOrder, // 🆕 Idinagdag natin ito
} = require("../controllers/orderController");

router.get("/", getOrders);
router.get("/my-orders", getMyOrders);
router.get("/:id", getOrder);
router.post("/", createOrder);
router.put("/:id/status", updateOrderStatus);
router.put("/:id/refund", refundOrder); // 🆕 ROUTE PARA SA REFUND
router.delete("/:id", deleteOrder);

module.exports = router;
