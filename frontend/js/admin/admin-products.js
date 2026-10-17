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
      <td>
        ${p.image_url ? `<img src="${p.image_url}" alt="${p.name}" style="width:40px; height:40px; object-fit:cover; border-radius:6px; margin-right:0.5rem; vertical-align:middle;" />` : ""}
        <strong>${p.name}</strong>
      </td>
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
          <button class="btn btn-sm btn-qr" onclick="showProductQR('${p.barcode}', '${p.name.replace(/'/g, "\\'")}')">📥 QR</button>
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

  // 🆕 Reset image
  selectedImageFile = null;
  uploadedImageUrl = "";
  const previewContainer = document.getElementById("image-preview-container");
  if (previewContainer) previewContainer.style.display = "none";
  const previewImg = document.getElementById("image-preview");
  if (previewImg) previewImg.src = "";

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
  // 🆕 Display expiration date
  const expDate = product.expiration_date
    ? new Date(product.expiration_date).toISOString().split("T")[0]
    : "";
  document.getElementById("product-expiration").value = expDate;

  // 🆕 Display nutrition facts
  const nf = product.nutrition_facts || {};
  document.getElementById("product-calories").value = nf.calories || 0;
  document.getElementById("product-fat").value = nf.fat || 0;
  document.getElementById("product-sodium").value = nf.sodium || 0;
  document.getElementById("product-protein").value = nf.protein || 0;

  // 🆕 Display existing image kung meron
  selectedImageFile = null;
  uploadedImageUrl = product.image_url || "";
  const previewContainer = document.getElementById("image-preview-container");
  const previewImg = document.getElementById("image-preview");

  if (product.image_url) {
    previewImg.src = product.image_url;
    previewContainer.style.display = "block";
  } else {
    previewContainer.style.display = "none";
    previewImg.src = "";
  }

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

  let imageUrl = uploadedImageUrl;
  if (selectedImageFile) {
    const saveBtn = e.target.querySelector('button[type="submit"]');
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = "Uploading image...";

    imageUrl = await uploadImageToImageBB();

    saveBtn.disabled = false;
    saveBtn.textContent = originalText;

    if (!imageUrl) {
      showAlert("Image upload failed. Product not saved.", "danger");
      return;
    }
  }

  const productData = {
    name: document.getElementById("product-name").value.trim(),
    description: document.getElementById("product-description").value.trim(),
    price: parseFloat(document.getElementById("product-price").value),
    stock_quantity: parseInt(document.getElementById("product-stock").value),
    barcode: document.getElementById("product-barcode").value.trim(),
    category_id: document.getElementById("product-category").value || null,
    image_url: imageUrl,
    // 🆕 BAGO
    expiration_date:
      document.getElementById("product-expiration").value || null,
    nutrition_facts: {
      calories:
        parseFloat(document.getElementById("product-calories").value) || 0,
      fat: parseFloat(document.getElementById("product-fat").value) || 0,
      sodium: parseFloat(document.getElementById("product-sodium").value) || 0,
      protein:
        parseFloat(document.getElementById("product-protein").value) || 0,
    },
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
// ============================================================
// IMAGE UPLOAD (ImageBB)
// ============================================================
const IMAGEBB_API_KEY = "e919cc0a1548edb76da693636bd973ba";

function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) {
    selectedImageFile = null;
    document.getElementById("image-preview-container").style.display = "none";
    return;
  }

  if (!file.type.startsWith("image/")) {
    alert("Mali ang file type. Image lang ang pwede.");
    event.target.value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("Masyadong malaki. Max 5MB.");
    event.target.value = "";
    return;
  }

  selectedImageFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById("image-preview").src = e.target.result;
    document.getElementById("image-preview-container").style.display = "block";
  };
  reader.readAsDataURL(file);
}

function removeImage() {
  selectedImageFile = null;
  uploadedImageUrl = "";
  document.getElementById("product-image").value = "";
  document.getElementById("image-preview-container").style.display = "none";
  document.getElementById("image-preview").src = "";
}

async function uploadImageToImageBB() {
  if (!selectedImageFile) return "";
  try {
    const base64 = await fileToBase64(selectedImageFile);
    const formData = new FormData();
    formData.append("key", IMAGEBB_API_KEY);
    formData.append("image", base64);

    const response = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData,
    });
    const result = await response.json();
    if (!result.success)
      throw new Error(result.error?.message || "Upload failed");
    return result.data.url;
  } catch (error) {
    console.error("Upload error:", error);
    alert(`Image upload failed: ${error.message}`);
    return "";
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
// ============================================================
// QR SCANNER
// ============================================================
let qrScannerInstance = null;

function openQRScanner() {
  const modal = document.getElementById("scanner-modal");
  modal.classList.add("show");

  document.getElementById("scan-status").innerHTML =
    '<p style="color: #1e40af;">⏳ Nag-i-init ng camera...</p>';

  qrScannerInstance = new Html5Qrcode("qr-reader");

  qrScannerInstance
    .start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        // ✅ Successfully scanned
        handleQRScan(decodedText);
        closeQRScanner();
      },
      () => {
        // Ignore per-frame errors
      },
    )
    .catch((err) => {
      console.error("Camera error:", err);
      document.getElementById("scan-status").innerHTML =
        '<p style="color: #dc2626;">❌ Hindi ma-access ang camera. Check permission.</p>';
    });
}

