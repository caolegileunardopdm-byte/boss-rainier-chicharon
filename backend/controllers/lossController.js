const Loss = require("../models/Loss");

// ==================== GET ALL LOSSES ====================
exports.getLosses = async (req, res) => {
  try {
    const losses = await Loss.find()
      .populate("product_id", "name barcode image_url")
      .populate("refunded_by", "full_name")
      .sort({ date: -1 });
    res.json({ success: true, data: losses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
