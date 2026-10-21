const mongoose = require("mongoose");

const lossSchema = new mongoose.Schema(
  {
    // 🆕 Ginawang optional para pwede sa deleted products na walang order
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: false,
    },
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    product_name: String,
    quantity: Number,
    unit_price: Number,
    total_loss: Number,

    // 🆕 Idinagdag ang "deleted" sa listahan ng valid reasons
    reason: {
      type: String,
      enum: ["expired", "damaged", "refund", "deleted"],
      required: true,
    },
    refunded_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Loss", lossSchema);
