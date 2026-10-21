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
  if (name === "online") {
    // Clear search result on section switch
    document.getElementById("online-order-result").innerHTML = "";
    document.getElementById("online-order-search").value = "";
  }
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
    .map((p) => {
      const isOutOfStock = (p.stock_quantity || 0) <= 0;

      // Kung sold out, walang onclick at may special style
      const clickAction = isOutOfStock
        ? ""
        : `onclick="addToCartById('${p._id}')"`;
      const cardStyle = isOutOfStock
        ? "opacity: 0.6; cursor: not-allowed; position: relative; background: #f9fafb;"
        : "";

      return `
    <div class="product-card" ${clickAction} style="${cardStyle}">
      ${isOutOfStock ? `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-15deg); color: #dc2626; font-size: 1.2rem; font-weight: bold; border: 2px solid #dc2626; padding: 0.3rem 0.8rem; border-radius: 6px; background: rgba(255,255,255,0.9); z-index: 10;">SOLD OUT</div>` : ""}
      
      <div class="name" style="${isOutOfStock ? "color: #9ca3af;" : ""}">${p.name}</div>
      <div class="barcode" style="${isOutOfStock ? "color: #9ca3af;" : ""}">${p.barcode || "—"}</div>
      <div class="price" style="${isOutOfStock ? "color: #9ca3af;" : ""}">₱${Number(p.price).toFixed(2)}</div>
      <div class="stock" style="color: ${isOutOfStock ? "#dc2626" : "inherit"}; font-weight: ${isOutOfStock ? "bold" : "normal"};">
        ${isOutOfStock ? "Out of Stock" : `Stock: ${p.stock_quantity}`}
      </div>
    </div>
  `;
    })
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
  // 🆕 Check kung out of stock
  if ((product.stock_quantity || 0) <= 0) {
    alert(`⚠️ SOLD OUT!\n\nWalang stock ang ${product.name}.`);
    return;
  }

  const existing = cart.find((item) => item.product_id === product._id);

  if (existing) {
    // 🆕 Check kung lalampas na sa available stock
    if (existing.quantity + 1 > product.stock_quantity) {
      alert(
        `⚠️ Hindi na pwedeng magdagdag!\n\nKulang na ang stock ng ${product.name}. Available: ${product.stock_quantity}`,
      );
      return;
    }
    existing.quantity += 1;
    existing.subtotal = existing.quantity * existing.unit_price;
  } else {
    cart.push({
      product_id: product._id,
      name: product.name,
      unit_price: Number(product.price),
      quantity: 1,
      subtotal: Number(product.price),
      expiration_date: product.expiration_date || null,
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

  // 🆕 Check kung lalampas na sa stock kapag nag-plus
  if (delta > 0) {
    const product = allProducts.find((p) => p._id === productId);
    if (product && item.quantity + 1 > product.stock_quantity) {
      alert(
        `⚠️ Hindi na pwedeng magdagdag!\n\nKulang na ang stock ng ${product.name}. Available: ${product.stock_quantity}`,
      );
      return;
    }
  }

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
    status: "completed", // 🆕 AUTO-COMPLETE
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
      expiration_date: item.expiration_date || null,
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
    .map((item) => {
      let expDateHtml = "";
      if (item.expiration_date) {
        const exp = new Date(item.expiration_date);
        expDateHtml = `<div style="font-size: 9px; color: #6b7280; padding-left: 3px;">📅 Expires: ${exp.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}</div>`;
      }

      return `
    <tr>
      <td>
        ${item.name}
        ${expDateHtml}
      </td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">₱${item.price.toFixed(2)}</td>
      <td style="text-align:right">₱${item.subtotal.toFixed(2)}</td>
    </tr>
  `;
    })
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
    <h1>Crispy Chicharon</h1>
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
// ORDERS (My Walk-in Transactions) - MAY SEARCH BAR NA
// ============================================================
async function loadOrders() {
  const tbody = document.getElementById("orders-body");
  if (!tbody) return;

  const result = await apiCall("/orders");
  if (!result.success) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-loading">Failed to load orders.</td></tr>`;
    return;
  }

  const walkInOrders = (result.data || []).filter(
    (o) =>
      o.customer_id === WALK_IN_CUSTOMER_ID ||
      (o.customer_id && o.customer_id._id === WALK_IN_CUSTOMER_ID),
  );

  // 🆕 I-save sa global variable para magamit sa search
  window.currentWalkInOrders = walkInOrders;

  // 🆕 I-render ang table gamit ang bagong function
  renderWalkInOrdersTable();
}

