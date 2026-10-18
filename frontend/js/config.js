// ==================== API CONFIGURATION ====================
const API_BASE_URL = "https://boss-rainier-chicharon.onrender.com/api";

// ==================== API HELPER ====================
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("API Error:", error);
    return { success: false, error: error.message };
  }
}

// ==================== AUTH HELPERS ====================
function getCurrentUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

function isLoggedIn() {
  return !!localStorage.getItem("token");
}

function isAdmin() {
  const user = getCurrentUser();
  return user && user.role === "admin";
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("cart");

  // Get the base path (works for both root and admin folder)
  const path = window.location.pathname;
  const basePath = path.includes("/admin/") ? "../" : "";

  window.location.href = basePath + "login.html";
}

// ==================== CART HELPERS ====================
function getCart() {
  const cart = localStorage.getItem("cart");
  return cart ? JSON.parse(cart) : [];
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function getCartTotal() {
  const cart = getCart();
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function getCartCount() {
  const cart = getCart();
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

// ==================== UTILITY ====================
function formatPrice(amount) {
  return `₱${Number(amount).toFixed(2)}`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
