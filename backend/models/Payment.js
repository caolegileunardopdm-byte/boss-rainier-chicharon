const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Order is required"],
    },
    payment_method: {
      type: String,
      enum: ["cash", "gcash", "maya", "bank_transfer", "card"],
      default: "cash",
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: 0,
    },
    payment_date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    transaction_ref: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Payment", PaymentSchema);
