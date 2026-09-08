/* ==========================================================================
   Unified Tracking & Query Controller - Gayatri Computers
   ========================================================================== */

let activeSearchTerm = "";

document.addEventListener("DOMContentLoaded", async () => {
  if (!document.getElementById("trackSearchForm")) return;

  const urlParams = new URLSearchParams(window.location.search);
  const searchId = urlParams.get("id");

  if (searchId) {
    const input = document.getElementById("trackInput");
    if (input) input.value = searchId;
    await performSearch(searchId);
  }

  const form = document.getElementById("trackSearchForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const val = document.getElementById("trackInput").value.trim();
    if (!val) {
      if (window.showToast) window.showToast("Please enter a Reference ID, Query ID, or Phone Number.", "error");
      return;
    }
    await performSearch(val);
  });

  // Setup real-time listener updates for active tracking search
  if (window.dbStore) {
    if (typeof window.dbStore.listenToServiceQueries === "function") {
      window.dbStore.listenToServiceQueries(() => {
        if (activeSearchTerm) performSearch(activeSearchTerm, true);
      });
    }
    if (typeof window.dbStore.listenToPurchaseRequests === "function") {
      window.dbStore.listenToPurchaseRequests(() => {
        if (activeSearchTerm) performSearch(activeSearchTerm, true);
      });
    }
  }
});

async function performSearch(term, isSilent = false) {
  const resultArea = document.getElementById("trackResultArea");
  if (!resultArea) return;

  const rawInput = (term || "").trim();
  const query = rawInput.toUpperCase();
  activeSearchTerm = rawInput;

  if (!rawInput || query === 'REQ' || query === 'GC' || query === 'GC-SRV' || rawInput.length < 5) {
    resultArea.innerHTML = `
      <div class="no-record-card text-center" style="padding: 3rem 1.5rem; background: rgba(30, 41, 59, 0.9); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 16px;">
        <i class="fas fa-search-minus fa-3x" style="color: #94A3B8; margin-bottom: 1rem;"></i>
        <h3 style="color: #FFFFFF; font-size: 1.35rem; margin-bottom: 0.5rem;">No Records Found</h3>
        <p style="color: #94A3B8; font-size: 0.95rem; max-width: 520px; margin: 0 auto;">
          Invalid Reference ID. Please enter the full Reference ID (e.g. REQ-5623 or GC-SRV-1001) or complete 10-digit Mobile Number.
        </p>
      </div>
    `;
    return;
  }

  if (!isSilent) {
    resultArea.innerHTML = `<div class="text-center" style="padding: 2.5rem; color: #38BDF8;"><i class="fas fa-spinner fa-spin fa-2x"></i><p style="margin-top:1rem; color: #FFFFFF;">Searching tracking records...</p></div>`;
  }

  let matchedItems = [];

  // Fetch live records from Firestore or cache
  if (window.db) {
    try {
      // 1. Check direct document ID match first
      const srvDoc = await window.db.collection('service_queries').doc(query).get();
      if (srvDoc.exists) {
        matchedItems.push({ item: { id: srvDoc.id, ...srvDoc.data() }, type: 'service' });
      } else {
        const purDoc = await window.db.collection('purchase_inquiries').doc(query).get();
        if (purDoc.exists) {
          matchedItems.push({ item: { id: purDoc.id, ...purDoc.data() }, type: 'purchase' });
        }
      }
    } catch (e) {
      console.warn("Direct doc query failed, querying collections:", e);
    }

    // 2. If not matched directly by document ID, search across Firestore collections:
    if (matchedItems.length === 0) {
      try {
        const purSnap = await window.db.collection('purchase_inquiries').get();
        purSnap.forEach(doc => {
          const data = { id: doc.id, ...doc.data() };
          const reqId = (data.requestId || data.id || '').toUpperCase();
          const phone = (data.customerPhone || data.phone || '').trim();

          if (reqId === query) {
            matchedItems.push({ item: data, type: 'purchase' });
          } else if (phone && phone === rawInput) {
            matchedItems.push({ item: data, type: 'purchase' });
          }
        });

        const srvSnap = await window.db.collection('service_queries').get();
        srvSnap.forEach(doc => {
          const data = { id: doc.id, ...doc.data() };
          const srvId = (data.queryId || data.id || '').toUpperCase();
          const phone = (data.customerPhone || data.phone || '').trim();

          if (srvId === query) {
            matchedItems.push({ item: data, type: 'service' });
          } else if (phone && phone === rawInput) {
            matchedItems.push({ item: data, type: 'service' });
          }
        });
      } catch (err) {
        console.error("Collection search failed:", err);
      }
    }
  }

  // 3. Fallback search in LocalStorage cache if not found in Firestore
  if (matchedItems.length === 0) {
    const localPurchases = JSON.parse(localStorage.getItem('gc_purchase_requests')) || [];
    localPurchases.forEach(data => {
      const reqId = (data.requestId || data.id || '').toUpperCase();
      const phone = (data.customerPhone || data.phone || '').trim();

      if (reqId === query || (phone && phone === rawInput)) {
        matchedItems.push({ item: data, type: 'purchase' });
      }
    });

    const localServices = JSON.parse(localStorage.getItem('gc_service_queries')) || [];
    localServices.forEach(data => {
      const srvId = (data.queryId || data.id || '').toUpperCase();
      const phone = (data.customerPhone || data.phone || '').trim();

      if (srvId === query || (phone && phone === rawInput)) {
        matchedItems.push({ item: data, type: 'service' });
      }
    });
  }

  if (matchedItems.length > 0) {
    let html = "";
    const seen = new Set();
    matchedItems.forEach(({ item, type }) => {
      const key = (type === 'purchase' ? (item.requestId || item.id) : (item.queryId || item.id));
      if (!seen.has(key)) {
        seen.add(key);
        if (type === 'purchase') {
          html += renderPurchaseInquiryCard(item);
        } else {
          html += renderQueryResultCard(item);
        }
      }
    });
    resultArea.innerHTML = html;
  } else {
    resultArea.innerHTML = `
      <div class="no-record-card text-center" style="padding: 3rem 1.5rem; background: rgba(30, 41, 59, 0.9); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 16px;">
        <i class="fas fa-search-minus fa-3x" style="color: #94A3B8; margin-bottom: 1rem;"></i>
        <h3 style="color: #FFFFFF; font-size: 1.35rem; margin-bottom: 0.5rem;">No Records Found</h3>
        <p style="color: #94A3B8; font-size: 0.95rem; max-width: 520px; margin: 0 auto;">
          No active order or repair ticket matched "<strong>${rawInput}</strong>". Please verify your Reference ID or Mobile Number.
        </p>
      </div>
    `;
  }
}

