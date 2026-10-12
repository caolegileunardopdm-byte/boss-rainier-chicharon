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
      enum: ["pending", "confirmed", "ready", "completed", "cancelled"],
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
  },
  { timestamps: true },
);

module.exports = mongoose.model("Order", OrderSchema);
