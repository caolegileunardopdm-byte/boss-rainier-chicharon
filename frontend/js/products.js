// ==================== GLOBAL VARIABLES ====================
let allProducts = [];
let filteredProducts = [];

// ==================== INITIALIZE ====================
document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
  updateAuthLinks();
  loadProducts();
  loadCategories();
  setupEventListeners();
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

// ==================== LOAD PRODUCTS ====================
async function loadProducts() {
  const result = await apiCall("/products");

  if (!result.success || !result.data) {
    showError("Failed to load products");
    return;
  }

  allProducts = result.data;
  filteredProducts = allProducts;
  renderProducts();
}

// ==================== LOAD CATEGORIES ====================
async function loadCategories() {
  const result = await apiCall("/categories");
  if (!result.success || !result.data) return;

  const select = document.getElementById("category-filter");
  result.data.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat._id;
    option.textContent = cat.name;
    select.appendChild(option);
  });
}

// ==================== RENDER PRODUCTS ====================
function renderProducts() {
  const grid = document.getElementById("products-grid");

  if (filteredProducts.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
        <p style="color: var(--text-light); font-size: 1.1rem;">No products found</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filteredProducts
    .map(
      (product) => `
    <div class="card">
      <h3 class="card-title">${product.name}</h3>
      <p class="card-description">${product.description || "No description"}</p>

      ${
        product.category_id
          ? `<p style="font-size: 0.85rem; color: var(--text-light); margin-bottom: 0.5rem;">
              Category: <strong>${product.category_id.name}</strong>
            </p>`
          : ""
      }

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <span class="card-price">${formatPrice(product.price)}</span>
        <span class="badge ${product.stock_quantity > 0 ? "badge-success" : "badge-danger"}">
          ${product.stock_quantity > 0 ? `Stock: ${product.stock_quantity}` : "Out of Stock"}
        </span>
      </div>

      <button
        onclick="addToCart('${product._id}')"
        ${product.stock_quantity <= 0 ? "disabled" : ""}
        class="btn ${product.stock_quantity > 0 ? "btn-primary" : "btn-secondary"}"
        style="width: 100%;"
      >
        ${product.stock_quantity > 0 ? "🛒 Add to Cart" : "Out of Stock"}
      </button>
    </div>
  `,
    )
    .join("");
}

// ==================== ADD TO CART ====================
function addToCart(productId) {
  const product = allProducts.find((p) => p._id === productId);
  if (!product) return;

  const cart = getCart();
  const existingItem = cart.find((item) => item._id === productId);

  if (existingItem) {
    if (existingItem.quantity >= product.stock_quantity) {
      alert("Cannot add more. Not enough stock.");
      return;
    }
    existingItem.quantity += 1;
  } else {
    cart.push({
      _id: product._id,
      name: product.name,
      price: product.price,
      quantity: 1,
      stock_quantity: product.stock_quantity,
    });
  }

  saveCart(cart);
  updateCartCount();
  alert(`${product.name} added to cart!`);
}

// ==================== SEARCH & FILTER ====================
function setupEventListeners() {
  const searchInput = document.getElementById("search-input");
  const categoryFilter = document.getElementById("category-filter");

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      applyFilters(e.target.value, categoryFilter.value);
    });
  }

  if (categoryFilter) {
    categoryFilter.addEventListener("change", (e) => {
      applyFilters(searchInput.value, e.target.value);
    });
  }
}

function applyFilters(searchTerm, categoryId) {
  filteredProducts = allProducts.filter((product) => {
    const matchesSearch =
      !searchTerm ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description &&
        product.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      !categoryId ||
      (product.category_id && product.category_id._id === categoryId);

    return matchesSearch && matchesCategory;
  });

  renderProducts();
}

// ==================== SHOW ERROR ====================
function showError(message) {
  const grid = document.getElementById("products-grid");
  grid.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
      <p style="color: var(--danger); font-size: 1.1rem;">❌ ${message}</p>
    </div>
  `;
}
