/* Storage Purge Helper for Old Dummy Products */
if (typeof sessionStorage !== "undefined" && !sessionStorage.getItem('gc_dummy_purged')) {
  localStorage.removeItem('gc_products');
  sessionStorage.setItem('gc_dummy_purged', 'true');
}

let isAdminLoggedIn = false;
let isLoginInProgress = false;

// Helper: Check if user is authorized as an Admin (Primary Admin or listed in Firestore 'admins' collection)
async function isAuthorizedAdmin(user) {
  if (!user || !user.email) return false;
  const normalizedEmail = user.email.toLowerCase();

  // Primary Superadmin bypass
  if (normalizedEmail === "radhejal89@gmail.com") return true;

  // Check Firestore 'admins' collection for registered admin document
  try {
    if (window.db) {
      const docRef = await window.db.collection("admins").doc(normalizedEmail).get();
      if (docRef.exists) return true;
    }
  } catch (err) {
    console.warn("Error checking admin authorization in Firestore:", err);
  }

  return false;
}

document.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById("adminApp")) return;

  // 1. Instant State Evaluation on Load: Immediately evaluate session to eliminate 0ms flicker on refresh
  const hasLocalSession = (localStorage.getItem("gc_admin_session") === "true") || 
                          (localStorage.getItem("adminLoggedIn") === "true") || 
                          (sessionStorage.getItem("gc_admin_session") === "true") ||
                          (sessionStorage.getItem("gc_admin_logged_in") === "true");

  if (hasLocalSession) {
    isAdminLoggedIn = true;
    if (document.documentElement) {
      document.documentElement.classList.add("admin-session-active");
    }
    showDashboard();
  } else {
    isAdminLoggedIn = false;
    if (document.documentElement) {
      document.documentElement.classList.remove("admin-session-active");
    }
    showLogin();
  }

  // 2. Background Firebase Auth Confirmation & State Sync
  if (typeof firebase !== "undefined" && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
      if (user) {
        const authorized = await isAuthorizedAdmin(user);
        if (authorized) {
          isAdminLoggedIn = true;
          localStorage.setItem("gc_admin_session", "true");
          localStorage.setItem("adminLoggedIn", "true");
          sessionStorage.setItem("gc_admin_session", "true");
          if (document.documentElement) {
            document.documentElement.classList.add("admin-session-active");
          }
          if (!isLoginInProgress) {
            await showDashboard();
          }

          // Background Firestore Admin Profile Sync
          try {
            if (window.db) {
              const primaryAdminEmail = "radhejal89@gmail.com";
              const timestamp = (firebase.firestore && firebase.firestore.FieldValue)
                ? firebase.firestore.FieldValue.serverTimestamp()
                : new Date().toISOString();
              await window.db.collection("admins").doc(user.email.toLowerCase()).set({
                email: user.email.toLowerCase(),
                role: (user.email.toLowerCase() === primaryAdminEmail) ? "superadmin" : "admin",
                lastLogin: timestamp
              }, { merge: true });
            }
          } catch (syncErr) {
            console.warn("Background admin profile sync warning:", syncErr);
          }
          return;
        }
      }
      
      // User is logged out or unauthorized: Clear session and show login
      isAdminLoggedIn = false;
      localStorage.removeItem("gc_admin_session");
      localStorage.removeItem("adminLoggedIn");
      sessionStorage.removeItem("gc_admin_session");
      sessionStorage.removeItem("gc_admin_logged_in");
      if (document.documentElement) {
        document.documentElement.classList.remove("admin-session-active");
      }
      showLogin();
    });
  }

  setupLoginHandler();
  setupLogoutHandler();
  setupSidebarToggle();
  setupTabNavigation();
  setupProductForm();
});

function setupLoginHandler() {
  const form = document.getElementById("adminLoginForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]') || document.getElementById("adminLoginSubmitBtn");
    const loginCard = document.getElementById("adminLoginCard") || document.querySelector(".login-card");
    const emailInput = document.getElementById("adminEmail");
    const passwordInput = document.getElementById("adminPassword");

    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value.trim() : "";

    // Helper: Reset button state
    const resetButtonState = () => {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to Dashboard';
        submitBtn.style.opacity = "";
        submitBtn.style.cursor = "";
      }
    };

    // Helper: Shake animation for visual error feedback
    const triggerCardShake = () => {
      if (loginCard) {
        loginCard.classList.remove("admin-shake");
        void loginCard.offsetWidth; // Force CSS reflow to re-trigger animation
        loginCard.classList.add("admin-shake");
        setTimeout(() => {
          loginCard.classList.remove("admin-shake");
        }, 500);
      }
    };

    if (!email || !password) {
      triggerCardShake();
      if (window.showToast) {
        window.showToast("Please enter both email and password.", "error");
      } else {
        alert("Please enter both email and password.");
      }
      return;
    }

    // 1. Button Loading State Animation
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
      submitBtn.style.opacity = "0.85";
      submitBtn.style.cursor = "wait";
    }

    isLoginInProgress = true;

    try {
      if (typeof firebase === "undefined" || !firebase.auth) {
        throw new Error("Firebase Authentication SDK is not available.");
      }

      const primaryAdminEmail = "radhejal89@gmail.com";
      const primaryAdminPassword = "Gayatri@1985";
      const normalizedEmail = email.toLowerCase();

      let userCredential = null;
      try {
        userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
      } catch (signInErr) {
        // Fallback Account Provisioning: Auto-create primary admin account if it doesn't exist yet in Firebase Auth
        if (
          (signInErr.code === "auth/user-not-found" || signInErr.code === "auth/invalid-credential") &&
          normalizedEmail === primaryAdminEmail &&
          password === primaryAdminPassword
        ) {
          try {
            console.log("Provisioning Primary Admin User in Firebase Auth:", primaryAdminEmail);
            userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
          } catch (createErr) {
            console.error("Failed to create primary admin user in Firebase Auth:", createErr);
            throw signInErr;
          }
        } else {
          throw signInErr;
        }
      }

      const user = userCredential.user;
      const authorized = await isAuthorizedAdmin(user);

      if (user && authorized) {
        localStorage.setItem("gc_admin_session", "true");
        localStorage.setItem("adminLoggedIn", "true");
        sessionStorage.setItem("gc_admin_session", "true");
        isAdminLoggedIn = true;

        // Firestore Admin Profile Sync (Doc ID: admins/email)
        try {
          if (window.db) {
            const timestamp = (firebase.firestore && firebase.firestore.FieldValue)
              ? firebase.firestore.FieldValue.serverTimestamp()
              : new Date().toISOString();
            await window.db.collection("admins").doc(user.email.toLowerCase()).set({
              email: user.email.toLowerCase(),
              role: (user.email.toLowerCase() === primaryAdminEmail) ? "superadmin" : "admin",
              lastLogin: timestamp
            }, { merge: true });
          }
        } catch (syncErr) {
          console.warn("Firestore Admin Profile Sync warning:", syncErr);
        }

        // 2. Smooth Login Success Transition
        if (submitBtn) {
          submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> Success! Entering Dashboard...';
          submitBtn.style.opacity = "1";
          submitBtn.style.cursor = "default";
        }

        if (document.getElementById("adminLoginCard")) {
          document.getElementById("adminLoginCard").style.transition = "opacity 0.4s ease, transform 0.4s ease";
          document.getElementById("adminLoginCard").style.opacity = "0";
          document.getElementById("adminLoginCard").style.transform = "scale(0.96) translateY(-10px)";
        }

        if (window.showToast) {
          window.showToast("Welcome back, Admin!");
        } else {
          console.log("Admin logged in successfully.");
        }

        setTimeout(async () => {
          await showDashboard();
          resetButtonState();
          isLoginInProgress = false;
        }, 350);
      } else {
        isLoginInProgress = false;
        await firebase.auth().signOut();
        const err = "Access Denied: Unauthorized admin account.";
        resetButtonState();
        triggerCardShake();
        if (window.showToast) {
          window.showToast(err, "error");
        } else {
          alert(err);
        }
      }
    } catch (err) {
      isLoginInProgress = false;
      console.error("Firebase Login Error:", err);
      resetButtonState();
      triggerCardShake();
      const errorMsg = err.message || "Invalid Email or Password!";
      if (window.showToast) {
        window.showToast(errorMsg, "error");
      } else {
        alert(errorMsg);
      }
    }
  });
}

