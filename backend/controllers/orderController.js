const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Product = require("../models/Product");

// ==================== GET all orders ====================
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("customer_id", "full_name email phone")
      .populate("admin_id", "full_name username")
      .sort({ createdAt: -1 });

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await OrderItem.find({ order_id: order._id }).populate(
          "product_id",
          "name price barcode image_url expiration_date",
        );
        return { ...order.toObject(), items };
      }),
    );

    res.json({ success: true, data: ordersWithItems });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== GET single order ====================
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customer_id", "full_name email phone address")
      .populate("admin_id", "full_name username");

    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const items = await OrderItem.find({ order_id: order._id }).populate(
      "product_id",
      "name price barcode image_url expiration_date",
    );
    // 🆕 I-check kung refunded na (para sa resibo)
    if (order.status === "refunded") {
      return res.json({
        success: true,
        data: {
          ...order.toObject(),
          items,
          is_refunded: true, // 🆕 Flag para sa resibo
        },
      });
    }

    res.json({ success: true, data: { ...order.toObject(), items } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== GET MY ORDERS (Customer's own orders) ====================
exports.getMyOrders = async (req, res) => {
  try {
    const customerId = req.query.userId || req.user?.id || req.userId;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        error: "Walang customer ID. Kailangan mag-login.",
      });
    }

    const orders = await Order.find({ customer_id: customerId })
      .populate("customer_id", "full_name email phone")
      .sort({ createdAt: -1 });

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await OrderItem.find({ order_id: order._id }).populate(
          "product_id",
          "name price barcode image_url expiration_date",
        );
        return { ...order.toObject(), items };
      }),
    );

    res.json({ success: true, data: ordersWithItems });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== CREATE order ====================
exports.createOrder = async (req, res) => {
  try {
    const { customer_id, items, pickup_date, pickup_time, status } = req.body;

    if (!items || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "No items in order" });
    }

    let total = 0;
    for (const item of items) {
      const product = await Product.findById(item.product_id);
      if (!product) {
        return res.status(400).json({
          success: false,
          error: `Product not found: ${item.product_id}`,
        });
      }
      if (product.stock_quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          error: `Not enough stock for ${product.name}. Available: ${product.stock_quantity}`,
        });
      }
      total += product.price * item.quantity;
    }

    const order = await Order.create({
      customer_id,
      total_amount: total,
      pickup_date,
      pickup_time,
      status: status || "pending",
    });

    for (const item of items) {
      const product = await Product.findById(item.product_id);
      const subtotal = product.price * item.quantity;

      await OrderItem.create({
        order_id: order._id,
        product_id: product._id,
        name: product.name,
        quantity: item.quantity,
        unit_price: product.price,
        subtotal,
      });

      product.stock_quantity -= item.quantity;
      await product.save();
    }

    const orderItems = await OrderItem.find({ order_id: order._id });
    res.status(201).json({
      success: true,
      data: { ...order.toObject(), items: orderItems },
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ==================== UPDATE order status ====================
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    // 🆕 Ibalik ang stock KAPAG mag-cancel (Approve)
    if (status === "cancelled" && order.status !== "cancelled") {
      const orderItems = await OrderItem.find({ order_id: order._id });
      for (const item of orderItems) {
        await Product.findByIdAndUpdate(item.product_id, {
          $inc: { stock_quantity: item.quantity },
        });
      }
      console.log(`✅ Stock returned for order ${order._id}`);
    }

    order.status = status;
    await order.save();

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ==================== DELETE order ====================
exports.deleteOrder = async (req, res) => {
  try {
    await OrderItem.deleteMany({ order_id: req.params.id });
    await Order.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Order and items deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== REFUND ORDER (Staff) ====================
exports.refundOrder = async (req, res) => {
  try {
    const { staff_id } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    if (!["completed", "pending", "confirmed"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error:
          "Hindi pwedeng i-refund. Completed, Pending, o Confirmed lang ang pwedeng i-refund.",
      });
    }

    order.status = "refunded";
    order.refunded_at = new Date();
    order.refunded_by = staff_id || null;
    order.refund_amount = order.total_amount;

    await order.save();

    const Loss = require("../models/Loss");
    const orderItems = await OrderItem.find({ order_id: order._id });

    for (const item of orderItems) {
      await Loss.create({
        order_id: order._id,
        product_id: item.product_id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_loss: item.subtotal,
        reason: "refund",
        refunded_by: staff_id || null,
      });
    }

    res.json({
      success: true,
      message: "Order refunded and recorded as loss",
      data: order,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== REQUEST CANCEL ORDER (Customer) ====================
exports.requestCancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    // Pwede mag-request ng cancel kung pending, confirmed, o ready pa lang
    if (!["pending", "confirmed", "ready"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: "Hindi na pwedeng i-cancel ang order na ito.",
      });
    }

    // Gawing "cancel_requested" ang status para makita ni Admin
    order.status = "cancel_requested";
    await order.save();

    res.json({
      success: true,
      message: "Cancel request sent to admin.",
      data: order,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
