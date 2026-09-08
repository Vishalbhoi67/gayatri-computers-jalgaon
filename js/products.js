/* Storage Purge Helper for Old Dummy Products */
if (typeof sessionStorage !== "undefined" && !sessionStorage.getItem('gc_dummy_purged')) {
  localStorage.removeItem('gc_products');
  sessionStorage.setItem('gc_dummy_purged', 'true');
}

let allProducts = [];
let activeCategory = "All";
let selectedProductForPurchase = null;

document.addEventListener("DOMContentLoaded", async () => {
  if (!document.getElementById("productGrid")) return;

  parseUrlCategory();
  await loadProducts();
  setupCategoryFilters();
  setupSearch();
  setupPurchaseModal();
});

function parseUrlCategory() {
  const urlParams = new URLSearchParams(window.location.search);
  const catParam = urlParams.get("cat");
  if (!catParam) return;

  const catMap = {
    "Printers": "Printers & Accessories",
    "Motherboards": "Motherboards",
    "CCTV": "CCTV Cameras",
    "SMPS": "SMPS & Power Supplies",
    "Keyboards": "Keyboards & Mice",
    "Peripherals": "All Computer Peripherals"
  };

  const matchedCat = catMap[catParam] || catParam;
  activeCategory = matchedCat;

  const filterBtns = document.querySelectorAll(".cat-filter-pill, .filter-btn");
  filterBtns.forEach(btn => {
    const btnCat = btn.getAttribute("data-category");
    if (btnCat === matchedCat) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

async function loadProducts() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  grid.innerHTML = `<div class="text-center" style="grid-column: 1/-1; padding: 3rem;"><i class="fas fa-spinner fa-spin fa-2x"></i><p style="margin-top:1rem;">Loading inventory catalog...</p></div>`;

  try {
    if (window.db) {
      const snapshot = await window.db.collection('products').get();
      const products = [];
      snapshot.forEach(doc => {
        products.push({ id: doc.id, ...doc.data() });
      });
      allProducts = products;
      localStorage.setItem('gc_products', JSON.stringify(products));

      window.db.collection('products').onSnapshot(snap => {
        const realtime = [];
        snap.forEach(doc => realtime.push({ id: doc.id, ...doc.data() }));
        allProducts = realtime;
        localStorage.setItem('gc_products', JSON.stringify(realtime));
        renderProducts();
      });
    } else if (window.dbStore) {
      allProducts = await window.dbStore.getProducts();
      if (typeof window.dbStore.listenToProducts === "function") {
        window.dbStore.listenToProducts((realtimeProducts) => {
          allProducts = realtimeProducts;
          renderProducts();
        });
      }
    } else {
      const data = localStorage.getItem("gc_products");
      allProducts = data ? JSON.parse(data) : [];
    }
    renderProducts();
  } catch (err) {
    console.error("Failed to fetch products from Firestore:", err);
    try {
      const data = localStorage.getItem("gc_products");
      allProducts = data ? JSON.parse(data) : [];
      renderProducts();
    } catch (e) {
      grid.innerHTML = `<div class="text-center" style="grid-column: 1/-1; padding: 3rem; color: #F87171;">Failed to load products. Please refresh.</div>`;
    }
  }
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  const searchVal = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();

  let filtered = allProducts;

  if (activeCategory !== "All") {
    filtered = filtered.filter(p => p.category === activeCategory);
  }

  if (searchVal) {
    filtered = filtered.filter(p => 
      p.title.toLowerCase().includes(searchVal) || 
      p.category.toLowerCase().includes(searchVal) ||
      (p.description && p.description.toLowerCase().includes(searchVal))
    );
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="text-center" style="grid-column: 1/-1; padding: 4rem 1rem;">
        <i class="fas fa-box-open fa-3x" style="color: var(--text-light); margin-bottom: 1rem;"></i>
        <h3>No Products Found</h3>
        <p style="color: var(--text-secondary); margin-top: 0.5rem;">Try selecting a different category or clearing your search keywords.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(prod => {
    const stockCount = prod.stock !== undefined ? parseInt(prod.stock) : 1;
    const stockBadge = stockCount > 0 
      ? `<span style="background: rgba(16, 185, 129, 0.15); color: #34D399; font-weight: 600; font-size: 0.78rem; padding: 0.2rem 0.55rem; border-radius: 6px; border: 1px solid rgba(16, 185, 129, 0.3); display: inline-flex; align-items: center; gap: 0.25rem;">
          <i class="fas fa-check-circle" style="font-size: 0.7rem;"></i> ${stockCount} in stock
         </span>`
      : `<span style="background: rgba(239, 68, 68, 0.15); color: #F87171; font-weight: 600; font-size: 0.78rem; padding: 0.2rem 0.55rem; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.3); display: inline-flex; align-items: center; gap: 0.25rem;">
          <i class="fas fa-times-circle" style="font-size: 0.7rem;"></i> Out of stock
         </span>`;

    const imgPath = prod.image || prod.imageUrl || prod.image_url || 'assets/cat_motherboard.jpg';
    const priceFormatted = window.formatINR ? window.formatINR(prod.price) : '₹' + Number(prod.price || 0).toLocaleString('en-IN');

    return `
      <div class="product-card">
        <div class="product-img-wrapper" style="position: relative;">
          <span class="product-tag">${prod.category ? prod.category.split("&")[0] : 'General'}</span>
          <img src="${imgPath}" alt="${prod.title}" class="product-img" onerror="this.src='assets/hero_banner.jpg'" />
        </div>
        <div class="product-content">
          <h3 class="product-title" style="color: #FFFFFF !important; font-weight: 700; font-size: 1.15rem; margin-bottom: 0.4rem;">${prod.title}</h3>

          <!-- Price & Stock Quantity Row -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
            <span class="product-price" style="font-size: 1.15rem; font-weight: 700; color: #38BDF8;">
              ${priceFormatted}
            </span>
            ${stockBadge}
          </div>

          <p class="product-description" style="color: #CBD5E1 !important; font-size: 0.85rem; line-height: 1.4; min-height: 40px; margin-bottom: 1rem;">
            ${prod.description || ''}
          </p>

          <div class="product-footer">
            <button type="button" class="btn btn-primary btn-full btn-sm buy-btn" onclick="window.openPurchaseModal('${prod.id}', event)" style="display: flex; justify-content: center; align-items: center; gap: 0.5rem;">
              <i class="fas fa-shopping-cart"></i> Inquire / Purchase
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function setupCategoryFilters() {
  const filterBtns = document.querySelectorAll(".cat-filter-pill, .filter-btn");
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeCategory = btn.getAttribute("data-category") || "All";
      renderProducts();
    });
  });
}

function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      renderProducts();
    });
  }
}

function setupPurchaseModal() {
  const modal = document.getElementById("purchaseModal");
  const closeBtns = document.querySelectorAll("#purchaseModal .modal-close, #cancelPurchaseBtn");
  const form = document.getElementById("purchaseForm");

  closeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      closePurchaseModal();
    });
  });

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      if (!selectedProductForPurchase) return;

      const customerName = document.getElementById("custName").value.trim();
      const customerPhone = document.getElementById("custPhone").value.trim();
      const emailElem = document.getElementById("inquiry-email") || document.getElementById("custEmail");
      const customerEmail = emailElem ? emailElem.value.trim() : "";
      const customerAddress = document.getElementById("custAddress").value.trim();
      const notesElem = document.getElementById("custNotes");
      const notes = notesElem ? notesElem.value.trim() : "";

      if (!customerName || !customerPhone || !customerAddress) {
        if (window.showToast) window.showToast("Please fill in all required fields.", "error");
        else alert("Please fill in all required fields.");
        return;
      }

      const submitBtn = form.querySelector("button[type='submit']");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Submitting...`;
      }

      try {
        const uniqueNum = Math.floor(1000 + Math.random() * 9000);
        const requestId = `REQ-${uniqueNum}`;

        const purchaseData = {
          requestId: requestId,
          id: requestId, // Set document ID and internal ID identically
          productTitle: selectedProductForPurchase.title,
          product_title: selectedProductForPurchase.title,
          productPrice: parseFloat(selectedProductForPurchase.price) || 0,
          price: parseFloat(selectedProductForPurchase.price) || 0,
          customerName: customerName,
          customer_name: customerName,
          customerPhone: customerPhone,
          phone: customerPhone,
          customerEmail: customerEmail,
          email: customerEmail,
          customerAddress: customerAddress,
          address: customerAddress,
          notes: notes,
          status: 'Pending',
          createdAt: (typeof firebase !== "undefined" && firebase.firestore && firebase.firestore.FieldValue)
            ? firebase.firestore.FieldValue.serverTimestamp()
            : new Date().toISOString(),
          timestamp: new Date().toISOString()
        };

        // 1. Direct Firestore write using doc(requestId) so Document ID matches requestId
        if (window.db) {
          try {
            await window.db.collection('purchase_inquiries').doc(requestId).set(purchaseData);
            console.log("✅ Purchase Inquiry saved with ID:", requestId);
          } catch (err) {
            console.error("Error saving purchase inquiry to Firestore:", err);
          }
        }

        if (window.dbStore && typeof window.dbStore.addPurchaseRequest === 'function') {
          await window.dbStore.addPurchaseRequest(purchaseData);
        } else {
          // 2. Save exact same data to local cache
          let localRequests = JSON.parse(localStorage.getItem('gc_purchase_requests')) || [];
          localRequests.unshift(purchaseData);
          localStorage.setItem('gc_purchase_requests', JSON.stringify(localRequests));
        }

        const confirmedTitle = selectedProductForPurchase
          ? (selectedProductForPurchase.title || selectedProductForPurchase.productTitle || selectedProductForPurchase.product_title || '')
          : '';
        const rawPriceVal = selectedProductForPurchase
          ? (selectedProductForPurchase.price !== undefined ? selectedProductForPurchase.price : selectedProductForPurchase.productPrice)
          : 0;
        const confirmedPrice = parseFloat(rawPriceVal) || 0;

        form.reset();
        closePurchaseModal();

        // 3. Display the EXACT same requestId in success modal with order details
        showSuccessModal(requestId, customerName, confirmedTitle, confirmedPrice);
      } catch (err) {
        console.error("Error submitting purchase request:", err);
        if (window.showToast) window.showToast("Error submitting inquiry. Please try again.", "error");
        else alert("Error submitting inquiry. Please try again.");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<i class="fas fa-paper-plane"></i> Submit Request`;
        }
      }
    });
  }
}

window.showSuccessModal = function(refId, custName, prodTitle, prodPrice) {
  const modal = document.getElementById("inquiry-success-modal");
  const refElem = document.getElementById("success-ref-id");
  const copyBtn = document.getElementById("copy-ref-id-btn");
  const closeBtn = document.getElementById("close-success-modal-btn");

  const nameElem = document.getElementById("inquiryCustName");
  const titleElem = document.getElementById("inquiryProdTitle");
  const priceElem = document.getElementById("inquiryProdPrice");
  const trackBtn = document.getElementById("trackOrderBtn");

  if (!modal) {
    console.error("❌ #inquiry-success-modal not found!");
    alert(`✅ Purchase Inquiry Submitted!\nYour Reference ID: ${refId}`);
    return;
  }

  if (refElem) refElem.textContent = refId || "REQ-SUCCESS";
  if (nameElem) nameElem.textContent = custName || "Valued Customer";
  if (titleElem) titleElem.textContent = prodTitle || (selectedProductForPurchase ? selectedProductForPurchase.title : "Computer Hardware");
  if (priceElem) {
    let rawPrice = prodPrice;
    if ((rawPrice === undefined || rawPrice === null || rawPrice === '') && selectedProductForPurchase) {
      rawPrice = selectedProductForPurchase.price !== undefined ? selectedProductForPurchase.price : selectedProductForPurchase.productPrice;
    }
    const numericPrice = parseFloat(rawPrice) || 0;
    priceElem.textContent = typeof window.formatINR === "function" 
      ? window.formatINR(numericPrice) 
      : '₹' + Number(numericPrice).toLocaleString('en-IN');
  }
  if (trackBtn && refId) {
    trackBtn.href = `track.html?ref=${encodeURIComponent(refId)}`;
  }

  // Explicitly display with flexbox centering
  modal.style.display = "flex";
  modal.classList.add("active");

  if (copyBtn) {
    copyBtn.onclick = () => {
      const textToCopy = refElem ? refElem.textContent : refId;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          copyBtn.innerHTML = `<i class="fas fa-check"></i> Copied!`;
          setTimeout(() => {
            copyBtn.innerHTML = `<i class="fas fa-copy"></i> Copy Inquiry ID`;
          }, 2000);
        }).catch(() => fallbackCopy(textToCopy, copyBtn));
      } else {
        fallbackCopy(textToCopy, copyBtn);
      }
    };
  }

  if (closeBtn) {
    closeBtn.onclick = () => {
      window.closeSuccessModal();
    };
  }

  modal.onclick = (e) => {
    if (e.target === modal) {
      window.closeSuccessModal();
    }
  };
};

window.closeSuccessModal = function() {
  const modal = document.getElementById("inquiry-success-modal");
  if (modal) {
    modal.style.display = "none";
    modal.classList.remove("active");
  }
};

function fallbackCopy(text, btn) {
  const tempInput = document.createElement("input");
  tempInput.value = text;
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand("copy");
  document.body.removeChild(tempInput);
  if (btn) {
    btn.innerHTML = `<i class="fas fa-check"></i> Copied!`;
    setTimeout(() => {
      btn.innerHTML = `<i class="fas fa-copy"></i> Copy Reference ID`;
    }, 2000);
  }
}

// Global Open Purchase Modal Handler
window.openPurchaseModal = function(productId, e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  console.log("👉 Opening Purchase Modal for Product ID:", productId);
  if (!productId) return;

  // Find product from memory or localStorage fallback
  selectedProductForPurchase = allProducts.find(p => String(p.id) === String(productId));
  if (!selectedProductForPurchase) {
    const cached = JSON.parse(localStorage.getItem('gc_products')) || [];
    selectedProductForPurchase = cached.find(p => String(p.id) === String(productId));
  }

  if (!selectedProductForPurchase) {
    console.warn("Product not found for inquiry:", productId);
    return;
  }

  const modal = document.getElementById("purchaseModal");
  if (!modal) {
    console.error("❌ #purchaseModal element not found in DOM!");
    return;
  }

  const titleEl = document.getElementById("modalProdTitle");
  const priceEl = document.getElementById("modalProdPrice");

  if (titleEl) titleEl.textContent = selectedProductForPurchase.title || 'Selected Item';
  if (priceEl) {
    priceEl.textContent = window.formatINR 
      ? window.formatINR(selectedProductForPurchase.price) 
      : '₹' + Number(selectedProductForPurchase.price || 0).toLocaleString('en-IN');
  }

  // Explicitly display modal with flexbox centering
  modal.style.display = "flex";
  modal.classList.add("active");
};

// Global Close Purchase Modal Handler
window.closePurchaseModal = function(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const modal = document.getElementById("purchaseModal");
  if (modal) {
    modal.style.display = "none";
    modal.classList.remove("active");
  }
  selectedProductForPurchase = null;
};
