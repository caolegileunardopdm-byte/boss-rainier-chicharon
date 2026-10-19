const express = require("express");
const router = express.Router();
const {
  getOrders,
  getOrder,
  getMyOrders,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  refundOrder,
  requestCancelOrder, // 🆕 Idinagdag
} = require("../controllers/orderController");

router.get("/", getOrders);
router.get("/my-orders", getMyOrders);
router.get("/:id", getOrder);
router.post("/", createOrder);
router.put("/:id/status", updateOrderStatus);
router.put("/:id/cancel-request", requestCancelOrder); // 🆕 BAGONG ROUTE
router.put("/:id/refund", refundOrder);
router.delete("/:id", deleteOrder);

module.exports = router;