// --- DEDICATED LOGOUT SYSTEM ---

window.openLogoutModal = function(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Close sidebar drawer
  const sidebar = document.getElementById("adminSidebar");
  const backdrop = document.getElementById("adminSidebarBackdrop");
  if (sidebar) sidebar.classList.remove("active");
  if (backdrop) backdrop.classList.remove("active");

  // Show Logout Modal with display: flex
  const modal = document.getElementById("logoutModal");
  if (modal) {
    modal.style.display = "flex";
    modal.classList.add("active");
  }
};

window.closeLogoutModal = function(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const modal = document.getElementById("logoutModal");
  if (modal) {
    modal.style.display = "none";
    modal.classList.remove("active");
  }
};

window.executeLogout = function() {
  window.closeLogoutModal();

  if (typeof firebase !== "undefined" && firebase.auth) {
    firebase.auth().signOut().catch(err => console.warn("SignOut error:", err));
  }

  // Clear all admin sessions
  localStorage.removeItem("gc_admin_session");
  localStorage.removeItem("adminLoggedIn");
  sessionStorage.removeItem("gc_admin_session");
  sessionStorage.removeItem("gc_admin_logged_in");

  if (document.documentElement) {
    document.documentElement.classList.remove("admin-session-active");
  }

  isAdminLoggedIn = false;

  if (window.showToast) {
    window.showToast("Logged out successfully.");
  } else {
    alert("Logged out successfully.");
  }

  // Redirect to clean Login UI
  if (typeof showLogin === "function") {
    showLogin();
  } else {
    window.location.reload();
  }
};

function setupLogoutHandler() {
  const logoutBtn = document.getElementById("sidebarLogoutBtn") || document.getElementById("header-logout-btn");
  if (logoutBtn) {
    logoutBtn.onclick = (e) => {
      window.openLogoutModal(e);
    };
  }
}

function setupSidebarToggle() {
  const toggleBtn = document.getElementById("adminSidebarToggle");
  const sidebar = document.getElementById("adminSidebar");
  const backdrop = document.getElementById("adminSidebarBackdrop");
  const closeBtn = document.getElementById("adminSidebarClose");

  if (toggleBtn && sidebar && backdrop) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("active");
      backdrop.classList.toggle("active");
    });
  }

  if (closeBtn && sidebar && backdrop) {
    closeBtn.addEventListener("click", () => {
      sidebar.classList.remove("active");
      backdrop.classList.remove("active");
    });
  }

  if (backdrop && sidebar) {
    backdrop.addEventListener("click", () => {
      sidebar.classList.remove("active");
      backdrop.classList.remove("active");
    });
  }
}

function showLogin() {
  if (document.documentElement) {
    document.documentElement.classList.remove("admin-session-active");
  }

  const loginSection = document.getElementById("adminLoginSection") || document.querySelector(".admin-login-wrapper");
  const loginCard = document.getElementById("adminLoginCard") || document.querySelector(".login-card");
  const dashboardContainer = document.getElementById("dashboard-container") || document.querySelector(".admin-dashboard");
  const dashboardView = document.getElementById("adminDashboardView");
  const sidebarToggle = document.getElementById("adminSidebarToggle");
  const headerBar = document.getElementById("adminHeaderBar");

  if (loginSection) loginSection.style.display = "flex";
  if (loginCard) {
    loginCard.style.display = "block";
    loginCard.style.opacity = "1";
    loginCard.style.transform = "none";
    loginCard.style.transition = "none";
  }
  if (dashboardContainer) dashboardContainer.style.display = "none";
  if (dashboardView) dashboardView.style.display = "none";
  if (sidebarToggle) sidebarToggle.style.display = "none";
  if (headerBar) headerBar.style.display = "none";
}
const showLoginForm = showLogin;

async function showDashboard() {
  if (document.documentElement) {
    document.documentElement.classList.add("admin-session-active");
  }

  const loginSection = document.getElementById("adminLoginSection") || document.querySelector(".admin-login-wrapper");
  const loginCard = document.getElementById("adminLoginCard") || document.querySelector(".login-card");
  const dashboardContainer = document.getElementById("dashboard-container") || document.querySelector(".admin-dashboard");
  const dashboardView = document.getElementById("adminDashboardView");
  const sidebarToggle = document.getElementById("adminSidebarToggle");
  const headerBar = document.getElementById("adminHeaderBar");

  if (loginSection) loginSection.style.display = "none";
  if (loginCard) {
    loginCard.style.display = "none";
    loginCard.style.opacity = "1";
    loginCard.style.transform = "none";
  }
  if (dashboardContainer) dashboardContainer.style.display = "block";
  if (dashboardView) dashboardView.style.display = "block";
  if (sidebarToggle) sidebarToggle.style.display = "flex";
  if (headerBar) headerBar.style.display = "block";

  if (typeof switchAdminTab === 'function') {
    switchAdminTab('tabOverview');
  }

  await refreshAllAdminViews();
}
const showAdminDashboard = showDashboard;
window.showDashboard = showDashboard;
window.showLogin = showLogin;

