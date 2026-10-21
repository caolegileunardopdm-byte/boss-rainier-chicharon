const dns = require("dns");
dns.setDefaultResultOrder("ipv4first"); // 🆕 Mas malakas na fix kaysa sa setServers
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]); // 🆕 Dinagdagan ng Cloudflare DNS

require("dotenv").config({ path: "../.env" });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== ROUTES ====================
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const userRoutes = require("./routes/userRoutes");
const orderRoutes = require("./routes/orderRoutes");
const lossRoutes = require("./routes/lossRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/losses", lossRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/payments", paymentRoutes);

// ==================== TEST ROUTE ====================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Crispy Chicharon API is running!",
    timestamp: new Date().toISOString(),
  });
});

// ==================== 404 HANDLER ====================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
  });
});

// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
  console.error("Server error:", err.message);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// ==================== DATABASE & SERVER ====================
const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 5000;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not defined");
  process.exit(1);
}

// 🆕 DINAGDAGAN NATIN NG MGA OPTIONS PARA MA-BYPASS ANG DNS ERROR
mongoose
  .connect(MONGODB_URI, {
    family: 4, // Pilitin ang IPv4
    serverSelectionTimeoutMS: 10000, // Bigyan ng 10 seconds bago mag-timeout
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log("✅ Connected to MongoDB Atlas");
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server listening on port ${PORT}`);
      console.log("✅ Crispy Chicharon API is ready");
    });
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  });
