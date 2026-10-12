// ==================== INITIALIZE ====================
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
  }
});

// ==================== HANDLE LOGIN ====================
async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

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

  const full_name = document.getElementById("full_name").value.trim();
  const email = document.getElementById("email").value.trim();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const phone = document.getElementById("phone").value.trim();
  const address = document.getElementById("address").value.trim();

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
  submitBtn.textContent = "Register";

  if (!result.success) {
    showAlert(result.error || "Registration failed", "danger");
    return;
  }

  showAlert("Account created! Redirecting to login...", "success");

  setTimeout(() => {
    window.location.href = "login.html";
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
  }, 5000);
}
