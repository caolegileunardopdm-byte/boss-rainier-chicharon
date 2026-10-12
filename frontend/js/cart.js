// ==================== INITIALIZE ====================
document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
  updateAuthLinks();
  renderCart();
});

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

// ==================== RENDER CART ====================
function renderCart() {
  const cart = getCart();
  const itemsContainer = document.getElementById("cart-items");
  const summaryContainer = document.getElementById("cart-summary");

  // Empty cart
  if (cart.length === 0) {
    itemsContainer.innerHTML = `
      <div class="empty-cart">
        <div class="empty-cart-icon">🛒</div>
        <h2 style="color: var(--primary); margin-bottom: 0.5rem;">Your cart is empty</h2>
        <p style="color: var(--text-light); margin-bottom: 1.5rem;">
          Add some products to get started!
        </p>
        <a href="products.html" class="btn btn-primary">Browse Products</a>
      </div>
    `;
    summaryContainer.style.display = "none";
    return;
  }

  // Render items
  itemsContainer.innerHTML = cart
    .map(
      (item, index) => `
    <div class="cart-item">
      <div>
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${formatPrice(item.price)} each</div>
      </div>

      <div class="qty-controls">
        <button
          class="qty-btn"
          onclick="updateQuantity(${index}, -1)"
          ${item.quantity <= 1 ? "disabled" : ""}
        >−</button>
        <span class="qty-value">${item.quantity}</span>
        <button
          class="qty-btn"
          onclick="updateQuantity(${index}, 1)"
          ${item.quantity >= item.stock_quantity ? "disabled" : ""}
        >+</button>
      </div>

      <div class="cart-item-subtotal">
        ${formatPrice(item.price * item.quantity)}
      </div>

      <div></div>

      <button class="remove-btn" onclick="removeItem(${index})" title="Remove">
        ✕
      </button>
    </div>
  `,
    )
    .join("");

  // Update summary
  summaryContainer.style.display = "block";
  document.getElementById("summary-items").textContent = getCartCount();
  document.getElementById("summary-total").textContent =
    formatPrice(getCartTotal());
}

// ==================== UPDATE QUANTITY ====================
function updateQuantity(index, change) {
  const cart = getCart();
  const item = cart[index];
  if (!item) return;

  const newQty = item.quantity + change;

  if (newQty < 1) return;
  if (newQty > item.stock_quantity) {
    alert("Cannot add more. Not enough stock.");
    return;
  }

  item.quantity = newQty;
  saveCart(cart);
  renderCart();
  updateCartCount();
}

// ==================== REMOVE ITEM ====================
function removeItem(index) {
  const cart = getCart();
  const item = cart[index];
  if (!item) return;

  if (!confirm(`Remove "${item.name}" from cart?`)) return;

  cart.splice(index, 1);
  saveCart(cart);
  renderCart();
  updateCartCount();
}

// ==================== CLEAR CART ====================
function clearCart() {
  if (!confirm("Clear all items from cart?")) return;

  saveCart([]);
  renderCart();
  updateCartCount();
}

// ==================== CHECKOUT ====================
function checkout() {
  const user = getCurrentUser();

  if (!user) {
    alert("Please login first to place an order.");
    window.location.href = "login.html";
    return;
  }

  if (getCart().length === 0) {
    alert("Your cart is empty.");
    return;
  }

  window.location.href = "checkout.html";
}
