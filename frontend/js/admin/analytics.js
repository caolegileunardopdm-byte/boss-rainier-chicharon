// ============================================================
// SALES ANALYTICS — wrapped in IIFE to avoid global conflicts
// ============================================================
(function () {
  "use strict";

  // ============================================================
  // CONFIG
  // ============================================================
  let currentPeriod = "weekly";
  let salesChart = null;
  let productsChart = null;
  let categoryChart = null;

  // ============================================================
  // INIT
  // ============================================================
  document.addEventListener("DOMContentLoaded", () => {
    loadAnalytics("weekly");
  });

  // Expose to window (para magamit ng HTML onclick)
  window.setPeriod = function (period) {
    currentPeriod = period;
    document.querySelectorAll(".period-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.period === period);
    });
    loadAnalytics(period);
  };

  window.refreshData = function () {
    loadAnalytics(currentPeriod);
  };

  // ============================================================
  // LOAD DATA
  // ============================================================
  async function loadAnalytics(period) {
    try {
      const result = await apiCall("/orders");

      if (!result.success) {
        console.error("Failed to load orders:", result.error);
        return;
      }

      const orders = result.data || [];

      updateStats(orders, period);
      renderSalesChart(orders, period);
      renderProductsChart(orders, period);
      renderCategoryChart(orders, period);
    } catch (err) {
      console.error("Error loading analytics:", err);
    }
  }

  // ============================================================
  // STATS CARDS
  // ============================================================
  function updateStats(orders, period) {
    const filtered = filterByPeriod(orders, period);

    const totalSales = filtered.reduce(
      (sum, o) => sum + Number(o.total_amount || 0),
      0,
    );
    const orderCount = filtered.length;
    const average = orderCount > 0 ? totalSales / orderCount : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySales = orders
      .filter((o) => new Date(o.order_date || o.createdAt) >= today)
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    document.getElementById("stat-total").textContent =
      `₱${totalSales.toFixed(2)}`;
    document.getElementById("stat-orders").textContent = orderCount;
    document.getElementById("stat-average").textContent =
      `₱${average.toFixed(2)}`;
    document.getElementById("stat-today").textContent =
      `₱${todaySales.toFixed(2)}`;
  }

  function filterByPeriod(orders, period) {
    const now = new Date();
    let cutoff = new Date();

    switch (period) {
      case "daily":
        cutoff.setDate(now.getDate() - 7);
        break;
      case "weekly":
        cutoff.setDate(now.getDate() - 7 * 8);
        break;
      case "monthly":
        cutoff.setMonth(now.getMonth() - 12);
        break;
      case "yearly":
        cutoff.setFullYear(now.getFullYear() - 5);
        break;
    }

    return orders.filter((o) => {
      const d = new Date(o.order_date || o.createdAt);
      return d >= cutoff;
    });
  }

  // ============================================================
  // CHART 1: SALES OVER TIME
  // ============================================================
  function renderSalesChart(orders, period) {
    const data = groupByPeriod(orders, period);
    const ctx = document.getElementById("salesChart").getContext("2d");

    if (salesChart) salesChart.destroy();

    salesChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Sales (₱)",
            data: data.values,
            borderColor: "#92400e",
            backgroundColor: "rgba(217, 119, 6, 0.15)",
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: "#92400e",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#92400e",
            titleColor: "#fff",
            bodyColor: "#fff",
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => `₱${ctx.parsed.y.toFixed(2)}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => `₱${value}`,
              color: "#6b7280",
            },
            grid: { color: "#e5e7eb" },
          },
          x: {
            ticks: { color: "#6b7280" },
            grid: { display: false },
          },
        },
      },
    });
  }

  function groupByPeriod(orders, period) {
    const groups = {};

    orders.forEach((o) => {
      const date = new Date(o.order_date || o.createdAt);
      let key;

      switch (period) {
        case "daily":
          key = date.toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
          });
          break;
        case "weekly":
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `Week of ${weekStart.toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
          })}`;
          break;
        case "monthly":
          key = date.toLocaleDateString("en-PH", {
            month: "short",
            year: "numeric",
          });
          break;
        case "yearly":
          key = date.getFullYear().toString();
          break;
      }

      if (!groups[key]) groups[key] = 0;
      groups[key] += Number(o.total_amount || 0);
    });

    const sortedKeys = Object.keys(groups);
    return {
      labels: sortedKeys,
      values: sortedKeys.map((k) => groups[k]),
    };
  }

  // ============================================================
  // CHART 2: TOP SELLING PRODUCTS
  // ============================================================
  function renderProductsChart(orders, period) {
    const filtered = filterByPeriod(orders, period);
    const productTotals = {};

    filtered.forEach((o) => {
      (o.items || []).forEach((item) => {
        const name = item.name || "Unknown";
        if (!productTotals[name]) productTotals[name] = 0;
        productTotals[name] += Number(item.quantity || 0);
      });
    });

    const sorted = Object.entries(productTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const ctx = document.getElementById("productsChart").getContext("2d");

    if (productsChart) productsChart.destroy();

    productsChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: sorted.map(([name]) => name),
        datasets: [
          {
            label: "Quantity Sold",
            data: sorted.map(([, qty]) => qty),
            backgroundColor: [
              "#92400e",
              "#d97706",
              "#fbbf24",
              "#f59e0b",
              "#fcd34d",
            ],
            borderRadius: 6,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#92400e",
            padding: 12,
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { color: "#6b7280" },
            grid: { color: "#e5e7eb" },
          },
          y: {
            ticks: { color: "#1f2937", font: { weight: "600" } },
            grid: { display: false },
          },
        },
      },
    });
  }

  // ============================================================
  // CHART 3: SALES BY CATEGORY
  // ============================================================
  function renderCategoryChart(orders, period) {
    const filtered = filterByPeriod(orders, period);
    const categoryTotals = {};

    filtered.forEach((o) => {
      (o.items || []).forEach((item) => {
        const category = item.product_id?.category_id?.name || "Uncategorized";
        if (!categoryTotals[category]) categoryTotals[category] = 0;
        categoryTotals[category] += Number(item.subtotal || 0);
      });
    });

    const labels = Object.keys(categoryTotals);
    const values = Object.values(categoryTotals);

    const ctx = document.getElementById("categoryChart").getContext("2d");

    if (categoryChart) categoryChart.destroy();

    if (!labels.length) {
      categoryChart = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: ["No data"],
          datasets: [{ data: [1], backgroundColor: ["#e5e7eb"] }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
        },
      });
      return;
    }

    categoryChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: [
              "#92400e",
              "#d97706",
              "#fbbf24",
              "#10b981",
              "#f59e0b",
              "#ef4444",
            ],
            borderWidth: 3,
            borderColor: "#fff",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: {
              color: "#1f2937",
              font: { size: 12, weight: "500" },
              padding: 12,
            },
          },
          tooltip: {
            backgroundColor: "#92400e",
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const percent = ((ctx.parsed / total) * 100).toFixed(1);
                return `${ctx.label}: ₱${ctx.parsed.toFixed(2)} (${percent}%)`;
              },
            },
          },
        },
      },
    });
  }
})();
