// ==================== GLOBAL VARIABLES ====================
let allProducts = [];
let allCategories = [];
let editingId = null;

// ==================== INITIALIZE ====================
document.addEventListener("DOMContentLoaded", () => {
  loadCategories();
  loadProducts();
});

// ==================== LOAD CATEGORIES ====================
async function loadCategories() {
  const result = await apiCall("/categories");
  if (!result.success) return;

  allCategories = result.data;

  const select = document.getElementById("product-category");
  allCategories.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat._id;
    option.textContent = cat.name;
    select.appendChild(option);
  });
}

// ==================== LOAD PRODUCTS ====================
async function loadProducts() {
  const result = await apiCall("/products");
  const tbody = document.getElementById("products-body");

  if (!result.success || !result.data) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger);">Failed to load products</td></tr>`;
    return;
  }

  allProducts = result.data;

  if (allProducts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-light);">No products yet. Click "Add Product" to start.</td></tr>`;
    return;
  }

  tbody.innerHTML = allProducts
    .map(
      (p) => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td>${p.category_id?.name || '<em style="color: var(--text-light);">None</em>'}</td>
      <td><strong>${formatPrice(p.price)}</strong></td>
      <td>
        <span class="badge ${p.stock_quantity > 0 ? "badge-success" : "badge-danger"}">
          ${p.stock_quantity}
        </span>
      </td>
      <td><code>${p.barcode || "—"}</code></td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-edit" onclick="openEditModal('${p._id}')">Edit</button>
          <button class="btn btn-sm btn-delete" onclick="deleteProduct('${p._id}', '${p.name.replace(/'/g, "\\'")}')">Delete</button>
        </div>
      </td>
    </tr>
  `,
    )
    .join("");
}

// ==================== OPEN ADD MODAL ====================
function openAddModal() {
  editingId = null;
  document.getElementById("modal-title").textContent = "Add Product";
  document.getElementById("product-form").reset();
  document.getElementById("product-id").value = "";
  document.getElementById("product-modal").classList.add("show");
}

// ==================== OPEN EDIT MODAL ====================
function openEditModal(id) {
  const product = allProducts.find((p) => p._id === id);
  if (!product) return;

  editingId = id;
  document.getElementById("modal-title").textContent = "Edit Product";
  document.getElementById("product-id").value = product._id;
  document.getElementById("product-name").value = product.name;
  document.getElementById("product-description").value =
    product.description || "";
  document.getElementById("product-price").value = product.price;
  document.getElementById("product-stock").value = product.stock_quantity;
  document.getElementById("product-barcode").value = product.barcode || "";
  document.getElementById("product-category").value =
    product.category_id?._id || "";
  document.getElementById("product-modal").classList.add("show");
}

// ==================== CLOSE MODAL ====================
function closeModal() {
  document.getElementById("product-modal").classList.remove("show");
  editingId = null;
}

// ==================== SAVE PRODUCT ====================
async function saveProduct(e) {
  e.preventDefault();

  const productData = {
    name: document.getElementById("product-name").value.trim(),
    description: document.getElementById("product-description").value.trim(),
    price: parseFloat(document.getElementById("product-price").value),
    stock_quantity: parseInt(document.getElementById("product-stock").value),
    barcode: document.getElementById("product-barcode").value.trim(),
    category_id: document.getElementById("product-category").value || null,
  };

  let result;
  if (editingId) {
    // Update
    result = await apiCall(`/products/${editingId}`, {
      method: "PUT",
      body: JSON.stringify(productData),
    });
  } else {
    // Create
    result = await apiCall("/products", {
      method: "POST",
      body: JSON.stringify(productData),
    });
  }

  if (!result.success) {
    showAlert(result.error || "Failed to save product", "danger");
    return;
  }

  showAlert(editingId ? "Product updated!" : "Product added!", "success");
  closeModal();
  loadProducts();
}

// ==================== DELETE PRODUCT ====================
async function deleteProduct(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

  const result = await apiCall(`/products/${id}`, {
    method: "DELETE",
  });

  if (!result.success) {
    showAlert(result.error || "Failed to delete product", "danger");
    return;
  }

  showAlert("Product deleted!", "success");
  loadProducts();
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