function setupTabNavigation() {
  const sidebarItems = document.querySelectorAll(".sidebar-item:not(.sidebar-logout-btn)");
  const tabBtns = document.querySelectorAll(".admin-tab-btn");
  const allNavItems = [...sidebarItems, ...tabBtns];

  const tabTitleMap = {
    "tabOverview": "Dashboard",
    "tabServices": "Service Queries",
    "tabPurchases": "Purchase Requests",
    "tabProducts": "Manage Products",
    "tabDeveloper": "Developer Info"
  };

  allNavItems.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");
      if (!targetTab) return;

      sidebarItems.forEach(b => b.classList.remove("active"));
      tabBtns.forEach(b => b.classList.remove("active"));
      
      btn.classList.add("active");

      sidebarItems.forEach(s => {
        if (s.getAttribute("data-tab") === targetTab) {
          s.classList.add("active");
        }
      });

      const pageTitleElem = document.getElementById("admin-current-page-title");
      if (pageTitleElem && tabTitleMap[targetTab]) {
        pageTitleElem.textContent = tabTitleMap[targetTab];
      }

      document.querySelectorAll(".admin-tab-content").forEach(content => {
        content.style.display = content.id === targetTab ? "block" : "none";
      });

      // Auto-load View Data on Tab Click
      if (targetTab === "tabPurchases") {
        renderPurchaseRequestsTable();
      } else if (targetTab === "tabServices") {
        renderServiceQueriesTable();
      } else if (targetTab === "tabOverview") {
        renderAdminStats();
      } else if (targetTab === "tabProducts") {
        renderAdminProductList();
      }

      const sidebar = document.getElementById("adminSidebar");
      const backdrop = document.getElementById("adminSidebarBackdrop");
      if (sidebar) sidebar.classList.remove("active");
      if (backdrop) backdrop.classList.remove("active");
    });
  });
}

window.switchAdminTab = function(tabId) {
  const btn = document.querySelector(`.sidebar-item[data-tab="${tabId}"]`);
  if (btn) btn.click();
};

async function refreshAllAdminViews() {
  await renderAdminStats();
  await renderAdminServiceQueries();
  await renderAdminPurchaseRequests();
  await renderAdminProductList();

  // Real-time Firestore sync listeners
  if (window.dbStore && typeof window.dbStore.listenToProducts === "function") {
    window.dbStore.listenToProducts(async () => {
      await renderAdminProductList();
      await renderAdminStats();
    });
  }
  if (window.dbStore && typeof window.dbStore.listenToPurchaseRequests === "function") {
    window.dbStore.listenToPurchaseRequests(async () => {
      await renderAdminPurchaseRequests();
      await renderAdminStats();
    });
  }
  if (window.dbStore && typeof window.dbStore.listenToServiceQueries === "function") {
    window.dbStore.listenToServiceQueries(async () => {
      await renderAdminServiceQueries();
      await renderAdminStats();
    });
  }
}

async function renderAdminStats() {
  await loadDashboardSummary();
}

let chartInstance = null;

async function loadDashboardSummary() {
  let products = [];
  let services = [];
  let purchases = [];

  // Fetch Firestore or local cache
  if (window.db) {
    try {
      const [prodSnap, srvSnap, purSnap] = await Promise.all([
        window.db.collection('products').get(),
        window.db.collection('service_queries').get(),
        window.db.collection('purchase_inquiries').get()
      ]);
      prodSnap.forEach(d => products.push({ id: d.id, ...d.data() }));
      srvSnap.forEach(d => services.push({ id: d.id, ...d.data() }));
      purSnap.forEach(d => purchases.push({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn("Error fetching dashboard data:", e);
    }
  }

  if (products.length === 0 && window.dbStore && typeof window.dbStore.getProducts === 'function') {
    try { products = await window.dbStore.getProducts(); } catch (e) {}
  }
  if (services.length === 0 && window.dbStore && typeof window.dbStore.getServiceQueries === 'function') {
    try { services = await window.dbStore.getServiceQueries(); } catch (e) {}
  }
  if (purchases.length === 0 && window.dbStore && typeof window.dbStore.getPurchaseRequests === 'function') {
    try { purchases = await window.dbStore.getPurchaseRequests(); } catch (e) {}
  }

  if (products.length === 0) products = JSON.parse(localStorage.getItem('gc_products')) || [];
  if (services.length === 0) services = JSON.parse(localStorage.getItem('gc_service_queries')) || [];
  if (purchases.length === 0) purchases = JSON.parse(localStorage.getItem('gc_purchase_requests')) || [];

  // Update Top Stats
  const statProducts = document.getElementById('statProductsCount');
  const statPending = document.getElementById('statPendingRequests');
  const statActive = document.getElementById('statActiveRepairs');
  const statCompleted = document.getElementById('statCompletedJobs');

  if (statProducts) statProducts.textContent = products.length;
  if (statPending) statPending.textContent = purchases.filter(p => (p.status || 'Pending') === 'Pending').length;
  if (statActive) statActive.textContent = services.filter(s => s.status === 'In Repair' || s.status === 'Testing' || s.status === 'Pending' || s.status === 'Pending Approval').length;
  if (statCompleted) statCompleted.textContent = services.filter(s => s.status === 'Completed' || s.status === 'Delivered').length;

  // 1. Render Chart.js (Left Column)
  renderServiceSalesChart(services, purchases);

  // 2. Render Category-wise Stock Breakdown (Right Column)
  renderCategoryBreakdown(products);
}

function renderServiceSalesChart(services, purchases) {
  const ctx = document.getElementById('serviceSalesChart');
  if (!ctx || typeof Chart === 'undefined') return;

  const totalServices = services.length || 0;
  const completedServices = services.filter(s => s.status === 'Completed' || s.status === 'Delivered').length || 0;
  const totalPurchases = purchases.length || 0;
  const completedPurchases = purchases.filter(p => p.status === 'Completed').length || 0;

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Total Requests', 'In Progress / Pending', 'Completed / Closed'],
      datasets: [
        {
          label: 'Service Tickets',
          data: [totalServices, (totalServices - completedServices), completedServices],
          backgroundColor: 'rgba(56, 189, 248, 0.75)', // Cyan / Blue
          borderColor: '#38BDF8',
          borderWidth: 1.5,
          borderRadius: 6
        },
        {
          label: 'Purchase Sales',
          data: [totalPurchases, (totalPurchases - completedPurchases), completedPurchases],
          backgroundColor: 'rgba(16, 185, 129, 0.75)', // Emerald / Green
          borderColor: '#10B981',
          borderWidth: 1.5,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#94A3B8', font: { family: 'Inter', size: 12 } }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94A3B8' }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94A3B8', precision: 0 },
          beginAtZero: true
        }
      }
    }
  });
}

