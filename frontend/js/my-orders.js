// ============================================================
// MY ORDERS (Customer)
// ============================================================
let allOrders = [];
let currentFilter = "all";

// INIT
document.addEventListener("DOMContentLoaded", () => {
  const user = getCurrentUser();
  if (!user) {
    alert("Kailangan mag-login para makita ang orders mo.");
    window.location.href = "login.html";
    return;
  }

  const cartCount = document.getElementById("cart-count");
  if (cartCount) cartCount.textContent = getCartCount();

  const authLinks = document.getElementById("auth-links");
  if (authLinks) {
    authLinks.innerHTML = `
      <span style="color: white;">Hi, ${user.full_name}!</span>
      <a href="#" onclick="logout(); return false;">Logout</a>
    `;
  }

  loadMyOrders();
});

// LOAD ORDERS
async function loadMyOrders() {
  const container = document.getElementById("orders-list");
  const result = await apiCall("/orders/my-orders");

  if (!result.success) {
    container.innerHTML = `
      <div class="empty-orders">
        <div class="icon">❌</div>
        <p>Failed to load orders: ${result.error || "Unknown error"}</p>
      </div>
    `;
    return;
  }

  allOrders = result.data || [];
  renderOrders();
}

// RENDER ORDERS
function renderOrders() {
  const container = document.getElementById("orders-list");
  let filtered = allOrders;
  if (currentFilter !== "all") {
    filtered = allOrders.filter((o) => o.status === currentFilter);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-orders">
        <div class="icon">📦</div>
        <p>Walang orders${currentFilter !== "all" ? ` na may status na "${currentFilter}"` : ""}.</p>
        <a href="products.html" class="btn btn-primary" style="display: inline-block; margin-top: 1rem; padding: 0.65rem 1.5rem; text-decoration: none;">Shop Now</a>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map((order) => renderOrderCard(order))
    .join("");
}

// RENDER ORDER CARD
function renderOrderCard(order) {
  const orderId = order._id.slice(-8).toUpperCase();
  const orderDate = new Date(
    order.order_date || order.createdAt,
  ).toLocaleString("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const pickupDate = order.pickup_date
    ? new Date(order.pickup_date).toLocaleDateString("en-PH", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "N/A";

  const items = order.items || [];
  const itemsHtml = items
    .map(
      (item) => `
    <div class="order-item">
      <span>${item.name} × ${item.quantity}</span>
      <span>₱${Number(item.subtotal || 0).toFixed(2)}</span>
    </div>
  `,
    )
    .join("");

  const timelineHtml = renderTimeline(order.status);

  // 🆕 LOGIC PARA SA CANCEL BUTTON
  // Pwede i-cancel kung pending, confirmed, o ready
  const canCancel = ["pending", "confirmed", "ready"].includes(order.status);
  const cancelBtn = canCancel
    ? `<button class="btn-cancel-order" onclick="confirmCancelOrder('${order._id}', '${orderId}')">Cancel Order</button>`
    : "";

  return `
    <div class="order-card">
      <div class="order-header">
        <div>
          <div class="order-id">Order #${orderId}</div>
          <div class="order-date">${orderDate}</div>
        </div>
        <span class="status-badge status-${order.status}">${order.status}</span>
      </div>

      <div class="order-body">
        <div class="order-info-row">
          <span>Pickup Date:</span>
          <strong>${pickupDate}</strong>
        </div>
        <div class="order-info-row">
          <span>Pickup Time:</span>
          <strong>${order.pickup_time || "N/A"}</strong>
        </div>
        <div class="order-info-row total">
          <span>Total:</span>
          <strong>₱${Number(order.total_amount || 0).toFixed(2)}</strong>
        </div>

        <div class="timeline">
          ${timelineHtml}
        </div>

        <div class="order-items">
          <h4 style="margin-bottom: 0.5rem; color: var(--primary); font-size: 0.9rem;">Items:</h4>
          ${itemsHtml}
        </div>
      </div>

      ${cancelBtn ? `<div class="order-actions">${cancelBtn}</div>` : ""}
    </div>
  `;
}

// RENDER TIMELINE
function renderTimeline(status) {
  const steps = [
    { key: "pending", label: "Pending", icon: "⏳" },
    { key: "confirmed", label: "Confirmed", icon: "✅" },
    { key: "ready", label: "Ready", icon: "📦" },
    { key: "completed", label: "Completed", icon: "🎉" },
  ];

  // 🆕 KUNG NAG-REQUEST NG CANCEL
  if (status === "refund_requested") {
    // 🆕 Pinalitan
    return `
      <div class="timeline-step cancelled" style="width: 100%;">
        <div class="timeline-dot">⏳</div>
        <div class="timeline-label">Wait Admin Respond (Refund)</div>
      </div>
    `;
  }

  // KUNG CANCELLED NA TALAGA
  if (status === "cancelled") {
    return `
      <div class="timeline-step cancelled" style="width: 100%;">
        <div class="timeline-dot">❌</div>
        <div class="timeline-label">Cancelled</div>
      </div>
    `;
  }

  const statusOrder = ["pending", "confirmed", "ready", "completed"];
  const currentIndex = statusOrder.indexOf(status);

  return steps
    .map((step, index) => {
      const stepIndex = statusOrder.indexOf(step.key);
      let className = "";
      if (stepIndex < currentIndex) className = "completed";
      else if (stepIndex === currentIndex)
        className = step.key === "completed" ? "completed" : "active";

      return `
      <div class="timeline-step ${className}">
        <div class="timeline-dot">${step.icon}</div>
        <div class="timeline-label">${step.label}</div>
      </div>
    `;
    })
    .join("");
}

// FILTER
function filterOrders(status) {
  currentFilter = status;
  document.querySelectorAll(".filter-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.status === status);
  });
  renderOrders();
}

// CONFIRM MODAL
let pendingCancelOrderId = null;

function confirmCancelOrder(orderId, orderIdShort) {
  pendingCancelOrderId = orderId;

  // Exact text na gusto mo
  document.getElementById("confirm-title").textContent =
    `Cancel Order #${orderIdShort}?`;
  document.getElementById("confirm-message").innerHTML = `
    <p style="font-weight: bold; font-size: 1.1rem; color: #333;">Are you sure you want to cancel Order #${orderIdShort}?</p>
    <p style="font-size: 0.9rem; margin-top: 0.5rem;">The admin will review your request.</p>
  `;

  document.getElementById("confirm-ok-btn").onclick = () => {
    closeConfirmModal();
    doCancelOrder();
  };

  document.getElementById("confirm-modal").classList.add("show");
}

function closeConfirmModal() {
  document.getElementById("confirm-modal").classList.remove("show");
  pendingCancelOrderId = null;
}

// 🆕 BAGONG DO CANCEL (MAG-REQUEST LANG SA ADMIN)
async function doCancelOrder() {
  if (!pendingCancelOrderId) return;

  const result = await apiCall(
    `/orders/${pendingCancelOrderId}/cancel-request`,
    {
      method: "PUT",
    },
  );

  if (!result.success) {
    alert("Failed to request cancel: " + (result.error || "Unknown error"));
    return;
  }

  alert("✅ Request sent! Wait for admin to respond.");
  loadMyOrders();
}
