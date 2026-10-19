const Payment = require("../models/Payment");
const Order = require("../models/Order");

// ==================== GET all payments ====================
exports.getPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("order_id", "total_amount status customer_id")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== GET single payment ====================
exports.getPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate(
      "order_id",
      "total_amount status",
    );
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, error: "Payment not found" });
    }
    res.json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== CREATE payment ====================
// ==================== CREATE payment ====================
exports.createPayment = async (req, res) => {
  try {
    const { order_id, payment_method, amount, status, transaction_ref } =
      req.body;

    // 🆕 Siguraduhing number ang amount (imbes na string)
    const parsedAmount = Number(amount) || 0;

    // 🆕 Gumawa ng payment record
    const payment = await Payment.create({
      order_id,
      payment_method,
      amount: parsedAmount,
      status: status || "paid",
      transaction_ref,
    });

    // 🆕 I-update ang order status KUNG valid ObjectId at hindi pa completed
    if (payment.status === "paid" && order_id) {
      try {
        // I-query muna kung existing, para hindi mag-crash pag invalid ID
        const order = await Order.findById(order_id);
        if (order && ["pending", "ready"].includes(order.status)) {
          order.status = "confirmed";
          await order.save();
        }
      } catch (err) {
        console.log("Order update skipped (non-critical):", err.message);
      }
    }

    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    console.error("Payment Create Error:", error); // 🆕 I-print sa terminal kung bakit nag-fail
    res.status(400).json({ success: false, error: error.message });
  }
};

// ==================== UPDATE payment ====================
exports.updatePayment = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, error: "Payment not found" });
    }
    res.json({ success: true, data: payment });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ==================== DELETE payment ====================
exports.deletePayment = async (req, res) => {
  try {
    await Payment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Payment deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
