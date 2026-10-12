const Inventory = require("../models/Inventory");
const Product = require("../models/Product");

// ==================== GET all inventory ====================
exports.getInventory = async (req, res) => {
  try {
    const inventory = await Inventory.find()
      .populate("product_id", "name price barcode stock_quantity")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: inventory });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== GET single inventory ====================
exports.getInventoryItem = async (req, res) => {
  try {
    const inventory = await Inventory.findById(req.params.id).populate(
      "product_id",
      "name price barcode",
    );
    if (!inventory) {
      return res
        .status(404)
        .json({ success: false, error: "Inventory not found" });
    }
    res.json({ success: true, data: inventory });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== CREATE or UPDATE inventory ====================
exports.upsertInventory = async (req, res) => {
  try {
    const { product_id, stock_quantity, min_stock_level } = req.body;

    let inventory = await Inventory.findOne({ product_id });
    if (inventory) {
      inventory.stock_quantity = stock_quantity;
      if (min_stock_level !== undefined) {
        inventory.min_stock_level = min_stock_level;
      }
      inventory.last_updated = Date.now();
      await inventory.save();
    } else {
      inventory = await Inventory.create({
        product_id,
        stock_quantity,
        min_stock_level,
      });
    }

    // Sync sa Product model
    await Product.findByIdAndUpdate(product_id, { stock_quantity });

    res.json({ success: true, data: inventory });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ==================== GET low stock items ====================
exports.getLowStock = async (req, res) => {
  try {
    const lowStock = await Inventory.find({
      $expr: { $lte: ["$stock_quantity", "$min_stock_level"] },
    }).populate("product_id", "name barcode price");
    res.json({ success: true, data: lowStock });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== DELETE inventory ====================
exports.deleteInventory = async (req, res) => {
  try {
    await Inventory.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Inventory deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
