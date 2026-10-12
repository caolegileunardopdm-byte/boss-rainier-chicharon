const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: false,
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
    },
    stock_quantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    barcode: {
      type: String,
      unique: true,
      sparse: true,
    },
    expiration_date: {
      type: Date,
    },
    nutrition_facts: {
      calories: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
      sodium: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
    },
    image_url: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Product", ProductSchema);
