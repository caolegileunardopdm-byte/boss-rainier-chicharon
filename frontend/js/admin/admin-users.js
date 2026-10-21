// ==================== GLOBAL VARIABLES ====================
let allUsers = [];
let currentFilter = "all";

// ==================== INITIALIZE ====================
document.addEventListener("DOMContentLoaded", () => {
  setupFilterTabs();
  loadUsers();
});

// ==================== SETUP FILTER TABS ====================
function setupFilterTabs() {
  const tabs = document.querySelectorAll(".filter-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      currentFilter = tab.dataset.role;
      renderUsers();
    });
  });
}

// ==================== LOAD USERS ====================
async function loadUsers() {
  const result = await apiCall("/users");
  const tbody = document.getElementById("users-body");

  if (!result.success || !result.data) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger);">Failed to load users</td></tr>`;
    return;
  }

  allUsers = result.data;
  renderUsers();
}

// ==================== RENDER USERS ====================
function renderUsers() {
  const tbody = document.getElementById("users-body");

  let filtered = allUsers;
  if (currentFilter !== "all") {
    filtered = allUsers.filter((u) => u.role === currentFilter);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-light);">No ${currentFilter === "all" ? "" : currentFilter} users</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map(
      (u) => `
    <tr>
      <td><strong>${u.full_name}</strong></td>
      <td>${u.email}</td>
      <td><code>${u.username}</code></td>
      <td><span class="role-badge role-${u.role}">${u.role}</span></td>
      <td>${u.phone || "—"}</td>
      <td><small style="color: var(--text-light);">${formatDate(u.createdAt)}</small></td>
      <td>
        <div class="action-btns">
          <button class="btn-sm btn-delete" onclick="deleteUser('${u._id}', '${u.full_name.replace(/'/g, "\\'")}')">Delete</button>
        </div>
      </td>
    </tr>
  `,
    )
    .join("");
}

// ==================== OPEN EDIT MODAL ====================
function openEditModal(userId) {
  const user = allUsers.find((u) => u._id === userId);
  if (!user) return;

  document.getElementById("modal-title").textContent = "Edit User";
  document.getElementById("user-id").value = user._id;
  document.getElementById("user-fullname").value = user.full_name || "";
  document.getElementById("user-email").value = user.email || "";
  document.getElementById("user-username").value = user.username || "";
  document.getElementById("user-phone").value = user.phone || "";
  document.getElementById("user-address").value = user.address || "";
  document.getElementById("user-role").value = user.role || "customer";

  document.getElementById("user-modal").classList.add("show");
}

// ==================== CLOSE MODAL ====================
function closeModal() {
  document.getElementById("user-modal").classList.remove("show");
}

// ==================== SAVE USER ====================
async function saveUser(e) {
  e.preventDefault();

  const userId = document.getElementById("user-id").value;
  const userData = {
    full_name: document.getElementById("user-fullname").value.trim(),
    email: document.getElementById("user-email").value.trim(),
    username: document.getElementById("user-username").value.trim(),
    phone: document.getElementById("user-phone").value.trim(),
    address: document.getElementById("user-address").value.trim(),
    role: document.getElementById("user-role").value,
  };

  const result = await apiCall(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(userData),
  });

  if (!result.success) {
    showAlert(result.error || "Failed to update user", "danger");
    return;
  }

  showAlert("User updated successfully!", "success");
  closeModal();
  loadUsers();
}

// ==================== DELETE USER ====================
async function deleteUser(id, name) {
  if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;

  const result = await apiCall(`/users/${id}`, {
    method: "DELETE",
  });

  if (!result.success) {
    showAlert(result.error || "Failed to delete user", "danger");
    return;
  }

  showAlert("User deleted!", "success");
  loadUsers();
}

// ==================== SHOW ALERT ====================
function showAlert(message, type) {
  const alertEl = document.getElementById("alert");
  if (!alertEl) return;
  alertEl.className = `alert alert-${type} show`;
  alertEl.textContent = message;
  setTimeout(() => alertEl.classList.remove("show"), 3000);
}
