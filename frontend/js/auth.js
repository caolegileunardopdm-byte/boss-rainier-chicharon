// ==================== TAB SWITCHING ====================
function switchTab(tab) {
  // Update tab buttons
  const tabs = document.querySelectorAll(".auth-tab");
  tabs.forEach((t) => {
    t.classList.toggle("active", t.dataset.tab === tab);
  });

  // Update panels
  const panels = document.querySelectorAll(".auth-panel");
  panels.forEach((p) => {
    p.classList.toggle("active", p.id === `${tab}-panel`);
  });

  // Clear alert
  const alertEl = document.getElementById("alert");
  if (alertEl) {
    alertEl.classList.remove("show");
    alertEl.textContent = "";
  }

  // ==================== UPDATE NAVBAR LINK ====================
  const navbarLink = document.getElementById("navbar-auth-link");
  if (navbarLink) {
    if (tab === "login") {
      // If on Login tab, show "Register" link
      navbarLink.innerHTML = `
        <a href="#" onclick="switchTab('register'); return false;">Register</a>
      `;
    } else {
      // If on Register tab, show "Login" link
      navbarLink.innerHTML = `
        <a href="#" onclick="switchTab('login'); return false;">Login</a>
      `;
    }
  }
  // ============================================================

  // Update URL hash
  window.location.hash = tab;
}

// ==================== INITIALIZE ====================
document.addEventListener("DOMContentLoaded", () => {
  // Check if there's a hash in URL (#register or #login)
  const hash = window.location.hash.replace("#", "");
  if (hash === "register") {
    switchTab("register");
  } else {
    switchTab("login");
  }

  // Attach form handlers
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
  }

  // Update cart count
  const cartCountEl = document.getElementById("cart-count");
  if (cartCountEl) {
    cartCountEl.textContent = getCartCount();
  }
});

// ==================== HANDLE LOGIN ====================
async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  if (!email || !password) {
    showAlert("Please fill in all fields", "danger");
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "Logging in...";

  const result = await apiCall("/users/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  submitBtn.disabled = false;
  submitBtn.textContent = "Login";

  if (!result.success) {
    showAlert(result.error || "Login failed", "danger");
    return;
  }

  // Save token and user to localStorage
  localStorage.setItem("token", result.data.token);
  localStorage.setItem("user", JSON.stringify(result.data.user));

  showAlert("Login successful! Redirecting...", "success");

  // Redirect based on role
  setTimeout(() => {
    const role = result.data.user.role;
    if (role === "admin" || role === "staff") {
      window.location.href = "admin/dashboard.html";
    } else {
      window.location.href = "products.html";
    }
  }, 1000);
}

// ==================== HANDLE REGISTER ====================
async function handleRegister(e) {
  e.preventDefault();

  const full_name = document.getElementById("reg-fullname").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const username = document.getElementById("reg-username").value.trim();
  const password = document.getElementById("reg-password").value;
  const phone = document.getElementById("reg-phone").value.trim();
  const address = document.getElementById("reg-address").value.trim();

  if (!full_name || !email || !username || !password) {
    showAlert("Please fill in all required fields", "danger");
    return;
  }

  if (password.length < 6) {
    showAlert("Password must be at least 6 characters", "danger");
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "Creating account...";

  const result = await apiCall("/users/register", {
    method: "POST",
    body: JSON.stringify({
      full_name,
      email,
      username,
      password,
      phone,
      address,
      role: "customer",
    }),
  });

  submitBtn.disabled = false;
  submitBtn.textContent = "Create Account";

  if (!result.success) {
    showAlert(result.error || "Registration failed", "danger");
    return;
  }

  showAlert("Account created! Switching to login...", "success");

  // Clear register form
  e.target.reset();

  // Switch to login tab after 1.5 seconds
  setTimeout(() => {
    switchTab("login");
    // Pre-fill email
    document.getElementById("login-email").value = email;
  }, 1500);
}

// ==================== SHOW ALERT ====================
function showAlert(message, type) {
  const alertEl = document.getElementById("alert");
  if (!alertEl) return;

  alertEl.className = `alert alert-${type} show`;
  alertEl.textContent = message;

  setTimeout(() => {
    alertEl.classList.remove("show");
    alertEl.textContent = "";
  }, 5000);
}
