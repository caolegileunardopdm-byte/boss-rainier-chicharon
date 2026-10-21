const Inventory = require("../models/Inventory");
const Product = require("../models/Product");

// ==================== GET all inventory ====================
exports.getInventory = async (req, res) => {
  try {
    const inventories = await Inventory.find().populate(
      "product_id",
      "name barcode",
    );

    // I-filter out ang mga record na walang katumbas na product (Unknown)
    const validInventories = inventories.filter(
      (inv) => inv.product_id !== null,
    );

    res.json({ success: true, data: validInventories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== GET single inventory ====================
exports.getInventoryItem = async (req, res) => {
  try {
    const inventory = await Inventory.findById(req.params.id).populate(
      "product_id",
      "name barcode",
    );
    if (!inventory) {
      return res
        .status(404)
        .json({ success: false, error: "Inventory record not found" });
    }
    res.json({ success: true, data: inventory });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== UPSERT INVENTORY (Create or Update) ====================
exports.upsertInventory = async (req, res) => {
  try {
    const { product_id, stock_quantity, min_stock_level } = req.body;

    // Hanapin kung existing na ang inventory para sa product na ito
    let inventory = await Inventory.findOne({ product_id });

    if (inventory) {
      // Update kung meron na
      inventory.stock_quantity = stock_quantity;
      inventory.min_stock_level = min_stock_level || inventory.min_stock_level;
      await inventory.save();
    } else {
      // Gumawa ng bago kung wala pa
      inventory = await Inventory.create({
        product_id,
        stock_quantity: stock_quantity || 0,
        min_stock_level: min_stock_level || 10,
      });
    }

    // I-sync din sa Product model
    await Product.findByIdAndUpdate(product_id, { stock_quantity });

    res.json({ success: true, data: inventory });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ==================== DELETE INVENTORY ====================
exports.deleteInventory = async (req, res) => {
  try {
    const inventory = await Inventory.findByIdAndDelete(req.params.id);
    if (!inventory) {
      return res
        .status(404)
        .json({ success: false, error: "Inventory record not found" });
    }
    res.json({ success: true, message: "Inventory record deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== GET low stock alerts ====================
exports.getLowStock = async (req, res) => {
  try {
    const inventories = await Inventory.find().populate(
      "product_id",
      "name barcode",
    );

    const lowStock = inventories.filter(
      (inv) =>
        inv.product_id !== null && inv.stock_quantity <= inv.min_stock_level,
    );

    res.json({ success: true, data: lowStock });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
