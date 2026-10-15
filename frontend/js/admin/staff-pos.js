// ============================================================
// STAFF POS - Configuration
// ============================================================
const WALK_IN_CUSTOMER_ID = "6ad0f58eefdd08a17620ac80";

// ============================================================
// State
// ============================================================
let allProducts = [];
let cart = JSON.parse(localStorage.getItem("pos_cart") || "[]");
let scannerInstance = null;

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  // Check auth
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!user.role || (user.role !== "staff" && user.role !== "admin")) {
    alert("Walang access. Staff o admin lang ang pwede.");
    window.location.href = "../login.html";
    return;
  }

  // Display cashier name
  const nameEl = document.getElementById("cashier-name");
  if (nameEl) nameEl.textContent = user.full_name || "Staff";

  // Load products
  loadProducts();

  // Load orders
  loadOrders();

  // Render cart
  renderCart();

  // Search handler
  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", (e) => {
    filterProducts(e.target.value);
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const code = e.target.value.trim();
      if (code) {
        addByBarcode(code);
        e.target.value = "";
      }
    }
  });

  // Amount received → auto-change
  const amountInput = document.getElementById("amount-received");
  amountInput.addEventListener("input", updateChange);
});

// ============================================================
// SECTION NAVIGATION
// ============================================================
function showSection(name) {
  // Update sidebar links
  document.querySelectorAll(".sidebar-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.section === name);
  });

  // Update sections
  document.querySelectorAll(".staff-section").forEach((sec) => {
    sec.classList.toggle("active", sec.id === `section-${name}`);
  });

  // Refresh data kung orders section
  if (name === "orders") loadOrders();
  if (name === "products") renderProductsList();
}

// ============================================================
// LOAD PRODUCTS
// ============================================================
async function loadProducts() {
  const result = await apiCall("/products");

  if (!result.success) {
    console.error("Failed to load products:", result.error);
    document.getElementById("products-grid").innerHTML = `
      <p style="grid-column: 1/-1; text-align:center; color:#dc2626; padding:2rem;">
        Failed to load products. ${result.error || ""}
      </p>`;
    return;
  }

  allProducts = result.data || [];
  renderProducts(allProducts);
}

function renderProducts(products) {
  const grid = document.getElementById("products-grid");

  if (!products.length) {
    grid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:#6b7280; padding:2rem;">Walang products.</p>`;
    return;
  }

  grid.innerHTML = products
    .map(
      (p) => `
    <div class="product-card" onclick="addToCartById('${p._id}')">
      <div class="name">${p.name}</div>
      <div class="barcode">${p.barcode || "—"}</div>
      <div class="price">₱${Number(p.price).toFixed(2)}</div>
      <div class="stock">Stock: ${p.stock_quantity ?? 0}</div>
    </div>
  `,
    )
    .join("");
}

function filterProducts(term) {
  const q = term.toLowerCase().trim();
  if (!q) {
    renderProducts(allProducts);
    return;
  }
  const filtered = allProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.barcode || "").toLowerCase().includes(q),
  );
  renderProducts(filtered);
}

function renderProductsList() {
  const tbody = document.getElementById("products-list-body");
  if (!tbody) return;

  if (!allProducts.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="table-loading">Walang products.</td></tr>`;
    return;
  }

  tbody.innerHTML = allProducts
    .map(
      (p) => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td>${p.barcode || "—"}</td>
      <td>₱${Number(p.price).toFixed(2)}</td>
      <td>${p.stock_quantity ?? 0}</td>
    </tr>
  `,
    )
    .join("");
}

// ============================================================
// ADD TO CART
// ============================================================
function addByBarcode(barcode) {
  const product = allProducts.find(
    (p) => (p.barcode || "").toLowerCase() === barcode.toLowerCase(),
  );

  if (!product) {
    alert(`Walang product na naka-register sa barcode: ${barcode}`);
    return;
  }

  addProductToCart(product);
}

function addToCartById(productId) {
  const product = allProducts.find((p) => p._id === productId);
  if (product) addProductToCart(product);
}

function addProductToCart(product) {
  const existing = cart.find((item) => item.product_id === product._id);

  if (existing) {
    existing.quantity += 1;
    existing.subtotal = existing.quantity * existing.unit_price;
  } else {
    cart.push({
      product_id: product._id,
      name: product.name,
      unit_price: Number(product.price),
      quantity: 1,
      subtotal: Number(product.price),
    });
  }

  saveAndRenderCart();
}

// ============================================================
// CART OPERATIONS
// ============================================================
function saveAndRenderCart() {
  localStorage.setItem("pos_cart", JSON.stringify(cart));
  renderCart();
}