// ============================================================
// 🆕 RENDER WALK-IN ORDERS TABLE (May Search Filter)
// ============================================================
function renderWalkInOrdersTable() {
  const tbody = document.getElementById("orders-body");
  if (!tbody) return;

  let orders = window.currentWalkInOrders || [];
  const searchInput = document.getElementById("order-search");
  const searchQuery = searchInput ? searchInput.value.trim().toUpperCase() : "";

  // 🆕 Filter base sa search query
  if (searchQuery) {
    orders = orders.filter((o) =>
      o._id.slice(-8).toUpperCase().includes(searchQuery),
    );
  }

  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-loading">Walang nahanap na order.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders
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
        <td>
          <button class="btn-sm btn-cancel-order" onclick="cancelCashierOrder('${o._id}')">Cancel</button>
        </td>
      </tr>
    `;
    })
    .join("");
}

// 🆕 FUNCTION PARA SA ONINPUT NG SEARCH BAR
function filterWalkInOrders() {
  renderWalkInOrdersTable();
}

// ============================================================
// CANCEL ORDER (Cashier)
// ============================================================
async function cancelCashierOrder(orderId) {
  if (
    !confirm(
      "Sigurado ka bang gusto mong i-cancel ang order na ito? Mabubura ito sa admin records.",
    )
  ) {
    return;
  }

  const result = await apiCall(`/orders/${orderId}`, {
    method: "DELETE",
  });

  if (!result.success) {
    alert("Failed to cancel order: " + (result.error || "Unknown error"));
    return;
  }

  alert("✅ Order cancelled and removed from records.");
  loadOrders();
}
// ============================================================
// ONLINE ORDERS (Search & Print)
// ============================================================
async function searchOnlineOrder() {
  const input = document.getElementById("online-order-search");
  const resultContainer = document.getElementById("online-order-result");
  const orderCode = input.value.trim().toUpperCase();

  if (!orderCode) {
    alert("Please enter an order number.");
    return;
  }

  resultContainer.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <div class="spinner"></div>
      <p style="color: var(--text-light); margin-top: 1rem;">Searching order...</p>
    </div>
  `;

  // Kunin lahat ng orders
  const result = await apiCall("/orders");

  if (!result.success || !result.data) {
    resultContainer.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--danger);">
        <p>❌ Failed to search orders. Please try again.</p>
      </div>
    `;
    return;
  }

  // Hanapin ang order sa code (last 8 chars)
  const foundOrder = result.data.find(
    (o) => o._id.slice(-8).toUpperCase() === orderCode,
  );

  if (!foundOrder) {
    resultContainer.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
        <h2 style="color: var(--danger); margin-bottom: 0.5rem;">Order Not Found</h2>
        <p style="color: var(--text-light);">Walang order na may code: <strong>#${orderCode}</strong></p>
      </div>
    `;
    return;
  }

  // I-display ang order details
  renderOnlineOrderDetails(foundOrder);
}

