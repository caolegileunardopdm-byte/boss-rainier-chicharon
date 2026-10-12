const mongoose = require("mongoose");

const InventorySchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
      unique: true,
    },
    stock_quantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    min_stock_level: {
      type: Number,
      default: 10,
      min: 0,
    },
    last_updated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Inventory", InventorySchema);
