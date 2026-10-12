// ==================== INITIALIZE ====================
document.addEventListener("DOMContentLoaded", () => {
  // Check if logged in
  const user = getCurrentUser();
  if (!user) {
    alert("Please login first to checkout.");
    window.location.href = "login.html";
    return;
  }

  // Check if cart is empty
  if (getCart().length === 0) {
    alert("Your cart is empty.");
    window.location.href = "cart.html";
    return;
  }

  updateCartCount();
  updateAuthLinks();
  fillCustomerInfo(user);
  renderOrderSummary();
  setDefaultPickupDate();
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

// ==================== FILL CUSTOMER INFO ====================
function fillCustomerInfo(user) {
  document.getElementById("customer-name").value = user.full_name || "";
  document.getElementById("customer-email").value = user.email || "";
  document.getElementById("customer-phone").value = user.phone || "N/A";
  document.getElementById("customer-address").value = user.address || "N/A";
}

// ==================== SET DEFAULT PICKUP DATE ====================
function setDefaultPickupDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split("T")[0];

  const dateInput = document.getElementById("pickup-date");
  dateInput.min = dateStr;
  dateInput.value = dateStr;
}

// ==================== RENDER ORDER SUMMARY ====================
function renderOrderSummary() {
  const cart = getCart();
  const itemsContainer = document.getElementById("order-items");
  const summaryContainer = document.getElementById("order-summary");

  itemsContainer.innerHTML = cart
    .map(
      (item) => `
    <div class="order-item">
      <div>
        <div class="order-item-name">${item.name}</div>
        <div class="order-item-qty">x${item.quantity}</div>
      </div>
      <div class="order-item-price">
        ${formatPrice(item.price * item.quantity)}
      </div>
    </div>
  `,
    )
    .join("");

  summaryContainer.style.display = "block";
  document.getElementById("summary-items").textContent = getCartCount();
  document.getElementById("summary-total").textContent =
    formatPrice(getCartTotal());
}

// ==================== PLACE ORDER ====================
async function placeOrder() {
  const user = getCurrentUser();
  if (!user) {
    showAlert("Please login first.", "danger");
    return;
  }

  const cart = getCart();
  if (cart.length === 0) {
    showAlert("Your cart is empty.", "danger");
    return;
  }

  const pickupDate = document.getElementById("pickup-date").value;
  const pickupTime = document.getElementById("pickup-time").value;
  const paymentMethod = document.getElementById("payment-method").value;

  // Validate
  if (!pickupDate || !pickupTime) {
    showAlert("Please select pick-up date and time.", "danger");
    return;
  }

  const btn = document.getElementById("place-order-btn");
  btn.disabled = true;
  btn.textContent = "Placing order...";

  // Prepare order items
  const items = cart.map((item) => ({
    product_id: item._id,
    quantity: item.quantity,
  }));

  // 1. Create order
  const orderResult = await apiCall("/orders", {
    method: "POST",
    body: JSON.stringify({
      customer_id: user._id,
      items,
      pickup_date: pickupDate,
      pickup_time: pickupTime,
    }),
  });

  if (!orderResult.success) {
    btn.disabled = false;
    btn.textContent = "✓ Place Order";
    showAlert(orderResult.error || "Failed to place order", "danger");
    return;
  }

  // 2. Create payment record
  const paymentResult = await apiCall("/payments", {
    method: "POST",
    body: JSON.stringify({
      order_id: orderResult.data._id,
      payment_method: paymentMethod,
      amount: orderResult.data.total_amount,
      status: "pending",
    }),
  });

  // 3. Clear cart
  saveCart([]);
  updateCartCount();

  showAlert("Order placed successfully! Redirecting to orders...", "success");

  // 4. Redirect to orders page
  setTimeout(() => {
    window.location.href = "orders.html";
  }, 1500);
}

// ==================== SHOW ALERT ====================
function showAlert(message, type) {
  const alertEl = document.getElementById("alert");
  if (!alertEl) return;

  alertEl.className = `alert alert-${type} show`;
  alertEl.textContent = message;

  setTimeout(() => {
    alertEl.classList.remove("show");
  }, 5000);
}
// ==================== ORDERS PAGE LOGIC ====================
let allOrders = [];
let currentFilter = "all";

// Initialize orders page (only if we're on orders.html)
if (document.getElementById("orders-list")) {
  document.addEventListener("DOMContentLoaded", () => {
    const user = getCurrentUser();
    if (!user) {
      alert("Please login first.");
      window.location.href = "login.html";
      return;
    }

    updateCartCount();
    updateAuthLinks();
    setupFilterTabs();
    loadOrders(user);
  });
}

// ==================== LOAD ORDERS ====================
async function loadOrders(user) {
  const result = await apiCall("/orders");

  if (!result.success || !result.data) {
    document.getElementById("orders-list").innerHTML = `
      <div class="empty-orders">
        <div class="empty-orders-icon">❌</div>
        <h2 style="color: var(--danger);">Failed to load orders</h2>
        <p style="color: var(--text-light);">Please try again later.</p>
      </div>
    `;
    return;
  }

  // Filter orders by current user
  // Admin sees all orders, customer sees only their own
  allOrders = result.data.filter((order) => {
    if (user.role === "admin" || user.role === "staff") return true;

    const orderCustomerId =
      typeof order.customer_id === "object"
        ? order.customer_id._id
        : order.customer_id;

    return orderCustomerId === user._id;
  });

  renderOrders();
}

// ==================== SETUP FILTER TABS ====================
function setupFilterTabs() {
  const tabs = document.querySelectorAll(".filter-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      currentFilter = tab.dataset.status;
      renderOrders();
    });
  });
}

// ==================== RENDER ORDERS ====================
function renderOrders() {
  const container = document.getElementById("orders-list");

  let filtered = allOrders;
  if (currentFilter !== "all") {
    filtered = allOrders.filter((o) => o.status === currentFilter);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-orders">
        <div class="empty-orders-icon">📦</div>
        <h2 style="color: var(--primary); margin-bottom: 0.5rem;">No orders yet</h2>
        <p style="color: var(--text-light); margin-bottom: 1.5rem;">
          ${currentFilter === "all" ? "You haven't placed any orders." : `No ${currentFilter} orders.`}
        </p>
        <a href="products.html" class="btn btn-primary">Browse Products</a>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map((order) => {
      const items = order.items || [];
      const statusClass = `status-${order.status}`;
      const pickupDate = order.pickup_date
        ? new Date(order.pickup_date).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "N/A";

      return `
      <div class="order-card">
        <div class="order-header">
          <div>
            <div class="order-id">Order #${order._id.slice(-8).toUpperCase()}</div>
            <div class="order-date">Placed: ${formatDate(order.createdAt)}</div>
          </div>
          <span class="order-status ${statusClass}">${order.status}</span>
        </div>

        <div class="order-items">
          ${items
            .map(
              (item) => `
            <div class="order-item">
              <div>
                <span class="order-item-name">${item.name}</span>
                <span class="order-item-qty">x${item.quantity}</span>
              </div>
              <span>${formatPrice(item.subtotal)}</span>
            </div>
          `,
            )
            .join("")}
        </div>

        <div class="order-footer">
          <div class="order-pickup">
            📅 Pick-up: ${pickupDate} at ${order.pickup_time || "N/A"}
          </div>
          <div class="order-total">
            Total: ${formatPrice(order.total_amount)}
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}
