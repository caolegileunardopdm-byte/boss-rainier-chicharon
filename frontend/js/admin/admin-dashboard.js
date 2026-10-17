// ==================== INITIALIZE ====================
document.addEventListener("DOMContentLoaded", () => {
  const user = getCurrentUser();
  if (user) {
    document.getElementById("welcome-text").textContent =
      `Welcome back, ${user.full_name}! (${user.role})`;
  }

  loadStats();
  loadRecentOrders();
});

// ==================== LOAD STATS ====================
async function loadStats() {
  const [products, orders, users, inventory, payments] = await Promise.all([
    apiCall("/products"),
    apiCall("/orders"),
    apiCall("/users"),
    apiCall("/inventory"),
    apiCall("/payments"),
  ]);

  const stats = [
    {
      icon: "📦",
      label: "Products",
      value: products.data?.length || 0,
    },
    {
      icon: "🛒",
      label: "Orders",
      value: orders.data?.length || 0,
    },
    {
      icon: "👥",
      label: "Users",
      value: users.data?.length || 0,
    },
    {
      icon: "📊",
      label: "Inventory",
      value: inventory.data?.length || 0,
    },
    {
      icon: "💰",
      label: "Payments",
      value: payments.data?.length || 0,
    },
  ];

  document.getElementById("stats-grid").innerHTML = stats
    .map(
      (s) => `
    <div class="stat-card">
      <div class="stat-icon">${s.icon}</div>
      <div class="stat-value">${s.value}</div>
      <div class="stat-label">${s.label}</div>
    </div>
  `,
    )
    .join("");
}

// ==================== LOAD RECENT ORDERS ====================
async function loadRecentOrders() {
  const result = await apiCall("/orders");
  const tbody = document.getElementById("recent-orders-body");

  if (!result.success || !result.data || result.data.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-light);">
        No orders yet
      </td></tr>
    `;
    return;
  }

  // Show latest 5 orders
  const recent = result.data.slice(0, 5);

  tbody.innerHTML = recent
    .map(
      (order) => `
    <tr>
      <td><code>#${order._id.slice(-8).toUpperCase()}</code></td>
      <td>
  ${
    order.customer_id?.full_name ||
    '<em style="color: var(--text-light);">Walk-in Customer</em>'
  }
</td>
      <td>${order.items?.length || 0} item(s)</td>
      <td><strong>${formatPrice(order.total_amount)}</strong></td>
      <td><span class="status-badge status-${order.status}">${order.status}</span></td>
      <td>${formatDate(order.createdAt)}</td>
    </tr>
  `,
    )
    .join("");
}