function renderOnlineOrderDetails(order) {
  const resultContainer = document.getElementById("online-order-result");

  const items = order.items || [];
  const itemsHtml = items
    .map(
      (item) => `
    <tr>
      <td>${item.name}</td>
      <td style="text-align: center;">${item.quantity}</td>
      <td style="text-align: right;">₱${item.unit_price.toFixed(2)}</td>
      <td style="text-align: right;">₱${item.subtotal.toFixed(2)}</td>
    </tr>
  `,
    )
    .join("");

  const customerName = order.customer_id?.full_name || "N/A";
  const customerEmail = order.customer_id?.email || "N/A";
  const customerPhone = order.customer_id?.phone || "N/A";
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

  resultContainer.innerHTML = `
    <div style="background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); max-width: 800px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid var(--gray-200);">
        <div>
          <h2 style="color: var(--primary); margin-bottom: 0.25rem;">Order #${order._id.slice(-8).toUpperCase()}</h2>
          <p style="color: var(--text-light); font-size: 0.9rem;">Placed: ${orderDate}</p>
        </div>
        <span class="status-badge status-${order.status}" style="font-size: 1rem; padding: 0.5rem 1rem;">
          ${order.status.toUpperCase()}
        </span>
      </div>

      <div style="margin-bottom: 1.5rem;">
        <h3 style="color: var(--primary); font-size: 0.9rem; margin-bottom: 0.5rem; text-transform: uppercase;">Customer Details</h3>
        <p><strong>Name:</strong> ${customerName}</p>
        <p><strong>Email:</strong> ${customerEmail}</p>
        <p><strong>Phone:</strong> ${customerPhone}</p>
      </div>

      <div style="margin-bottom: 1.5rem;">
        <h3 style="color: var(--primary); font-size: 0.9rem; margin-bottom: 0.5rem; text-transform: uppercase;">Pick-up Details</h3>
        <p><strong>Date:</strong> ${pickupDate}</p>
        <p><strong>Time:</strong> ${order.pickup_time || "N/A"}</p>
      </div>

      <div style="margin-bottom: 1.5rem;">
        <h3 style="color: var(--primary); font-size: 0.9rem; margin-bottom: 0.5rem; text-transform: uppercase;">Order Items</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid var(--gray-200);">
              <th style="text-align: left; padding: 0.5rem 0; font-size: 0.85rem; color: var(--text-light);">Item</th>
              <th style="text-align: center; padding: 0.5rem 0; font-size: 0.85rem; color: var(--text-light);">Qty</th>
              <th style="text-align: right; padding: 0.5rem 0; font-size: 0.85rem; color: var(--text-light);">Price</th>
              <th style="text-align: right; padding: 0.5rem 0; font-size: 0.85rem; color: var(--text-light);">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; border-top: 2px solid var(--gray-200); margin-bottom: 1.5rem;">
        <span style="font-size: 1.1rem; font-weight: 600;">TOTAL:</span>
        <span style="font-size: 1.5rem; font-weight: bold; color: var(--primary);">₱${Number(order.total_amount).toFixed(2)}</span>
      </div>

            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
        <button onclick="printOnlineOrderReceipt('${order._id}')" style="flex: 2; min-width: 150px; padding: 0.75rem; background: var(--primary); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 1rem;">
          🖨️ Print Receipt
        </button>
        
        ${
          order.status !== "refunded" && order.status !== "cancelled"
            ? `
          <button onclick="confirmRefundOrder('${order._id}', '${order._id.slice(-8).toUpperCase()}')" style="flex: 1; min-width: 150px; padding: 0.75rem; background: var(--danger, #ef4444); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 1rem;">
            🔄 Refund Item
          </button>
          `
            : ""
        }

        <button onclick="clearOnlineSearch()" style="flex: 1; min-width: 100px; padding: 0.75rem; background: var(--gray-200); color: var(--text-dark); border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
          Clear
        </button>
      </div>
    </div>
  `;
}

function clearOnlineSearch() {
  document.getElementById("online-order-search").value = "";
  document.getElementById("online-order-result").innerHTML = "";
}