function closeQRScanner() {
  if (qrScannerInstance && qrScannerInstance.isScanning) {
    qrScannerInstance
      .stop()
      .then(() => {
        qrScannerInstance.clear();
        qrScannerInstance = null;
      })
      .catch(() => {
        qrScannerInstance = null;
      });
  }
  document.getElementById("scanner-modal").classList.remove("show");
}

async function handleQRScan(barcode) {
  // Show loading
  document.getElementById("scan-status").innerHTML =
    '<p style="color: #1e40af;">🔍 Hinahanap ang product...</p>';

  // Fetch product sa barcode
  const result = await apiCall(`/products/barcode/${barcode}`);

  if (!result.success) {
    alert(`❌ Walang product na naka-register sa barcode: ${barcode}`);
    return;
  }

  // Display product info
  displayProductInfo(result.data);
}

function displayProductInfo(product) {
  const content = document.getElementById("product-info-content");

  // Compute expiration status
  let expirationHtml = "";
  if (product.expiration_date) {
    const expDate = new Date(product.expiration_date);
    const now = new Date();
    const daysLeft = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));

    let statusClass = "expiration-ok";
    let statusText = `✅ ${daysLeft} days remaining`;

    if (daysLeft < 0) {
      statusClass = "expiration-danger";
      statusText = `❌ Expired ${Math.abs(daysLeft)} days ago`;
    } else if (daysLeft <= 7) {
      statusClass = "expiration-danger";
      statusText = `⚠️ Expires in ${daysLeft} days — URGENT!`;
    } else if (daysLeft <= 30) {
      statusClass = "expiration-warning";
      statusText = `⚠️ Expires in ${daysLeft} days`;
    }

    expirationHtml = `
      <div class="scanned-section">
        <h4>📅 Expiration Date</h4>
        <div class="info-row">
          <span>Expires on:</span>
          <strong>${expDate.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</strong>
        </div>
        <div class="expiration-warning ${statusClass}">
          ${statusText}
        </div>
      </div>
    `;
  } else {
    expirationHtml = `
      <div class="scanned-section">
        <h4>📅 Expiration Date</h4>
        <p style="color: var(--text-light); font-size: 0.85rem; text-align: center;">
          Walang expiration date na naka-set.
        </p>
      </div>
    `;
  }

  // Compute last ordered
  let lastOrderedHtml = "";
  if (product.last_ordered) {
    const lastDate = new Date(product.last_ordered);
    lastOrderedHtml = lastDate.toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } else {
    lastOrderedHtml = "Walang record";
  }

  // Nutrition facts
  const nf = product.nutrition_facts || {};

  content.innerHTML = `
    <div class="scanned-product">
      <div class="scanned-header">
        ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}" class="scanned-image" />` : ""}
        <div class="scanned-header-info">
          <h3>${product.name}</h3>
          <p>📁 ${product.category_id?.name || "No category"}</p>
          <p>🏷️ ${product.barcode}</p>
          <p>💰 ₱${Number(product.price).toFixed(2)} | 📦 Stock: ${product.stock_quantity}</p>
        </div>
      </div>

      <div class="scanned-section">
        <h4>📊 Nutrition Facts</h4>
        <div class="nutrition-grid">
          <div class="nutrition-item">
            <span>Calories:</span>
            <strong>${nf.calories || 0} kcal</strong>
          </div>
          <div class="nutrition-item">
            <span>Fat:</span>
            <strong>${nf.fat || 0} g</strong>
          </div>
          <div class="nutrition-item">
            <span>Sodium:</span>
            <strong>${nf.sodium || 0} mg</strong>
          </div>
          <div class="nutrition-item">
            <span>Protein:</span>
            <strong>${nf.protein || 0} g</strong>
          </div>
        </div>
      </div>

      ${expirationHtml}

      <div class="scanned-section">
        <h4>🕐 Last Ordered</h4>
        <div class="info-row">
          <span>Date & Time:</span>
          <strong>${lastOrderedHtml}</strong>
        </div>
      </div>
    </div>
  `;

  document.getElementById("product-info-modal").classList.add("show");
}

function closeProductInfo() {
  document.getElementById("product-info-modal").classList.remove("show");
}

function scanAnother() {
  closeProductInfo();
  setTimeout(() => {
    openQRScanner();
  }, 300);
}
// ============================================================
// QR CODE GENERATION
// ============================================================
let currentQRBarcode = "";
let currentQRName = "";

function showProductQR(barcode, name) {
  if (!barcode) {
    alert(
      "Walang barcode ang product na ito. I-edit muna at maglagay ng barcode.",
    );
    return;
  }

  currentQRBarcode = barcode;
  currentQRName = name;

  // Generate QR code using free API (api.qrserver.com)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(barcode)}&margin=10`;

  document.getElementById("qr-image").src = qrUrl;
  document.getElementById("qr-product-name").textContent = name;
  document.getElementById("qr-barcode").textContent = barcode;
  document.getElementById("qr-modal").classList.add("show");
}

function closeQRModal() {
  document.getElementById("qr-modal").classList.remove("show");
  document.getElementById("qr-image").src = "";
  currentQRBarcode = "";
  currentQRName = "";
}

async function downloadQR() {
  if (!currentQRBarcode) return;

  try {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(currentQRBarcode)}&margin=10`;

    // Fetch the image
    const response = await fetch(qrUrl);
    const blob = await response.blob();

    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QR-${currentQRBarcode}-${currentQRName.replace(/\s+/g, "-")}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Show success
    alert(`✅ QR code downloaded: ${a.download}`);
  } catch (error) {
    console.error("Download error:", error);
    alert("❌ Hindi ma-download ang QR code. Check internet connection.");
  }
}
