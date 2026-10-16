const Product = require("../models/Product");

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

// DELETE product
exports.deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
// ==================== GET PRODUCT BY BARCODE ====================
// Para sa QR/Barcode scanner
exports.getProductByBarcode = async (req, res) => {
  try {
    const code = req.params.code;

    // Hanapin ang product sa barcode
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

    // Hanapin ang last order ng product
    const OrderItem = require("../models/OrderItem");

    const lastOrderItem = await OrderItem.findOne({ product_id: product._id })
      .sort({ createdAt: -1 })
      .populate("order_id", "order_date status pickup_date pickup_time");

    const lastOrdered = lastOrderItem?.order_id?.order_date || null;

    res.json({
      success: true,
      data: {
        ...product.toObject(),
        last_ordered: lastOrdered,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
