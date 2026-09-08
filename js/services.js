/* ==========================================================================
   Services & Repair Booking Controller - Gayatri Computers
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  setupEquipmentSelectors();
  setupServiceForm();
});

function setupEquipmentSelectors() {
  const cards = document.querySelectorAll(".service-type-card");
  const deviceInput = document.getElementById("deviceTypeInput");

  cards.forEach(card => {
    card.addEventListener("click", () => {
      cards.forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      const device = card.getAttribute("data-device");
      if (deviceInput) deviceInput.value = device;
    });
  });
}

function setupServiceForm() {
  const form = document.getElementById("serviceBookingForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const customerName = document.getElementById("srvCustName").value.trim();
    const customerPhone = document.getElementById("srvCustPhone").value.trim();
    const deviceType = document.getElementById("deviceTypeInput").value;
    const deviceBrand = document.getElementById("srvDeviceBrand").value.trim() || "Standard Model";
    const issueDescription = document.getElementById("srvIssueDesc").value.trim();

    if (!customerName || !customerPhone || !deviceType || !issueDescription) {
      if (window.showToast) window.showToast("Please fill in all mandatory fields.", "error");
      else alert("Please fill in all mandatory fields.");
      return;
    }

    const submitBtn = form.querySelector("button[type='submit']");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Registering Ticket...`;
    }

    try {
      const queryId = "GC-SRV-" + Math.floor(1000 + Math.random() * 9000);
      const createdAt = (typeof firebase !== "undefined" && firebase.firestore && firebase.firestore.FieldValue)
        ? firebase.firestore.FieldValue.serverTimestamp()
        : new Date().toISOString();

      const queryData = {
        id: queryId,
        queryId: queryId,
        customerName: customerName,
        customerPhone: customerPhone,
        deviceType: deviceType,
        deviceBrand: deviceBrand,
        issueDescription: issueDescription,
        // Compatibility fields for legacy code/screens
        customer_name: customerName,
        phone: customerPhone,
        device: deviceType,
        brand: deviceBrand,
        issue: issueDescription,
        status: 'Pending',
        createdAt: createdAt
      };

      if (window.db) {
        await window.db.collection("service_queries").doc(queryId).set(queryData);
      }
      if (window.dbStore && typeof window.dbStore.addServiceQuery === "function") {
        await window.dbStore.addServiceQuery(queryData);
      }

      showServiceSuccessModal(queryData);
      form.reset();
    } catch (err) {
      console.error("Error creating service query:", err);
      if (window.showToast) window.showToast("Failed to book service request. Please try again.", "error");
      else alert("Failed to book service request. Please try again.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fas fa-paper-plane"></i> Book Service & Get Query ID`;
      }
    }
  });
}

function showServiceSuccessModal(query) {
  const modal = document.getElementById("serviceSuccessModal");
  const queryRef = query.queryId || query.id;

  if (!modal) {
    if (window.showToast) window.showToast(`Service Booked! Query Reference ID: ${queryRef}`);
    else alert(`Service Booked! Query Reference ID: ${queryRef}`);
    return;
  }

  const custName = query.customerName || query.customer_name || 'N/A';
  const devType = query.deviceType || query.device || 'N/A';
  const devBrand = query.deviceBrand || query.brand || '';

  const idElem = document.getElementById("resQueryId");
  const nameElem = document.getElementById("resCustName");
  const devElem = document.getElementById("resDevice");

  if (idElem) idElem.textContent = queryRef;
  if (nameElem) nameElem.textContent = custName;
  if (devElem) devElem.textContent = devBrand ? `${devType} (${devBrand})` : devType;
  
  const trackBtn = document.getElementById("directTrackBtn");
  if (trackBtn) {
    trackBtn.href = `track.html?id=${encodeURIComponent(queryRef)}`;
  }

  // Explicitly display with flexbox centering
  modal.style.display = "flex";
  modal.classList.add("active");

  const closeBtn = modal.querySelector(".modal-close");
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = "none";
      modal.classList.remove("active");
    };
  }

  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
      modal.classList.remove("active");
    }
  };

  const copyBtn = document.getElementById("copyQueryIdBtn");
  if (copyBtn) {
    copyBtn.onclick = () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(queryRef).then(() => {
          copyBtn.innerHTML = `<i class="fas fa-check"></i> Copied!`;
          setTimeout(() => {
            copyBtn.innerHTML = `<i class="fas fa-copy"></i> Copy Query ID`;
          }, 2000);
        });
      }
    };
  }
}
