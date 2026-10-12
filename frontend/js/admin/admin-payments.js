// ==================== GLOBAL VARIABLES ====================
let allPayments = [];

// ==================== INITIALIZE ====================
document.addEventListener("DOMContentLoaded", () => {
  loadPayments();
});

// ==================== LOAD PAYMENTS ====================
async function loadPayments() {
  const result = await apiCall("/payments");
  const tbody = document.getElementById("payments-body");

  if (!result.success || !result.data) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger);">Failed to load payments</td></tr>`;
    return;
  }

  allPayments = result.data;
  renderStats();
  renderPayments();
}

// ==================== RENDER STATS ====================
function renderStats() {
  const total = allPayments.length;
  const totalAmount = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const paidAmount = allPayments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const pendingCount = allPayments.filter((p) => p.status === "pending").length;

  document.getElementById("stats-row").innerHTML = `
    <div class="mini-stat">
      <div class="mini-stat-icon">💰</div>
      <div>
        <div class="mini-stat-value">${total}</div>
        <div class="mini-stat-label">Total Payments</div>
      </div>
    </div>
    <div class="mini-stat">
      <div class="mini-stat-icon">💵</div>
      <div>
        <div class="mini-stat-value">${formatPrice(totalAmount)}</div>
        <div class="mini-stat-label">Total Amount</div>
      </div>
    </div>
    <div class="mini-stat">
      <div class="mini-stat-icon">✅</div>
      <div>
        <div class="mini-stat-value">${formatPrice(paidAmount)}</div>
        <div class="mini-stat-label">Paid Amount</div>
      </div>
    </div>
    <div class="mini-stat">
      <div class="mini-stat-icon">⏳</div>
      <div>
        <div class="mini-stat-value">${pendingCount}</div>
        <div class="mini-stat-label">Pending</div>
      </div>
    </div>
  `;
}

// ==================== RENDER PAYMENTS ====================
function renderPayments() {
  const tbody = document.getElementById("payments-body");

  if (allPayments.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-light);">No payments yet</td></tr>`;
    return;
  }

  tbody.innerHTML = allPayments
    .map((p) => {
      const orderId = p.order_id?._id
        ? `#${p.order_id._id.slice(-8).toUpperCase()}`
        : "—";

      return `
      <tr>
        <td><code>#${p._id.slice(-8).toUpperCase()}</code></td>
        <td><code>${orderId}</code></td>
        <td><span class="method-badge">${p.payment_method || "cash"}</span></td>
        <td><strong>${formatPrice(p.amount)}</strong></td>
        <td><span class="status-badge status-${p.status}">${p.status}</span></td>
        <td><small style="color: var(--text-light);">${formatDate(p.payment_date || p.createdAt)}</small></td>
        <td>
          <div class="action-btns">
            ${p.status === "pending" ? `<button class="btn-sm btn-paid" onclick="markAsPaid('${p._id}')">Mark Paid</button>` : ""}
            ${p.status === "paid" ? `<button class="btn-sm btn-refund" onclick="markAsRefunded('${p._id}')">Refund</button>` : ""}
            <button class="btn-sm btn-delete" onclick="deletePayment('${p._id}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
    })
    .join("");
}

// ==================== MARK AS PAID ====================
async function markAsPaid(paymentId) {
  if (!confirm("Mark this payment as paid?")) return;

  const result = await apiCall(`/payments/${paymentId}`, {
    method: "PUT",
    body: JSON.stringify({ status: "paid" }),
  });

  if (!result.success) {
    showAlert(result.error || "Failed to update payment", "danger");
    return;
  }

  showAlert("Payment marked as paid!", "success");
  loadPayments();
}

// ==================== MARK AS REFUNDED ====================
async function markAsRefunded(paymentId) {
  if (!confirm("Mark this payment as refunded?")) return;

  const result = await apiCall(`/payments/${paymentId}`, {
    method: "PUT",
    body: JSON.stringify({ status: "refunded" }),
  });

  if (!result.success) {
    showAlert(result.error || "Failed to refund payment", "danger");
    return;
  }

  showAlert("Payment refunded!", "success");
  loadPayments();
}

// ==================== DELETE PAYMENT ====================
async function deletePayment(paymentId) {
  if (!confirm("Delete this payment record?")) return;

  const result = await apiCall(`/payments/${paymentId}`, {
    method: "DELETE",
  });

  if (!result.success) {
    showAlert(result.error || "Failed to delete payment", "danger");
    return;
  }

  showAlert("Payment deleted!", "success");
  loadPayments();
}

// ==================== SHOW ALERT ====================
function showAlert(message, type) {
  const alertEl = document.getElementById("alert");
  if (!alertEl) return;
  alertEl.className = `alert alert-${type} show`;
  alertEl.textContent = message;
  setTimeout(() => alertEl.classList.remove("show"), 3000);
}