function renderCart() {
  const container = document.getElementById("cart-items");

  if (!cart.length) {
    container.innerHTML = `<p class="empty-cart">Walang laman ang cart.</p>`;
    document.getElementById("subtotal").textContent = "₱0.00";
    document.getElementById("total").textContent = "₱0.00";
    return;
  }

  container.innerHTML = cart
    .map(
      (item) => `
    <div class="cart-item">
      <div class="cart-item-header">
        <div class="cart-item-name">${item.name}</div>
        <button class="cart-item-remove" onclick="removeFromCart('${item.product_id}')">🗑️</button>
      </div>
      <div class="cart-item-controls">
        <div class="qty-control">
          <button class="qty-btn" onclick="updateQuantity('${item.product_id}', -1)">−</button>
          <span class="qty-value">${item.quantity}</span>
          <button class="qty-btn" onclick="updateQuantity('${item.product_id}', 1)">+</button>
        </div>
        <div class="cart-item-subtotal">₱${item.subtotal.toFixed(2)}</div>
      </div>
    </div>
  `,
    )
    .join("");

  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
  document.getElementById("subtotal").textContent = `₱${total.toFixed(2)}`;
  document.getElementById("total").textContent = `₱${total.toFixed(2)}`;
}

function updateQuantity(productId, delta) {
  const item = cart.find((i) => i.product_id === productId);
  if (!item) return;

  item.quantity += delta;
  item.subtotal = item.quantity * item.unit_price;

  if (item.quantity <= 0) {
    cart = cart.filter((i) => i.product_id !== productId);
  }

  saveAndRenderCart();
}

function removeFromCart(productId) {
  cart = cart.filter((i) => i.product_id !== productId);
  saveAndRenderCart();
}

function clearCart() {
  if (!cart.length) return;
  if (!confirm("Sigurado ka bang gusto mong i-clear ang cart?")) return;
  cart = [];
  saveAndRenderCart();
}

// ============================================================
// SCANNER
// ============================================================
function openScanner() {
  const modal = document.getElementById("scanner-modal");
  modal.classList.add("show");

  scannerInstance = new Html5Qrcode("scanner-reader");

  scannerInstance
    .start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 150 } },
      (decodedText) => {
        addByBarcode(decodedText);
        closeScanner();
      },
      () => {},
    )
    .catch((err) => {
      console.error(err);
      alert("Hindi ma-access ang camera. Check mo ang permission.");
      closeScanner();
    });
}

function closeScanner() {
  if (scannerInstance && scannerInstance.isScanning) {
    scannerInstance
      .stop()
      .then(() => {
        scannerInstance.clear();
        scannerInstance = null;
      })
      .catch(() => {
        scannerInstance = null;
      });
  }
  document.getElementById("scanner-modal").classList.remove("show");
}

// ============================================================
// CHECKOUT
// ============================================================
function openCheckout() {
  if (!cart.length) {
    alert("Walang laman ang cart.");
    return;
  }

  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
  document.getElementById("checkout-total").textContent =
    `₱${total.toFixed(2)}`;
  document.getElementById("amount-received").value = "";
  document.getElementById("change-amount").textContent = "₱0.00";
  document.getElementById("checkout-modal").classList.add("show");
  document.getElementById("amount-received").focus();
}

function closeCheckout() {
  document.getElementById("checkout-modal").classList.remove("show");
}

function updateChange() {
  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const received =
    parseFloat(document.getElementById("amount-received").value) || 0;
  const change = received - total;

  const el = document.getElementById("change-amount");
  el.textContent = `₱${change.toFixed(2)}`;
  el.style.color = change < 0 ? "#dc2626" : "#065f46";
}

async function confirmCheckout() {
  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const paymentMethod = document.getElementById("payment-method").value;
  const amountReceived =
    parseFloat(document.getElementById("amount-received").value) || 0;

  if (paymentMethod === "cash" && amountReceived < total) {
    alert("Kulang ang bayad!");
    return;
  }

  const change = amountReceived - total;

  const orderPayload = {
    customer_id: WALK_IN_CUSTOMER_ID,
    items: cart.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
    })),
    pickup_date: new Date().toISOString(),
    pickup_time: `Walk-in (${paymentMethod.toUpperCase()})`,
  };

  const result = await apiCall("/orders", {
    method: "POST",
    body: JSON.stringify(orderPayload),
  });

  if (!result.success) {
    alert("Failed to save order: " + (result.error || "Unknown error"));
    return;
  }

  // Build order object for printing
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const now = new Date();

  const printOrder = {
    orderNumber: result.data._id.slice(-8).toUpperCase(),
    items: cart.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.unit_price,
      subtotal: item.subtotal,
    })),
    total,
    paymentMethod: paymentMethod.toUpperCase(),
    amountReceived,
    change,
    cashierName: user.full_name || "Staff",
    createdAt: now.toISOString(),
  };

  // Print receipt
  printReceipt(printOrder);

  // Clear cart
  cart = [];
  saveAndRenderCart();
  closeCheckout();
  loadProducts(); // reload para updated ang stock
}