function formatTrackDate(dateVal) {
  if (!dateVal) return 'Recently Logged';
  let d;
  if (dateVal.toDate && typeof dateVal.toDate === 'function') {
    d = dateVal.toDate();
  } else if (dateVal.seconds) {
    d = new Date(dateVal.seconds * 1000);
  } else {
    d = new Date(dateVal);
  }
  return isNaN(d.getTime()) ? 'Recently Logged' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function renderPurchaseInquiryCard(req) {
  const reqId = req.requestId || req.id || "REQ-ORDER";
  const custName = req.customerName || req.customer_name || "Valued Customer";
  const phone = req.phone || "N/A";
  const email = req.email || "";
  const address = req.address || "Store Pickup / Jalgaon";
  const productTitle = req.productTitle || req.product_title || "Computer Product";
  const price = req.price ? (window.formatINR ? window.formatINR(req.price) : '₹' + req.price) : "N/A";
  const status = req.status || "Pending";
  const timestamp = formatTrackDate(req.createdAt || req.timestamp);

  let stepLevel = 1;
  let progressWidth = "0%";
  if (status === "Pending" || status === "Submitted") {
    stepLevel = 1;
    progressWidth = "0%";
  } else if (status === "Contacted" || status === "Under Review" || status === "Processing" || status === "Contacted / Approved") {
    stepLevel = 2;
    progressWidth = "50%";
  } else if (status === "Confirmed" || status === "Dispatched" || status === "Completed" || status === "Delivered") {
    stepLevel = 3;
    progressWidth = "100%";
  }

  const badgeClass = (status === "Completed" || status === "Delivered" || status === "Confirmed") ? "badge-completed" :
                     (status === "Contacted" || status === "Under Review" || status === "Contacted / Approved") ? "badge-processing" : "badge-pending";

  return `
    <div class="track-card track-result-card" style="margin-bottom: 2rem; background: rgba(30, 41, 59, 0.9); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 16px; padding: 1.75rem;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1.25rem; margin-bottom: 1.5rem;">
        <div>
          <span class="badge ${badgeClass}" style="margin-bottom: 0.5rem;"><i class="fas fa-shopping-cart"></i> Purchase Inquiry</span>
          <h2 style="font-size: 1.4rem; color: #FFFFFF; font-family: var(--font-heading); margin-top: 0.25rem;">Ref ID: ${reqId}</h2>
          <p style="font-size: 0.85rem; color: #94A3B8;">Submitted on ${timestamp}</p>
        </div>
        <div>
          <div class="status-badge-highlight" style="background: rgba(14, 165, 233, 0.15); border: 1px solid rgba(14, 165, 233, 0.3); color: #38BDF8; font-weight: 600; padding: 0.5rem 1rem; border-radius: 8px;">
            <i class="fas fa-tag"></i> Status: ${status}
          </div>
        </div>
      </div>

      <!-- Purchase Timeline Stepper -->
      <div class="tracking-timeline-container">
        <div class="timeline-track-bg"></div>
        <div class="timeline-track-fill" style="width: ${progressWidth};"></div>
        
        <div class="timeline-steps">
          <div class="timeline-step ${stepLevel >= 1 ? 'active' : ''}">
            <div class="step-icon"><i class="fas fa-paper-plane"></i></div>
            <div class="step-label">Submitted / Review</div>
          </div>

          <div class="timeline-step ${stepLevel >= 2 ? 'active' : ''}">
            <div class="step-icon"><i class="fas fa-headset"></i></div>
            <div class="step-label">Contacted / Verified</div>
          </div>

          <div class="timeline-step ${stepLevel >= 3 ? 'active' : ''}">
            <div class="step-icon"><i class="fas fa-check-circle"></i></div>
            <div class="step-label">Ready / Completed</div>
          </div>
        </div>
      </div>

      <!-- Detail Breakdowns -->
      <div class="query-info-box" style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 1.25rem;">
        <div class="info-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          <div class="info-item">
            <label style="color: #94A3B8; font-size: 0.8rem; display: block; margin-bottom: 0.2rem;">Customer Name</label>
            <p style="color: #FFFFFF; font-weight: 600; margin: 0;">${custName}</p>
          </div>
          <div class="info-item">
            <label style="color: #94A3B8; font-size: 0.8rem; display: block; margin-bottom: 0.2rem;">Mobile Number</label>
            <p style="color: #FFFFFF; font-weight: 600; margin: 0;">${phone}</p>
          </div>
          ${email ? `
          <div class="info-item">
            <label style="color: #94A3B8; font-size: 0.8rem; display: block; margin-bottom: 0.2rem;">Email Address</label>
            <p style="color: #FFFFFF; font-weight: 600; margin: 0;">${email}</p>
          </div>
          ` : ''}
          <div class="info-item">
            <label style="color: #94A3B8; font-size: 0.8rem; display: block; margin-bottom: 0.2rem;">Requested Product</label>
            <p style="color: #38BDF8; font-weight: 700; margin: 0;">${productTitle}</p>
          </div>
          <div class="info-item">
            <label style="color: #94A3B8; font-size: 0.8rem; display: block; margin-bottom: 0.2rem;">Price</label>
            <p style="color: #4ADE80; font-weight: 700; margin: 0;">${price}</p>
          </div>
          <div class="info-item" style="grid-column: 1/-1;">
            <label style="color: #94A3B8; font-size: 0.8rem; display: block; margin-bottom: 0.2rem;">Delivery / Pickup Address</label>
            <p style="color: #E2E8F0; margin: 0;">${address}</p>
          </div>
          ${req.notes ? `
          <div class="info-item" style="grid-column: 1/-1;">
            <label style="color: #94A3B8; font-size: 0.8rem; display: block; margin-bottom: 0.2rem;">Notes / Specifications</label>
            <p style="color: #E2E8F0; margin: 0;">${req.notes}</p>
          </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

function renderQueryResultCard(query) {
  const qId = query.queryId || query.id || "GC-SRV";
  const custName = query.customerName || query.customer_name || "Valued Customer";
  const phone = query.customerPhone || query.phone || "N/A";
  const device = query.deviceType || query.device || "N/A";
  const brand = query.deviceBrand || query.brand || "";
  const issue = query.issueDescription || query.issue || "General Repair";
  const status = query.status || "Pending";
  const timestamp = formatTrackDate(query.createdAt || query.timestamp);

  let stepLevel = 1;
  let progressWidth = "0%";

  if (status === "Pending" || status === "Pending Approval") {
    stepLevel = 1;
    progressWidth = "0%";
  } else if (status === "In Repair" || status === "Processing") {
    stepLevel = 2;
    progressWidth = "33.33%";
  } else if (status === "Testing" || status === "Approved & Dispatched" || status === "Approved") {
    stepLevel = 3;
    progressWidth = "66.66%";
  } else if (status === "Completed" || status === "Delivered") {
    stepLevel = 4;
    progressWidth = "100%";
  }

  const badgeClass = (status === "Completed" || status === "Delivered") ? "badge-completed" :
                     (status === "In Repair" || status === "Processing" || status === "Testing") ? "badge-processing" : "badge-pending";

  return `
    <div class="track-card track-result-card" style="margin-bottom: 2rem; background: rgba(30, 41, 59, 0.9); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 16px; padding: 1.75rem;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
        <div>
          <span class="badge ${badgeClass}" style="margin-bottom: 0.5rem;">${status}</span>
          <h2 style="font-size: 1.4rem; color: #FFFFFF; font-family: var(--font-heading); margin-top: 0.25rem;">Service Ref: ${qId}</h2>
          <p style="font-size: 0.85rem; color: #94A3B8;">Logged on ${timestamp}</p>
        </div>
      </div>

      <!-- Live Stepper -->
      <div class="tracking-timeline-container">
        <div class="timeline-track-bg"></div>
        <div class="timeline-track-fill" style="width: ${progressWidth};"></div>
        
        <div class="timeline-steps">
          <div class="timeline-step ${stepLevel >= 1 ? 'active' : ''}">
            <div class="step-icon"><i class="fas fa-clock"></i></div>
            <div class="step-label">Pending Approval</div>
          </div>

          <div class="timeline-step ${stepLevel >= 2 ? 'active' : ''}">
            <div class="step-icon"><i class="fas fa-tools"></i></div>
            <div class="step-label">In Repair</div>
          </div>

          <div class="timeline-step ${stepLevel >= 3 ? 'active' : ''}">
            <div class="step-icon"><i class="fas fa-vial"></i></div>
            <div class="step-label">Testing</div>
          </div>

          <div class="timeline-step ${stepLevel >= 4 ? 'active' : ''}">
            <div class="step-icon"><i class="fas fa-check-circle"></i></div>
            <div class="step-label">Completed</div>
          </div>
        </div>
      </div>

      <!-- Detail Breakdowns -->
      <div class="query-info-box" style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 1.25rem;">
        <div class="info-grid">
          <div class="info-item">
            <label style="color: #94A3B8;">Customer Name</label>
            <p style="color: #FFFFFF;">${custName}</p>
          </div>
          <div class="info-item">
            <label style="color: #94A3B8;">Mobile Number</label>
            <p style="color: #FFFFFF;">${phone}</p>
          </div>
          <div class="info-item">
            <label style="color: #94A3B8;">Equipment / Model</label>
            <p style="color: #FFFFFF;">${device} ${brand ? `(${brand})` : ''}</p>
          </div>
          <div class="info-item">
            <label style="color: #94A3B8;">Estimated Cost</label>
            <p style="color: #4ADE80; font-weight: 700;">${query.estimated_cost || 'Under Assessment'}</p>
          </div>
          <div class="info-item" style="grid-column: 1/-1;">
            <label style="color: #94A3B8;">Reported Issue</label>
            <p style="font-weight: 400; color: #CBD5E1;">${issue}</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

window.performSearch = performSearch;
