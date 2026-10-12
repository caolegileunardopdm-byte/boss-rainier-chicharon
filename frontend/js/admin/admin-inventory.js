// ==================== GLOBAL VARIABLES ====================
let allInventory = [];

// ==================== INITIALIZE ====================
document.addEventListener("DOMContentLoaded", () => {
  loadInventory();
});

// ==================== LOAD INVENTORY ====================
async function loadInventory() {
  const result = await apiCall("/inventory");
  const tbody = document.getElementById("inventory-body");

  if (!result.success || !result.data) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger);">Failed to load inventory</td></tr>`;
    return;
  }

  allInventory = result.data;

  if (allInventory.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-light);">No inventory records yet</td></tr>`;
    renderStats([]);
    checkLowStock([]);
    return;
  }

  renderStats(allInventory);
  checkLowStock(allInventory);
  renderInventory();
}

// ==================== RENDER STATS ====================
function renderStats(inventory) {
  const totalItems = inventory.length;
  const totalStock = inventory.reduce(
    (sum, i) => sum + (i.stock_quantity || 0),
    0,
  );
  const lowStockCount = inventory.filter(
    (i) => i.stock_quantity > 0 && i.stock_quantity <= i.min_stock_level,
  ).length;
  const outOfStockCount = inventory.filter(
    (i) => i.stock_quantity === 0,
  ).length;

  document.getElementById("stats-row").innerHTML = `
    <div class="mini-stat">
      <div class="mini-stat-icon">📦</div>
      <div>
        <div class="mini-stat-value">${totalItems}</div>
        <div class="mini-stat-label">Products Tracked</div>
      </div>
    </div>
    <div class="mini-stat">
      <div class="mini-stat-icon">📊</div>
      <div>
        <div class="mini-stat-value">${totalStock}</div>
        <div class="mini-stat-label">Total Stock</div>
      </div>
    </div>
    <div class="mini-stat">
      <div class="mini-stat-icon">⚠️</div>
      <div>
        <div class="mini-stat-value">${lowStockCount}</div>
        <div class="mini-stat-label">Low Stock</div>
      </div>
    </div>
    <div class="mini-stat">
      <div class="mini-stat-icon">❌</div>
      <div>
        <div class="mini-stat-value">${outOfStockCount}</div>
        <div class="mini-stat-label">Out of Stock</div>
      </div>
    </div>
  `;
}

// ==================== CHECK LOW STOCK ====================
function checkLowStock(inventory) {
  const lowStockItems = inventory.filter(
    (i) => i.stock_quantity <= i.min_stock_level,
  );

  const alertBox = document.getElementById("low-stock-alert");
  const list = document.getElementById("low-stock-list");

  if (lowStockItems.length === 0) {
    alertBox.classList.remove("show");
    return;
  }

  alertBox.classList.add("show");
  list.innerHTML = lowStockItems
    .map(
      (i) =>
        `<li><strong>${i.product_id?.name || "Unknown"}</strong> — Only ${i.stock_quantity} left (min: ${i.min_stock_level})</li>`,
    )
    .join("");
}

// ==================== GET STOCK STATUS ====================
function getStockStatus(item) {
  const qty = item.stock_quantity;
  const min = item.min_stock_level;

  if (qty === 0) return { label: "Out of Stock", class: "stock-out" };
  if (qty <= min) return { label: "Low", class: "stock-low" };
  if (qty <= min * 2) return { label: "Medium", class: "stock-medium" };
  return { label: "High", class: "stock-high" };
}

// ==================== RENDER INVENTORY ====================
function renderInventory() {
  const tbody = document.getElementById("inventory-body");

  tbody.innerHTML = allInventory
    .map((item) => {
      const status = getStockStatus(item);
      const lastUpdated = item.last_updated
        ? formatDate(item.last_updated)
        : "N/A";

      return `
      <tr>
        <td><strong>${item.product_id?.name || "Unknown"}</strong></td>
        <td><code>${item.product_id?.barcode || "—"}</code></td>
        <td><strong>${item.stock_quantity}</strong></td>
        <td>${item.min_stock_level}</td>
        <td><span class="stock-badge ${status.class}">${status.label}</span></td>
        <td><small style="color: var(--text-light);">${lastUpdated}</small></td>
        <td>
          <button class="btn-sm btn-edit" onclick="openEditModal('${item._id}')">Edit Stock</button>
        </td>
      </tr>
    `;
    })
    .join("");
}

// ==================== OPEN EDIT MODAL ====================
function openEditModal(inventoryId) {
  const item = allInventory.find((i) => i._id === inventoryId);
  if (!item) return;

  document.getElementById("inventory-id").value = item._id;
  document.getElementById("product-id").value = item.product_id?._id || "";
  document.getElementById("product-name-display").value =
    item.product_id?.name || "Unknown";
  document.getElementById("stock-quantity").value = item.stock_quantity;
  document.getElementById("min-stock-level").value = item.min_stock_level;

  document.getElementById("stock-modal").classList.add("show");
}

// ==================== CLOSE MODAL ====================
function closeModal() {
  document.getElementById("stock-modal").classList.remove("show");
}

// ==================== SAVE STOCK ====================
async function saveStock(e) {
  e.preventDefault();

  const productId = document.getElementById("product-id").value;
  const stockQuantity = parseInt(
    document.getElementById("stock-quantity").value,
  );
  const minStockLevel = parseInt(
    document.getElementById("min-stock-level").value,
  );

  // Using upsert endpoint - POST /api/inventory
  const result = await apiCall("/inventory", {
    method: "POST",
    body: JSON.stringify({
      product_id: productId,
      stock_quantity: stockQuantity,
      min_stock_level: minStockLevel,
    }),
  });

  if (!result.success) {
    showAlert(result.error || "Failed to update stock", "danger");
    return;
  }

  showAlert("Stock updated successfully!", "success");
  closeModal();
  loadInventory();
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
