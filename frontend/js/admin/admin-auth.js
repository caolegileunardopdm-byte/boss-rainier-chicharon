// ==================== ADMIN ROUTE PROTECTION ====================
(function protectAdminRoute() {
  const user = getCurrentUser();

  if (!user) {
    alert("Please login first.");
    window.location.href = "../login.html";
    return;
  }

  if (user.role !== "admin" && user.role !== "staff") {
    alert("Access denied. Admin or staff only.");
    window.location.href = "../products.html";
    return;
  }
})();

// ==================== UPDATE CART COUNT ====================
function updateCartCount() {
  const count = getCartCount();
  const cartCountEl = document.getElementById("cart-count");
  if (cartCountEl) cartCountEl.textContent = count;
}

// ==================== UPDATE AUTH LINKS ====================
function updateAuthLinks() {
  const user = getCurrentUser();
  const authLinks = document.getElementById("auth-links");
  if (!authLinks) return;

  if (user) {
    authLinks.innerHTML = `
      <span style="color: white;">Hi, ${user.full_name}!</span>
      <a href="#" onclick="logout(); return false;">Logout</a>
    `;
  }
}