// ============================================================
// PRINT RECEIPT
// ============================================================
function printReceipt(order) {
  const date = new Date(order.createdAt);
  const dateStr = date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td>${item.name}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">₱${item.price.toFixed(2)}</td>
      <td style="text-align:right">₱${item.subtotal.toFixed(2)}</td>
    </tr>
  `,
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Receipt ${order.orderNumber}</title>
  <style>
    @page { size: 58mm auto; margin: 2mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      width: 54mm;
      padding: 3mm;
      color: #000;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    h1 { font-size: 13px; margin-bottom: 2px; }
    .subtitle { font-size: 9px; margin-bottom: 8px; }
    .divider { border-top: 1px dashed #000; margin: 5px 0; }
    .divider-solid { border-top: 1px solid #000; margin: 5px 0; }
    .info { font-size: 9px; margin-bottom: 8px; }
    .info-row { display: flex; justify-content: space-between; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { text-align: left; font-size: 9px; border-bottom: 1px solid #000; padding: 3px 0; }
    td { padding: 2px 0; vertical-align: top; }
    .total-row { display: flex; justify-content: space-between; font-size: 10px; }
    .total-final { font-size: 13px; font-weight: bold; margin-top: 3px; }
    .thank-you { margin-top: 10px; font-size: 10px; }
  </style>
</head>
<body>
  <div class="center">
    <h1>BOSS RAINIER CHICHARON</h1>
    <div class="subtitle">Signature Chicharon</div>
    <div class="subtitle">ni Mrs. Marissa Del Rosario</div>
    <div class="subtitle">Patubig, Marilao, Bulacan</div>
    <div class="subtitle">📞 0935069928</div>
  </div>
  <div class="divider"></div>
  <div class="info">
    <div class="info-row"><span>Order #:</span><span>${order.orderNumber}</span></div>
    <div class="info-row"><span>Date:</span><span>${dateStr}</span></div>
    <div class="info-row"><span>Cashier:</span><span>${order.cashierName}</span></div>
  </div>
  <div class="divider-solid"></div>
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Price</th>
        <th style="text-align:right">Sub</th>
      </tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div class="divider-solid"></div>
  <div class="total-row total-final">
    <span>TOTAL</span>
    <span>₱${order.total.toFixed(2)}</span>
  </div>
  <div class="divider"></div>
  <div class="info">
    <div class="info-row"><span>Payment:</span><span>${order.paymentMethod}</span></div>
    <div class="info-row"><span>Received:</span><span>₱${order.amountReceived.toFixed(2)}</span></div>
    <div class="info-row"><span>Change:</span><span>₱${order.change.toFixed(2)}</span></div>
  </div>
  <div class="divider-solid"></div>
  <div class="center thank-you">
    <div class="bold">Salamat sa pagtangkilik!</div>
    <div>Bisitahin kami muli 🐷</div>
  </div>
</body>
</html>
  `;

  const printWindow = window.open("", "_blank", "width=400,height=600");
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}

// ============================================================
// ORDERS (My Walk-in Transactions)
// ============================================================
async function loadOrders() {
  const tbody = document.getElementById("orders-body");
  if (!tbody) return;

  const result = await apiCall("/orders");
  if (!result.success) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-loading">Failed to load orders.</td></tr>`;
    return;
  }

  // Filter only walk-in orders (customer_id = walk-in)
  const walkInOrders = (result.data || []).filter(
    (o) =>
      o.customer_id === WALK_IN_CUSTOMER_ID ||
      (o.customer_id && o.customer_id._id === WALK_IN_CUSTOMER_ID),
  );

  if (!walkInOrders.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-loading">Walang walk-in transactions.</td></tr>`;
    return;
  }

  tbody.innerHTML = walkInOrders
    .map((o) => {
      const itemsCount = (o.items || []).reduce((s, i) => s + i.quantity, 0);
      const date = new Date(o.order_date || o.createdAt).toLocaleString(
        "en-PH",
        {
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        },
      );
      const shortId = o._id.slice(-8).toUpperCase();

      return `
      <tr>
        <td>#${shortId}</td>
        <td>${date}</td>
        <td>${itemsCount} item${itemsCount !== 1 ? "s" : ""}</td>
        <td><strong>₱${Number(o.total_amount || 0).toFixed(2)}</strong></td>
        <td>${o.status}</td>
      </tr>
    `;
    })
    .join("");
}
