const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Customer is required"],
    },
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    order_date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      // 🆕 IDINAGDAG ANG "refunded"
      enum: [
        "pending",
        "confirmed",
        "ready",
        "completed",
        "cancelled",
        "refunded",
      ],
      default: "pending",
    },
    total_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    pickup_date: {
      type: Date,
    },
    pickup_time: {
      type: String,
      default: "",
    },
    // 🆕 MGA BAGONG FIELDS PARA SA REFUND
    refunded_at: {
      type: Date,
      default: null,
    },
    refunded_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    refund_amount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Order", OrderSchema);
