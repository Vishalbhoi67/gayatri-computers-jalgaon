/* ==========================================================================
   Gayatri AI Assistant - Intelligent Chatbot Engine
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("chatbotToggleBtn");
  const panel = document.getElementById("chatbotPanel");
  const closeBtn = document.getElementById("chatbotCloseBtn");

  if (toggleBtn && panel) {
    toggleBtn.addEventListener("click", (e) => {
      if (e) e.stopPropagation();
      const currentDisplay = window.getComputedStyle(panel).display;
      const isHidden = panel.style.display === "none" || currentDisplay === "none";
      if (isHidden) {
        panel.style.display = "flex";
        panel.classList.add("active");
        setTimeout(() => {
          document.getElementById("chatbotInput")?.focus();
        }, 100);
      } else {
        panel.style.display = "none";
        panel.classList.remove("active");
      }
    });
  }

  if (closeBtn && panel) {
    closeBtn.addEventListener("click", (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      panel.style.display = "none";
      panel.classList.remove("active");
    });
  }
});

function handleQuickPrompt(text) {
  const input = document.getElementById("chatbotInput");
  if (input) {
    input.value = text;
    handleChatSubmit(new Event("submit"));
  }
}

function handleChatSubmit(e) {
  if (e) e.preventDefault();
  const input = document.getElementById("chatbotInput");
  const container = document.getElementById("chatMessagesContainer");
  if (!input || !container) return;

  const query = input.value.trim();
  if (!query) return;

  // Append user message
  appendMessage("user", query);
  input.value = "";

  // Show typing response
  setTimeout(() => {
    const responseHtml = generateAIResponse(query);
    appendMessage("bot", responseHtml);
    container.scrollTop = container.scrollHeight;
  }, 450);
}

function appendMessage(sender, contentHtml) {
  const container = document.getElementById("chatMessagesContainer");
  if (!container) return;

  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-msg ${sender}-msg`;
  msgDiv.innerHTML = `<div class="msg-bubble">${contentHtml}</div>`;
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function generateAIResponse(userInput) {
  const text = userInput.toLowerCase();

  // 1. Store Location / Address / Timing
  if (text.includes("location") || text.includes("address") || text.includes("timing") || text.includes("time") || text.includes("patta") || text.includes("kuthe") || text.includes("kaha")) {
    return `
      📍 <strong>Gayatri Computers Address:</strong><br>
      Shop No. 2, C-Wing, 2nd Floor, Golani Market, Above Lokmat Office, Jalgaon - 425001.<br><br>
      ⏰ <strong>Working Hours:</strong><br>
      Mon - Sat: 10:30 AM to 07:00 PM<br>
      <span style="color:#F87171;">Sunday: Closed</span><br>
      📞 <strong>Contact:</strong> 9226958825 / 9373626593<br>
      <a href="contact.html" class="chat-action-btn"><i class="fas fa-map-marker-alt"></i> View Map & Contact</a>
    `;
  }

  // 2. Repair Services (Laptop, Desktop, Printer, CCTV)
  if (text.includes("repair") || text.includes("service") || text.includes("laptop") || text.includes("printer") || text.includes("cctv") || text.includes("screen") || text.includes("battery") || text.includes("motherboard repair")) {
    return `
      🛠️ <strong>Our Authorized Repair Services:</strong><br>
      • Laptop Chip-Level Repair & Motherboard Fixing<br>
      • Desktop Assembly & SMPS Power Supply Replacement<br>
      • Printer Toner Refilling & Maintenance<br>
      • CCTV Camera Setup & Surveillance Wiring<br><br>
      तुम्ही थेट ऑनलाइन तिकीट बुक करू शकता:<br>
      <a href="services.html" class="chat-action-btn"><i class="fas fa-tools"></i> Book Repair Service</a>
    `;
  }

  // 3. Products & Stock Inquiry
  if (text.includes("product") || text.includes("price") || text.includes("stock") || text.includes("buy") || text.includes("motherboard") || text.includes("keyboard") || text.includes("mouse") || text.includes("parts")) {
    return `
      🖥️ <strong>Gayatri Computers Inventory:</strong><br>
      आमच्याकडे Gaming & Office Motherboards, Inkjet/Laserjet Printers, CCTV Cameras, Power Supplies (SMPS), Keyboards व सर्व Peripherals उपलब्ध आहेत.<br><br>
      लाईव्ह स्टॉक आणि किमती तपासण्यासाठी:<br>
      <a href="products.html" class="chat-action-btn"><i class="fas fa-shopping-cart"></i> Browse Products Catalog</a>
    `;
  }

  // 4. Tracking Order or Service
  if (text.includes("track") || text.includes("status") || text.includes("req") || text.includes("gc-srv") || text.includes("order") || text.includes("query")) {
    return `
      🔍 <strong>Live Tracking System:</strong><br>
      तुमच्या खरेदीची चौकशी (उदा. <code>REQ-XXXX</code>) किंवा रिपेअर तिकीट (उदा. <code>GC-SRV-XXXX</code>) किंवा तुमचा मोबाईल नंबर वापरून थेट ट्रॅक करा.<br><br>
      <a href="track.html" class="chat-action-btn"><i class="fas fa-search"></i> Go to Track Page</a>
    `;
  }

  // 5. WhatsApp & Calling Support
  if (text.includes("call") || text.includes("phone") || text.includes("whatsapp") || text.includes("contact") || text.includes("number")) {
    return `
      📞 <strong>Direct Store Helpline:</strong><br>
      • Mobile: <a href="tel:9226958825" style="color:#38BDF8;">+91 9226958825</a> / <a href="tel:9373626593" style="color:#38BDF8;">+91 9373626593</a><br>
      • Email: <a href="mailto:gcomp770@gmail.com" style="color:#38BDF8;">gcomp770@gmail.com</a><br><br>
      <a href="https://wa.me/919226958825" target="_blank" class="chat-action-btn" style="background: rgba(16, 185, 129, 0.2); border-color:#10B981; color:#34D399;"><i class="fab fa-whatsapp"></i> Chat on WhatsApp</a>
    `;
  }

  // 6. Default Fallback Response
  return `
    मी गायत्री कॉम्प्युटर्सचा AI सहाय्यक आहे. मी तुम्हाला खालील गोष्टींमध्ये मदत करू शकतो:<br><br>
    1. 📍 <strong>पत्ता व वेळ:</strong> "Shop Address"<br>
    2. 🛠️ <strong>रिपेअर सर्व्हिस:</strong> "Laptop or Printer Repair"<br>
    3. 🛒 <strong>प्रॉडक्ट्स व किंमत:</strong> "Available Products"<br>
    4. 🔍 <strong>स्टेटस ट्रॅक करा:</strong> "Track Order"<br><br>
    किंवा थेट दुकानाला संपर्क करा: <strong>9226958825</strong>
  `;
}

window.handleQuickPrompt = handleQuickPrompt;
window.handleChatSubmit = handleChatSubmit;