// ============================================================
// PRINT RECEIPT FOR ONLINE ORDER
// ============================================================
// ============================================================
// PRINT RECEIPT FOR ONLINE ORDER
// ============================================================
async function printOnlineOrderReceipt(orderId) {
  const result = await apiCall(`/orders/${orderId}`);

  if (!result.success || !result.data) {
    alert("Failed to load order details.");
    return;
  }

  let order = result.data;
  const isRefunded = order.status === "refunded" || order.is_refunded === true;

  let completedSuccessfully = false;
  let paymentSavedSuccessfully = false;

  // 🆕 STEP 1: AUTO-COMPLETE MUNA
  if (!["completed", "cancelled", "refunded"].includes(order.status)) {
    try {
      const updateRes = await apiCall(`/orders/${order._id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "completed" }),
      });
      if (updateRes.success) {
        order.status = "completed";
        completedSuccessfully = true;
        console.log("✅ Order auto-completed");
      } else {
        console.error("❌ Failed to auto-complete:", updateRes.error);
      }
    } catch (err) {
      console.error("❌ Auto-complete error:", err);
    }
  } else {
    // Kung completed na talaga from the start
    completedSuccessfully = true;
  }

  // 🆕 STEP 2: AUTO-SAVE PAYMENT AS PAID
  if (order.status === "completed") {
    try {
      const existing = await apiCall("/payments");
      const hasPayment = existing.data?.some(
        (p) => p.order_id === order._id || p.order_id?._id === order._id,
      );

      if (!hasPayment) {
        const payRes = await apiCall("/payments", {
          method: "POST",
          body: JSON.stringify({
            order_id: order._id,
            payment_method: "cash",
            amount: order.total_amount,
            status: "paid",
            transaction_ref: `ONLINE-${order._id.slice(-8).toUpperCase()}`,
            payment_details: {},
          }),
        });

        if (payRes.success) {
          paymentSavedSuccessfully = true;
          console.log("✅ Payment auto-saved as Paid");
        } else {
          console.error("❌ Failed to save payment:", payRes.error);
        }
      } else {
        // Meron nang payment record
        paymentSavedSuccessfully = true;
        console.log("ℹ️ Payment already exists");
      }
    } catch (err) {
      console.error("❌ Payment save error:", err);
    }
  }

  // 🆕 IPAKITA ANG NOTIFICATION SA USER
  if (order.status === "completed") {
    if (paymentSavedSuccessfully) {
      alert(
        `✅ ORDER COMPLETED!\n\nNaka-save na sa Payments Record at Analytics ang ₱${order.total_amount.toFixed(2)}.`,
      );
    } else {
      alert(
        `⚠️ ORDER COMPLETED!\n\nPero nagka-problema sa pag-save ng Payment Record. Check ang Console.`,
      );
    }
  }

  // 🆕 Declare refundWatermark variable
  const refundWatermark = isRefunded
    ? `<div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 40px; font-weight: bold; color: rgba(239, 68, 68, 0.3); z-index: 9999; pointer-events: none; white-space: nowrap;">REFUNDED</div>`
    : "";

  const itemsHtml = (order.items || [])
    .map((item) => {
      let expDateHtml = "";
      if (item.product_id?.expiration_date) {
        const exp = new Date(item.product_id.expiration_date);
        expDateHtml = `<div style="font-size: 9px; color: #6b7280; padding-left: 3px;">📅 Expires: ${exp.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}</div>`;
      }

      return `
      <tr>
        <td>
          ${item.name}
          ${expDateHtml}
        </td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">₱${item.unit_price.toFixed(2)}</td>
        <td style="text-align:right">₱${item.subtotal.toFixed(2)}</td>
      </tr>
    `;
    })
    .join("");

  const customerName = order.customer_id?.full_name || "Walk-in Customer";
  const dateStr = new Date(order.createdAt).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Receipt ${order._id.slice(-8).toUpperCase()}</title>
  <style>
    @page { size: 58mm auto; margin: 2mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 11px; width: 54mm; padding: 3mm; color: #000; }
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
   ${refundWatermark}
  <div class="center">
    <h1>CRISPY CHICHARON</h1>
    <div class="subtitle">Signature Chicharon</div>
    <div class="subtitle">ni Mrs. Marissa Del Rosario</div>
    <div class="subtitle">Patubig, Marilao, Bulacan</div>
    <div class="subtitle">📞 0935069928</div>
  </div>
  <div class="divider"></div>
  <div class="info">
    <div class="info-row"><span>Order #:</span><span>${order._id.slice(-8).toUpperCase()}</span></div>
    <div class="info-row"><span>Date:</span><span>${dateStr}</span></div>
    <div class="info-row"><span>Customer:</span><span>${customerName}</span></div>
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
    <span>₱${order.total_amount.toFixed(2)}</span>
  </div>
  <div class="divider"></div>
  <div class="info">
    <div class="info-row"><span>Pickup Date:</span><span>${order.pickup_date ? new Date(order.pickup_date).toLocaleDateString("en-PH") : "N/A"}</span></div>
    <div class="info-row"><span>Pickup Time:</span><span>${order.pickup_time || "N/A"}</span></div>
  </div>
    ${
      isRefunded
        ? `
    <div class="divider-solid"></div>
    <div class="center" style="margin-top: 10px;">
      <div style="font-size: 14px; font-weight: bold; color: #dc2626; padding: 8px; border: 2px solid #dc2626; border-radius: 4px;">
        ❌ REFUNDED
      </div>
      <div style="font-size: 9px; color: #6b7280; margin-top: 4px;">
        Ang resibong ito ay na-refund na.
      </div>
    </div>
  `
        : ""
    }
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
// REFUND ORDER (Staff)
// ============================================================
async function confirmRefundOrder(orderId, orderCode) {
  if (
    !confirm(
      `⚠️ I-REFUND ANG ORDER #${orderCode}?\n\nMababawas ito sa Total Sales at mare-record bilang Loss. Hindi na ito maibabalik.`,
    )
  ) {
    return;
  }

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const result = await apiCall(`/orders/${orderId}/refund`, {
    method: "PUT",
    body: JSON.stringify({ staff_id: user._id }),
  });

  if (!result.success) {
    alert("❌ Failed to refund order: " + (result.error || "Unknown error"));
    return;
  }

  alert("✅ Order refunded successfully! Bawas na ito sa Total Sales.");

  // I-refresh ang search para makita ang bagong status
  searchOnlineOrder();
}
