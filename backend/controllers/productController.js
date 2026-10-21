const Product = require("../models/Product");
const Loss = require("../models/Loss"); // 🆕 Idinagdag para sa Lost Products
const Inventory = require("../models/Inventory"); // 🆕 Idinagdag para sa pagbura ng stock record

// GET all products
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("category_id", "name description")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET single product
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "category_id",
      "name description",
    );
    if (!product) {
      return res
        .status(404)
        .json({ success: false, error: "Product not found" });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// CREATE product
exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);

    // AUTO-CREATE INVENTORY RECORD
    await Inventory.create({
      product_id: product._id,
      stock_quantity: product.stock_quantity || 0,
      min_stock_level: 10,
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// UPDATE product
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) {
      return res
        .status(404)
        .json({ success: false, error: "Product not found" });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ==================== DELETE PRODUCT (Soft Delete to Loss) ====================
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, error: "Product not found" });
    }

    // 1. I-save sa Loss collection bago tuluyang burahin
    await Loss.create({
      product_id: product._id,
      product_name: product.name,
      quantity: product.stock_quantity || 0,
      unit_price: product.price,
      total_loss: product.price * (product.stock_quantity || 0),
      reason: "deleted",
    });

    // 2. Burahin ang record sa Inventory (para hindi maging Unknown)
    await Inventory.findOneAndDelete({ product_id: product._id });

    // 3. Burahin sa Products
    await Product.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Product deleted and moved to lost products.",
    });
  } catch (error) {
    // 🆕 I-print ang totoong error sa terminal para makita natin
    console.error("DELETE PRODUCT ERROR:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== GET PRODUCT BY BARCODE ====================
exports.getProductByBarcode = async (req, res) => {
  try {
    const code = req.params.code;

    const product = await Product.findOne({ barcode: code }).populate(
      "category_id",
      "name description",
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found for barcode: " + code,
      });
    }

    const OrderItem = require("../models/OrderItem");

    const lastOrderItem = await OrderItem.findOne({ product_id: product._id })
      .sort({ createdAt: -1 })
      .populate("order_id", "order_date status pickup_date pickup_time");

    const lastOrdered = lastOrderItem?.order_id?.order_date || null;
    const lastSold = lastOrderItem?.createdAt || null;
    const lastSoldQty = lastOrderItem?.quantity || 0;

    res.json({
      success: true,
      data: {
        ...product.toObject(),
        last_ordered: lastOrdered,
        last_sold: lastSold,
        last_sold_quantity: lastSoldQty,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
