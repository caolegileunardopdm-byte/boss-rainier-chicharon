// ==================== GLOBAL VARIABLES ====================
let allOrders = [];
let currentFilter = "all";

// ==================== INITIALIZE ====================
document.addEventListener("DOMContentLoaded", () => {
  setupFilterTabs();
  loadOrders();
});

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

// ==================== LOAD ORDERS ====================
async function loadOrders() {
  const result = await apiCall("/orders");
  const tbody = document.getElementById("orders-body");

  if (!result.success || !result.data) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger);">Failed to load orders</td></tr>`;
    return;
  }

  allOrders = result.data;
  renderOrders();
}

// ==================== RENDER ORDERS ====================
function renderOrders() {
  const tbody = document.getElementById("orders-body");

  let filtered = allOrders;
  if (currentFilter !== "all") {
    filtered = allOrders.filter((o) => o.status === currentFilter);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-light);">No ${currentFilter === "all" ? "" : currentFilter} orders</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map((order) => {
      const items = order.items || [];
      const pickupDate = order.pickup_date
        ? new Date(order.pickup_date).toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "N/A";

      return `
      <tr>
        <td><code>#${order._id.slice(-8).toUpperCase()}</code></td>
        <td>
  <strong>${
    order.customer_id?.full_name ||
    '<em style="color: var(--text-light);">Walk-in Customer</em>'
  }</strong><br>
  <small style="color: var(--text-light);">${
    order.customer_id?.email || ""
  }</small>
</td>
        <td>${items.length} item(s)</td>
        <td><strong>${formatPrice(order.total_amount)}</strong></td>
        <td>${pickupDate}<br><small style="color: var(--text-light);">${order.pickup_time || ""}</small></td>
        <td><span class="status-badge status-${order.status}">${order.status}</span></td>
        <td>
          <div class="action-btns">
            <button class="btn-sm btn-view" onclick="viewOrder('${order._id}')">View</button>
            ${getStatusButtons(order)}
          </div>
        </td>
      </tr>
    `;
    })
    .join("");
}

// ==================== STATUS BUTTONS ====================
function getStatusButtons(order) {
  const status = order.status;
  const id = order._id;

  if (status === "pending") {
    return `
      <button class="btn-sm btn-confirm" onclick="updateStatus('${id}', 'confirmed')">Confirm</button>
      <button class="btn-sm btn-cancel" onclick="updateStatus('${id}', 'cancelled')">Cancel</button>
    `;
  }
  if (status === "confirmed") {
    return `
      <button class="btn-sm btn-ready" onclick="updateStatus('${id}', 'ready')">Ready</button>
      <button class="btn-sm btn-cancel" onclick="updateStatus('${id}', 'cancelled')">Cancel</button>
    `;
  }
  if (status === "ready") {
    return `<button class="btn-sm btn-complete" onclick="updateStatus('${id}', 'completed')">Complete</button>`;
  }
  return "";
}
// ==================== UPDATE STATUS ====================
async function updateStatus(orderId, newStatus) {
  if (!confirm(`Change order status to "${newStatus}"?`)) return;

  const result = await apiCall(`/orders/${orderId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status: newStatus }),
  });

  if (!result.success) {
    showAlert(result.error || "Failed to update status", "danger");
    return;
  }

  showAlert(`Order status updated to "${newStatus}"!`, "success");
  loadOrders();
}

// ==================== VIEW ORDER ====================
async function viewOrder(orderId) {
  const result = await apiCall(`/orders/${orderId}`);

  if (!result.success || !result.data) {
    showAlert("Failed to load order details", "danger");
    return;
  }

  const order = result.data;
  const items = order.items || [];

  document.getElementById("order-details").innerHTML = `
    <div class="detail-row">
      <span class="detail-label">Order ID:</span>
      <span class="detail-value"><code>#${order._id.slice(-8).toUpperCase()}</code></span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Status:</span>
      <span class="status-badge status-${order.status}">${order.status}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Customer:</span>
      <span class="detail-value">${
        order.customer_id?.full_name || "Walk-in Customer"
      }</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Email:</span>
     <span class="detail-value">${order.customer_id?.email || "—"}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Phone:</span>
      <span class="detail-value">${order.customer_id?.phone || "—"}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Pick-up Date:</span>
      <span class="detail-value">${formatDate(order.pickup_date)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Pick-up Time:</span>
      <span class="detail-value">${order.pickup_time || "N/A"}</span>
    </div>

    <h3 style="margin-top: 1.5rem; margin-bottom: 0.5rem; color: var(--primary);">Items</h3>
    <div class="order-items-list">
      ${items
        .map(
          (item) => `
        <div class="order-item-row">
          <span>${item.name} <strong>x${item.quantity}</strong></span>
          <span>${formatPrice(item.subtotal)}</span>
        </div>
      `,
        )
        .join("")}
      <div class="order-item-row">
        <span>TOTAL</span>
        <span>${formatPrice(order.total_amount)}</span>
      </div>
    </div>
  `;

  document.getElementById("order-modal").classList.add("show");
}

// ==================== CLOSE MODAL ====================
function closeModal() {
  document.getElementById("order-modal").classList.remove("show");
}

// ==================== SHOW ALERT ====================
function showAlert(message, type) {
  const alertEl = document.getElementById("alert");
  if (!alertEl) return;

  alertEl.className = `alert alert-${type} show`;
  alertEl.textContent = message;

  setTimeout(() => {
    alertEl.classList.remove("show");
  }, 3000);
}