function renderCategoryBreakdown(products) {
  const container = document.getElementById('categoryStockList');
  if (!container) return;

  const categories = [
    { name: 'Motherboards', match: 'motherboard', icon: 'fa-microchip', color: '#38BDF8' },
    { name: 'Printers & Accessories', match: 'printer', icon: 'fa-print', color: '#10B981' },
    { name: 'CCTV Cameras', match: 'cctv', icon: 'fa-video', color: '#F59E0B' },
    { name: 'Keyboards & Mice', match: 'keyboard', icon: 'fa-keyboard', color: '#A855F7' },
    { name: 'SMPS & Power Supplies', match: 'smps', icon: 'fa-plug', color: '#EC4899' },
    { name: 'All Computer Peripherals', match: 'peripheral', icon: 'fa-hdd', color: '#6366F1' }
  ];

  container.innerHTML = categories.map(cat => {
    const matchingProducts = products.filter(p => (p.category || '').toLowerCase().includes(cat.match));
    // Total stock count sum (or count products if stock isn't set)
    const totalUnits = matchingProducts.reduce((sum, p) => sum + (p.stock !== undefined ? Number(p.stock) : 1), 0);

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(11, 19, 43, 0.6); padding: 0.65rem 1rem; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05);">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; color: ${cat.color}; font-size: 0.9rem;">
            <i class="fas ${cat.icon}"></i>
          </div>
          <span style="color: #FFFFFF; font-size: 0.88rem; font-weight: 500;">${cat.name}</span>
        </div>
        <span style="background: rgba(56, 189, 248, 0.15); color: #38BDF8; font-weight: 700; font-size: 0.85rem; padding: 0.2rem 0.6rem; border-radius: 6px;">
          ${totalUnits} Units
        </span>
      </div>
    `;
  }).join('');
}

/* --- TAB 1: SERVICE QUERIES & REPAIR JOBS --- */
let allServiceQueries = [];

async function renderServiceQueriesTable() {
  const tbody = document.getElementById('adminServiceTableBody');
  if (!tbody) return;

  try {
    if (window.db) {
      const snapshot = await window.db.collection('service_queries').get();
      allServiceQueries = [];
      snapshot.forEach(doc => {
        allServiceQueries.push({ id: doc.id, ...doc.data() });
      });

      // Safe sort by creation timestamp
      allServiceQueries.sort((a, b) => {
        const timeA = a.createdAt ? (a.createdAt.seconds || new Date(a.createdAt).getTime()) : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
        const timeB = b.createdAt ? (b.createdAt.seconds || new Date(b.createdAt).getTime()) : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
        return timeB - timeA;
      });

      localStorage.setItem('gc_service_queries', JSON.stringify(allServiceQueries));
    } else if (window.dbStore && typeof window.dbStore.getServiceQueries === 'function') {
      allServiceQueries = await window.dbStore.getServiceQueries();
    } else {
      allServiceQueries = JSON.parse(localStorage.getItem('gc_service_queries')) || [];
    }

    const searchInput = document.getElementById('serviceSearchInput');
    if (searchInput && searchInput.value.trim()) {
      window.handleServiceSearch(searchInput.value);
    } else {
      // Render table rows using the stored list
      displayFilteredServiceQueries(allServiceQueries);
    }

    // Update Dashboard Stats Counters
    if (typeof updateServiceStats === 'function') {
      updateServiceStats(allServiceQueries);
    }
  } catch (err) {
    console.error("Error loading service queries:", err);
  }
}

// Function to render any subset of queries into table
function displayFilteredServiceQueries(queries) {
  const tbody = document.getElementById('adminServiceTableBody');
  if (!tbody) return;

  if (!queries || queries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2.5rem; color: #94A3B8;">No matching service queries found.</td></tr>`;
    return;
  }

  tbody.innerHTML = queries.map(q => `
    <tr>
      <td style="font-weight: 700; color: #38BDF8;">${q.queryId || q.id}</td>
      <td>
        <div style="font-weight: 600; color: #FFFFFF;">${q.customerName || q.name || q.customer_name || 'N/A'}</div>
        <div style="font-size: 0.85rem; color: #38BDF8; margin-top: 2px;">
          <i class="fas fa-phone-alt" style="font-size: 0.75rem;"></i> ${q.customerPhone || q.phone || ''}
        </div>
      </td>
      <td>
        <div style="color: #FFFFFF; font-weight: 500;">${q.deviceType || q.device || 'N/A'}</div>
        <div style="font-size: 0.85rem; color: #94A3B8;">${q.issueDescription || q.issue || ''}</div>
      </td>
      <td>
        <select id="status-${q.id}" class="form-control select-dark" style="padding: 0.4rem 0.6rem; font-size: 0.88rem; min-width: 130px; background-color: #0F172A; color: #FFFFFF; border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 6px;">
          <option value="Pending" ${q.status === 'Pending' || q.status === 'Pending Approval' ? 'selected' : ''}>Pending</option>
          <option value="In Repair" ${q.status === 'In Repair' ? 'selected' : ''}>In Repair</option>
          <option value="Testing" ${q.status === 'Testing' ? 'selected' : ''}>Testing</option>
          <option value="Completed" ${q.status === 'Completed' ? 'selected' : ''}>Completed</option>
          <option value="Delivered" ${q.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
        </select>
      </td>
      <td>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <button type="button" class="btn btn-sm" onclick="saveServiceStatus('${q.id}')" style="background: linear-gradient(135deg, #0EA5E9, #2563EB); color: #FFFFFF; border: none; padding: 0.45rem 0.85rem; border-radius: 6px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 0.35rem;">
            <i class="fas fa-save"></i> Save
          </button>
          <button type="button" class="btn btn-sm" onclick="deleteServiceQuery('${q.id}')" style="background: rgba(239, 68, 68, 0.2); color: #F87171; border: 1px solid rgba(239, 68, 68, 0.4); padding: 0.45rem 0.75rem; border-radius: 6px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 0.35rem;">
            <i class="fas fa-trash-alt"></i> Delete
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Global Handler: Real-time Live Search Filter
window.handleServiceSearch = function(keyword) {
  const term = (keyword || '').toLowerCase().trim();
  if (!term) {
    displayFilteredServiceQueries(allServiceQueries);
    return;
  }

  const filtered = allServiceQueries.filter(q => {
    const qId = (q.queryId || q.id || '').toLowerCase();
    const name = (q.customerName || q.name || q.customer_name || '').toLowerCase();
    const phone = (q.customerPhone || q.phone || '').toLowerCase();
    const device = (q.deviceType || q.device || '').toLowerCase();
    const status = (q.status || '').toLowerCase();

    return qId.includes(term) || name.includes(term) || phone.includes(term) || device.includes(term) || status.includes(term);
  });

  displayFilteredServiceQueries(filtered);
};

function updateServiceStats(queries) {
  if (!queries) return;
  const repElem = document.getElementById("statActiveRepairs");
  const compElem = document.getElementById("statCompletedJobs");
  if (repElem) repElem.textContent = queries.filter(q => q.status === "In Repair" || q.status === "Pending" || q.status === "Pending Approval" || q.status === "Testing").length;
  if (compElem) compElem.textContent = queries.filter(q => q.status === "Completed" || q.status === "Delivered").length;
}

// Alias for backwards compatibility
async function renderAdminServiceQueries() {
  return await renderServiceQueriesTable();
}

// Global Handler: Save Service Status
window.saveServiceStatus = async function(docId) {
  const statusSelect = document.getElementById(`status-${docId}`);
  if (!statusSelect) return;
  const newStatus = statusSelect.value;

  try {
    if (window.db) {
      const updatePayload = { status: newStatus };
      if (typeof firebase !== "undefined" && firebase.firestore && firebase.firestore.FieldValue) {
        updatePayload.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      }
      await window.db.collection('service_queries').doc(docId).set(updatePayload, { merge: true });
    }

    if (window.dbStore && typeof window.dbStore.updateServiceQuery === 'function') {
      await window.dbStore.updateServiceQuery(docId, { status: newStatus });
    }

    // Update local cache
    let localQueries = JSON.parse(localStorage.getItem('gc_service_queries')) || [];
    localQueries = localQueries.map(q => q.id === docId ? { ...q, status: newStatus } : q);
    localStorage.setItem('gc_service_queries', JSON.stringify(localQueries));

    alert("✅ Service status updated successfully!");
    renderServiceQueriesTable();
  } catch (err) {
    console.error("Error updating service status:", err);
    alert("❌ Error: " + err.message);
  }
};

// Global Handler: Delete Service Query
window.deleteServiceQuery = async function(docId) {
  if (!confirm("Are you sure you want to permanently delete this service query?")) return;

  try {
    if (window.db) {
      await window.db.collection('service_queries').doc(docId).delete();
    }

    if (window.dbStore && typeof window.dbStore.deleteServiceQuery === 'function') {
      await window.dbStore.deleteServiceQuery(docId);
    }

    // Update local cache
    let localQueries = JSON.parse(localStorage.getItem('gc_service_queries')) || [];
    localQueries = localQueries.filter(q => q.id !== docId);
    localStorage.setItem('gc_service_queries', JSON.stringify(localQueries));

    alert("🗑️ Service query deleted successfully!");
    renderServiceQueriesTable();
  } catch (err) {
    console.error("Error deleting service query:", err);
    alert("❌ Error: " + err.message);
  }
};
window.renderServiceQueriesTable = renderServiceQueriesTable;

/* --- TAB 2: PURCHASE REQUESTS --- */
let allPurchaseRequests = [];

async function renderPurchaseRequestsTable() {
  const tbody = document.getElementById('adminPurchaseTableBody');
  if (!tbody) return;

  try {
    if (window.db) {
      // 1. Fetch live from 'purchase_inquiries' without strict order constraint
      try {
        const snapshot = await window.db.collection('purchase_inquiries').get();
        allPurchaseRequests = [];
        snapshot.forEach(doc => {
          allPurchaseRequests.push({ id: doc.id, ...doc.data() });
        });
      } catch (err) {
        console.warn("Could not fetch 'purchase_inquiries':", err);
      }

      // 2. Fallback check for 'purchase_requests' collection if empty
      if (allPurchaseRequests.length === 0) {
        try {
          const snap2 = await window.db.collection('purchase_requests').get();
          snap2.forEach(doc => {
            allPurchaseRequests.push({ id: doc.id, ...doc.data() });
          });
        } catch (e) {
          console.warn("Fallback collection check:", e);
        }
      }

      // Sort client-side safely by createdAt or timestamp
      allPurchaseRequests.sort((a, b) => {
        const timeA = a.createdAt ? (a.createdAt.seconds || new Date(a.createdAt).getTime()) : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
        const timeB = b.createdAt ? (b.createdAt.seconds || new Date(b.createdAt).getTime()) : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
        return timeB - timeA;
      });

      // Update local cache
      localStorage.setItem('gc_purchase_requests', JSON.stringify(allPurchaseRequests));
    } else if (window.dbStore && typeof window.dbStore.getPurchaseRequests === 'function') {
      allPurchaseRequests = await window.dbStore.getPurchaseRequests();
    } else {
      allPurchaseRequests = JSON.parse(localStorage.getItem('gc_purchase_requests')) || [];
    }

    const searchInput = document.getElementById('purchaseSearchInput');
    if (searchInput && searchInput.value.trim()) {
      window.handlePurchaseSearch(searchInput.value);
    } else {
      displayFilteredPurchaseRequests(allPurchaseRequests);
    }

    // Update pending count in stat cards
    const pendingCount = allPurchaseRequests.filter(r => (r.status || 'Pending') === 'Pending').length;
    const statPending = document.getElementById('statPendingRequests');
    if (statPending) statPending.textContent = pendingCount;

  } catch (err) {
    console.error("Error loading purchase requests:", err);
  }
}

// Function to render filtered subset
function displayFilteredPurchaseRequests(requests) {
  const tbody = document.getElementById('adminPurchaseTableBody');
  if (!tbody) return;

  if (!requests || requests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2.5rem; color: #94A3B8;">No matching purchase inquiries found.</td></tr>`;
    return;
  }

  tbody.innerHTML = requests.map(req => {
    const priceVal = req.productPrice || req.price || 0;
    const formattedPrice = Number(priceVal).toLocaleString('en-IN');
    const reqId = req.requestId || req.id;
    const custName = req.customerName || req.name || req.customer_name || 'Anonymous';
    const phone = req.customerPhone || req.phone || '';
    const email = req.customerEmail || req.email || '';
    const address = req.customerAddress || req.address || '';
    const prodTitle = req.productTitle || req.title || req.product || req.product_title || 'General Hardware';
    const status = req.status || 'Pending';

    return `
      <tr>
        <td style="font-weight: 700; color: #38BDF8; font-size: 0.95rem;">
          ${reqId}
        </td>

        <td>
          <div style="font-weight: 600; color: #FFFFFF; font-size: 0.95rem;">${custName}</div>
          ${phone ? `<div style="font-size: 0.84rem; color: #38BDF8; margin-top: 2px;"><i class="fas fa-phone-alt" style="font-size: 0.75rem;"></i> ${phone}</div>` : ''}
          ${email ? `<div style="font-size: 0.8rem; color: #94A3B8;">${email}</div>` : ''}
          ${address ? `<div style="font-size: 0.8rem; color: #64748B; margin-top: 2px;"><i class="fas fa-map-marker-alt"></i> ${address}</div>` : ''}
          ${req.notes ? `<div style="font-size: 0.78rem; color: #F59E0B; margin-top: 2px; font-style: italic;">"${req.notes}"</div>` : ''}
        </td>

        <td>
          <div style="color: #FFFFFF; font-weight: 600; font-size: 0.95rem;">${prodTitle}</div>
        </td>

        <td style="color: #38BDF8; font-weight: 700; font-size: 1rem;">
          ₹${formattedPrice}
        </td>

        <td>
          <select id="purch-status-${req.id}" class="form-control select-dark" style="padding: 0.45rem 0.65rem; font-size: 0.88rem; width: 100%; max-width: 130px; background-color: #0F172A; color: #FFFFFF; border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 6px;">
            <option value="Pending" ${status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Contacted" ${status === 'Contacted' || status === 'Contacted / Approved' ? 'selected' : ''}>Contacted</option>
            <option value="Processing" ${status === 'Processing' || status === 'Under Review' ? 'selected' : ''}>Processing</option>
            <option value="Completed" ${status === 'Completed' ? 'selected' : ''}>Completed</option>
            <option value="Cancelled" ${status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>

        <td style="text-align: center;">
          <div style="display: inline-flex; gap: 0.4rem; justify-content: center; align-items: center;">
            <button type="button" class="btn btn-sm" onclick="savePurchaseStatus('${req.id}')" style="background: linear-gradient(135deg, #0EA5E9, #2563EB); color: #FFFFFF; border: none; padding: 0.45rem 0.8rem; border-radius: 6px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.84rem;">
              <i class="fas fa-save"></i> Save
            </button>
            <button type="button" class="btn btn-sm" onclick="deletePurchaseRequest('${req.id}')" style="background: rgba(239, 68, 68, 0.2); color: #F87171; border: 1px solid rgba(239, 68, 68, 0.4); padding: 0.45rem 0.7rem; border-radius: 6px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.84rem;">
              <i class="fas fa-trash-alt"></i> Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Global Live Search Handler for Purchase Requests
window.handlePurchaseSearch = function(keyword) {
  const term = (keyword || '').toLowerCase().trim();
  if (!term) {
    displayFilteredPurchaseRequests(allPurchaseRequests);
    return;
  }

  const filtered = allPurchaseRequests.filter(req => {
    const rId = (req.requestId || req.id || '').toLowerCase();
    const name = (req.customerName || req.name || req.customer_name || '').toLowerCase();
    const phone = (req.customerPhone || req.phone || '').toLowerCase();
    const email = (req.customerEmail || req.email || '').toLowerCase();
    const product = (req.productTitle || req.title || req.product || req.product_title || '').toLowerCase();
    const address = (req.customerAddress || req.address || '').toLowerCase();
    const status = (req.status || '').toLowerCase();

    return rId.includes(term) || name.includes(term) || phone.includes(term) || email.includes(term) || product.includes(term) || address.includes(term) || status.includes(term);
  });

  displayFilteredPurchaseRequests(filtered);
};

// Global Handler: Save Purchase Status
window.savePurchaseStatus = async function(docId) {
  const statusSelect = document.getElementById(`purch-status-${docId}`);
  if (!statusSelect) return;
  const newStatus = statusSelect.value;

  try {
    if (window.db) {
      const updatePayload = { status: newStatus };
      if (typeof firebase !== "undefined" && firebase.firestore && firebase.firestore.FieldValue) {
        updatePayload.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      }
      await window.db.collection('purchase_inquiries').doc(docId).set(updatePayload, { merge: true });
    }

    if (window.dbStore && typeof window.dbStore.updatePurchaseRequestStatus === 'function') {
      await window.dbStore.updatePurchaseRequestStatus(docId, newStatus);
    }

    let localRequests = JSON.parse(localStorage.getItem('gc_purchase_requests')) || [];
    localRequests = localRequests.map(r => r.id === docId ? { ...r, status: newStatus } : r);
    localStorage.setItem('gc_purchase_requests', JSON.stringify(localRequests));

    alert("✅ Purchase inquiry status updated successfully!");
    renderPurchaseRequestsTable();
  } catch (err) {
    console.error("Error updating purchase status:", err);
    alert("❌ Error: " + err.message);
  }
};

// Global Handler: Delete Purchase Request
window.deletePurchaseRequest = async function(docId) {
  if (!confirm("Are you sure you want to permanently delete this purchase inquiry?")) return;

  try {
    if (window.db) {
      await window.db.collection('purchase_inquiries').doc(docId).delete();
    }

    if (window.dbStore && typeof window.dbStore.deletePurchaseRequest === 'function') {
      await window.dbStore.deletePurchaseRequest(docId);
    }

    let localRequests = JSON.parse(localStorage.getItem('gc_purchase_requests')) || [];
    localRequests = localRequests.filter(r => r.id !== docId);
    localStorage.setItem('gc_purchase_requests', JSON.stringify(localRequests));

    alert("🗑️ Purchase inquiry deleted successfully!");
    renderPurchaseRequestsTable();
  } catch (err) {
    console.error("Error deleting purchase request:", err);
    alert("❌ Error: " + err.message);
  }
};

// Alias for backwards compatibility
async function renderAdminPurchaseRequests() {
  return await renderPurchaseRequestsTable();
}

window.renderPurchaseRequestsTable = renderPurchaseRequestsTable;

/* --- TAB 3: PRODUCT MANAGER --- */
function setupProductForm() {
  const form = document.getElementById("addNewProductForm");
  const openBtn = document.getElementById("btn-open-add-product-modal");
  const modal = document.getElementById("add-product-modal");
  const closeBtn = document.getElementById("btn-close-add-product-modal");
  const cancelBtn = document.getElementById("btn-cancel-add-product-modal");

  const closeModal = () => {
    if (modal) {
      modal.classList.remove("active");
      modal.style.display = "none";
    }
  };

  if (openBtn && modal) {
    openBtn.addEventListener("click", () => {
      modal.classList.add("active");
      modal.style.display = "flex";
    });
  }

  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("newProdTitle").value.trim();
    const category = document.getElementById("newProdCategory").value;
    const price = parseFloat(document.getElementById("newProdPrice").value);
    const stockElem = document.getElementById("newProdStock");
    const stock = stockElem ? (parseInt(stockElem.value) || 1) : 1;
    const image = document.getElementById("newProdImg").value.trim() || "assets/hero_banner.jpg";
    const description = document.getElementById("newProdDesc").value.trim();

    if (!title || isNaN(price)) {
      if (window.showToast) window.showToast("Product title and valid price are required.", "error");
      return;
    }

    const newProduct = {
      title,
      category,
      price,
      stock,
      image,
      imageUrl: image,
      image_url: image,
      description,
      createdAt: (typeof firebase !== "undefined" && firebase.firestore && firebase.firestore.FieldValue)
        ? firebase.firestore.FieldValue.serverTimestamp()
        : new Date().toISOString()
    };

    try {
      if (window.db) {
        await window.db.collection("products").add(newProduct);
        alert("✅ Product successfully saved to Firebase Firestore!");
      } else if (window.dbStore) {
        await window.dbStore.addProduct(newProduct);
        alert("✅ Product successfully saved!");
      }

      form.reset();
      closeModal();
      await renderAdminProductList();
      await renderAdminStats();
    } catch (err) {
      console.error("Failed to add product:", err);
      if (window.showToast) window.showToast("Error adding product.", "error");
    }
  });
}

// 1. Render Products Table with Perfectly Aligned Actions
async function renderProductsTable() {
  const tbody = document.getElementById('adminProductsTableBody');
  if (!tbody) return;

  try {
    let products = [];

    if (window.db) {
      const snapshot = await window.db.collection('products').get();
      snapshot.forEach(doc => {
        products.push({ id: doc.id, ...doc.data() });
      });
      localStorage.setItem('gc_products', JSON.stringify(products));
    } else {
      products = JSON.parse(localStorage.getItem('gc_products')) || [];
    }

    if (products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2.5rem; color: #94A3B8;">No products found in inventory.</td></tr>`;
      const statProducts = document.getElementById('statProductsCount');
      if (statProducts) statProducts.textContent = '0';
      return;
    }

    tbody.innerHTML = products.map(prod => {
      const pId = String(prod.id || '').replace(/'/g, "\\'");
      const priceVal = Number(prod.price || 0).toLocaleString('en-IN');
      const stockVal = prod.stock !== undefined ? parseInt(prod.stock) : 1;
      const stockBadge = stockVal > 0 
        ? `<span style="background: rgba(16, 185, 129, 0.15); color: #34D399; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 6px; font-size: 0.84rem; border: 1px solid rgba(16, 185, 129, 0.3); display: inline-block;">${stockVal} in stock</span>`
        : `<span style="background: rgba(239, 68, 68, 0.15); color: #F87171; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 6px; font-size: 0.84rem; border: 1px solid rgba(239, 68, 68, 0.3); display: inline-block;">Out of stock</span>`;

      return `
        <tr>
          <td>
            <img src="${prod.image || prod.imageUrl || 'assets/cat_motherboard.jpg'}" alt="${prod.title || 'Product'}" style="width: 46px; height: 46px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);" onerror="this.src='assets/hero_banner.jpg'" />
          </td>

          <td>
            <div style="font-weight: 600; color: #FFFFFF; font-size: 0.95rem;">${prod.title || 'Untitled'}</div>
          </td>

          <td>
            <span style="background: rgba(56, 189, 248, 0.15); color: #38BDF8; font-size: 0.82rem; font-weight: 600; padding: 0.25rem 0.65rem; border-radius: 6px;">
              ${prod.category || 'General'}
            </span>
          </td>

          <td style="color: #38BDF8; font-weight: 700; font-size: 0.98rem;">
            ₹${priceVal}
          </td>

          <td>
            ${stockBadge}
          </td>

          <td style="text-align: center;">
            <div style="display: inline-flex; gap: 0.45rem; justify-content: center; align-items: center;">
              <button type="button" class="btn btn-sm" onclick="window.openEditProductModal('${pId}', event)" style="background: rgba(14, 165, 233, 0.2); color: #38BDF8; border: 1px solid rgba(56, 189, 248, 0.4); padding: 0.45rem 0.8rem; border-radius: 6px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.84rem;">
                <i class="fas fa-edit"></i> Edit
              </button>
              <button type="button" class="btn btn-sm" onclick="window.deleteProduct('${pId}')" style="background: rgba(239, 68, 68, 0.2); color: #F87171; border: 1px solid rgba(239, 68, 68, 0.4); padding: 0.45rem 0.75rem; border-radius: 6px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.84rem;">
                <i class="fas fa-trash-alt"></i> Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    const statProducts = document.getElementById('statProductsCount');
    if (statProducts) statProducts.textContent = products.length;

  } catch (err) {
    console.error("Error rendering products table:", err);
  }
}
const renderAdminProductList = renderProductsTable;

// --- BULLETPROOF EDIT PRODUCT MODAL HANDLERS ---

window.updateEditImagePreview = function(url) {
  const previewWrapper = document.getElementById('editProdImgPreviewWrapper');
  const previewImg = document.getElementById('editProdImgPreview');
  if (!previewWrapper || !previewImg) return;

  if (url && url.trim() !== '') {
    previewImg.src = url.trim();
    previewWrapper.style.display = 'block';
  } else {
    previewWrapper.style.display = 'none';
  }
};

function updateAddImagePreview(url) {
  const previewImg = document.getElementById("newProdImgPreview");
  const previewWrapper = document.getElementById("newProdImgPreviewWrapper");
  if (!previewImg || !previewWrapper) return;
  if (url && url.trim() !== "") {
    previewImg.src = url.trim();
    previewWrapper.style.display = "flex";
  } else {
    previewWrapper.style.display = "none";
  }
}

window.openEditProductModal = function(productId, e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }

  console.log("👉 Opening Edit Modal for Product:", productId);
  if (!productId) return;

  const modal = document.getElementById('edit-product-modal');
  if (!modal) return;

  // 1. Get Product Data from Local Storage or Window Cache
  let product = null;
  const localProducts = JSON.parse(localStorage.getItem('gc_products')) || [];
  product = localProducts.find(p => String(p.id) === String(productId));

  const setFormValues = (prod) => {
    if (!prod) return;
    const idInput = document.getElementById('editProdId');
    const titleInput = document.getElementById('editProdTitle');
    const catInput = document.getElementById('editProdCategory');
    const priceInput = document.getElementById('editProdPrice');
    const stockInput = document.getElementById('editProdStock');
    const imgInput = document.getElementById('editProdImg');
    const descInput = document.getElementById('editProdDesc');

    if (idInput) idInput.value = prod.id || productId;
    if (titleInput) titleInput.value = prod.title || '';
    if (catInput) catInput.value = prod.category || 'Printers & Accessories';
    if (priceInput) priceInput.value = prod.price || 0;
    if (stockInput) stockInput.value = (prod.stock !== undefined) ? prod.stock : 1;
    
    const imgVal = prod.image || prod.imageUrl || prod.image_url || '';
    if (imgInput) imgInput.value = imgVal;
    window.updateEditImagePreview(imgVal);

    if (descInput) descInput.value = prod.description || '';
  };

  if (product) {
    setFormValues(product);
  } else if (window.db) {
    window.db.collection('products').doc(productId).get().then(doc => {
      if (doc.exists) {
        setFormValues({ id: doc.id, ...doc.data() });
      }
    }).catch(err => console.warn(err));
  }

  // 2. Open Modal reliably using a micro-timeout to avoid same-tick event capture
  setTimeout(() => {
    modal.style.display = 'flex';
    modal.classList.add('active');
    const body = modal.querySelector('.modal-form-body');
    if (body) body.scrollTop = 0;
  }, 10);
};

window.closeEditProductModal = function(e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  const modal = document.getElementById('edit-product-modal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('active');
  }
};

// Safe backdrop click ONLY (Ignore clicks inside modal card)
document.addEventListener('DOMContentLoaded', () => {
  const editModal = document.getElementById('edit-product-modal');
  const modalCard = document.getElementById('editModalCard');

  if (modalCard) {
    modalCard.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  if (editModal) {
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) {
        window.closeEditProductModal(e);
      }
    });
  }
});

window.handleEditProductSubmit = async function(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const productId = document.getElementById('editProdId') ? document.getElementById('editProdId').value.trim() : '';
  if (!productId) {
    alert("❌ Error: Product ID is missing!");
    return;
  }

  const updatedData = {
    title: document.getElementById('editProdTitle').value.trim(),
    category: document.getElementById('editProdCategory').value,
    price: parseFloat(document.getElementById('editProdPrice').value) || 0,
    stock: parseInt(document.getElementById('editProdStock').value) || 0,
    image: document.getElementById('editProdImg').value.trim() || 'assets/cat_motherboard.jpg',
    imageUrl: document.getElementById('editProdImg').value.trim() || 'assets/cat_motherboard.jpg',
    image_url: document.getElementById('editProdImg').value.trim() || 'assets/cat_motherboard.jpg',
    description: document.getElementById('editProdDesc').value.trim()
  };

  if (typeof firebase !== "undefined" && firebase.firestore && firebase.firestore.FieldValue) {
    updatedData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
  }

  try {
    if (window.db && !productId.startsWith("prod-")) {
      await window.db.collection('products').doc(productId).set(updatedData, { merge: true });
    }

    let localProducts = JSON.parse(localStorage.getItem('gc_products')) || [];
    localProducts = localProducts.map(p => String(p.id) === String(productId) ? { ...p, ...updatedData } : p);
    localStorage.setItem('gc_products', JSON.stringify(localProducts));

    alert("✅ Product updated successfully!");
    window.closeEditProductModal();

    await renderProductsTable();
    if (typeof loadDashboardSummary === 'function') loadDashboardSummary();
  } catch (error) {
    console.error("Firestore update error:", error);
    alert("❌ Error updating product: " + (error.message || error));
  }
};

// 3. Global Delete Product Handler
window.deleteProduct = async function(productId) {
  if (!productId) return;
  if (!confirm("Are you sure you want to permanently delete this product from inventory?")) return;

  try {
    if (window.db) {
      await window.db.collection('products').doc(productId).delete();
      console.log("✅ Firestore product deleted:", productId);
    }

    let localProducts = JSON.parse(localStorage.getItem('gc_products')) || [];
    localProducts = localProducts.filter(p => String(p.id) !== String(productId));
    localStorage.setItem('gc_products', JSON.stringify(localProducts));

    alert("🗑️ Product deleted successfully!");
    await renderProductsTable();

    if (typeof loadDashboardSummary === 'function') {
      loadDashboardSummary();
    }
  } catch (error) {
    console.error("Error deleting product:", error);
    alert("❌ Error deleting product: " + (error.message || error));
  }
};

window.openLogoutModal = openLogoutModal;
window.closeLogoutModal = closeLogoutModal;
window.executeLogout = executeLogout;
window.saveAdminQueryUpdate = saveAdminQueryUpdate;
window.updatePurchaseStatus = updatePurchaseStatus;
window.togglePurchaseRequestStatus = updatePurchaseStatus;
window.deletePurchaseRequestItem = deletePurchaseRequestItem;
window.updateEditImagePreview = window.updateEditImagePreview;
window.updateAddImagePreview = updateAddImagePreview;
window.openEditProductModal = window.openEditProductModal;
window.closeEditProductModal = window.closeEditProductModal;
window.handleEditProductSubmit = window.handleEditProductSubmit;
window.deleteProduct = window.deleteProduct;
window.deleteAdminProduct = window.deleteProduct;
window.renderProductsTable = renderProductsTable;
window.renderAdminProductList = renderProductsTable;


