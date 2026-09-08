/* ==========================================================================
   Global App Controller - Gayatri Computers
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  initMobileMenu();
  initToastContainer();
  initBrandMarquee();
  initHeroSlider();
});

// Navbar active state highlighter
function initNavbar() {
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const navLinks = document.querySelectorAll(".nav-link");

  navLinks.forEach(link => {
    const href = link.getAttribute("href");
    if (href === currentPath || (currentPath === "" && href === "index.html")) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

// Mobile responsive menu toggle
function initMobileMenu() {
  const toggleBtn = document.getElementById("mobileToggle");
  const navMenu = document.getElementById("navMenu");

  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener("click", () => {
      navMenu.classList.toggle("show");
      const icon = toggleBtn.querySelector("i");
      if (icon) {
        icon.className = navMenu.classList.contains("show") ? "fas fa-times" : "fas fa-bars";
      }
    });
  }
}

// Toast notification helper container
function initToastContainer() {
  if (!document.getElementById("toastContainer")) {
    const container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
}

function showToast(message, type = "success") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    initToastContainer();
    container = document.getElementById("toastContainer");
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  const iconClass = type === "success" ? "fa-check-circle" : "fa-exclamation-circle";
  
  toast.innerHTML = `
    <i class="fas ${iconClass}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Utility: Format currency in INR
function formatINR(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
}

// Brand Marquee Touch Interactivity for Mobile Devices
function initBrandMarquee() {
  const wrapper = document.querySelector(".brand-marquee-wrapper");
  if (wrapper) {
    const track = wrapper.querySelector(".brand-marquee-track");
    if (track) {
      wrapper.addEventListener("touchstart", () => {
        track.style.animationPlayState = "paused";
      }, { passive: true });
      wrapper.addEventListener("touchend", () => {
        track.style.animationPlayState = "running";
      }, { passive: true });
    }
  }
}

// Full-Width Hero Section Cross-Fade Image Slider
function initHeroSlider() {
  const slides = document.querySelectorAll(".hero-slide");
  const dots = document.querySelectorAll(".slider-dot");
  const prevBtn = document.getElementById("heroPrevBtn");
  const nextBtn = document.getElementById("heroNextBtn");
  const sliderContainer = document.getElementById("heroSlider");

  if (!slides.length) return;

  let currentSlide = 0;
  let slideInterval = null;
  const slideDuration = 3000; // 3 seconds auto-play interval

  function goToSlide(index) {
    slides[currentSlide].classList.remove("active");
    if (dots[currentSlide]) dots[currentSlide].classList.remove("active");

    currentSlide = (index + slides.length) % slides.length;

    slides[currentSlide].classList.add("active");
    if (dots[currentSlide]) dots[currentSlide].classList.add("active");
  }

  function nextSlide() {
    goToSlide(currentSlide + 1);
  }

  function prevSlide() {
    goToSlide(currentSlide - 1);
  }

  function startAutoPlay() {
    stopAutoPlay();
    slideInterval = setInterval(nextSlide, slideDuration);
  }

  function stopAutoPlay() {
    if (slideInterval) clearInterval(slideInterval);
  }

  // Navigation Button Handlers
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      nextSlide();
      startAutoPlay();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      prevSlide();
      startAutoPlay();
    });
  }

  // Dots Indicator Handlers
  dots.forEach((dot, idx) => {
    dot.addEventListener("click", () => {
      goToSlide(idx);
      startAutoPlay();
    });
  });

  // Pause on Hover
  if (sliderContainer) {
    sliderContainer.addEventListener("mouseenter", stopAutoPlay);
    sliderContainer.addEventListener("mouseleave", startAutoPlay);

    // Mobile Swipe Gestures
    let touchStartX = 0;
    let touchEndX = 0;

    sliderContainer.addEventListener("touchstart", (e) => {
      touchStartX = e.changedTouches[0].screenX;
      stopAutoPlay();
    }, { passive: true });

    sliderContainer.addEventListener("touchend", (e) => {
      touchEndX = e.changedTouches[0].screenX;
      if (touchStartX - touchEndX > 40) {
        nextSlide();
      } else if (touchEndX - touchStartX > 40) {
        prevSlide();
      }
      startAutoPlay();
    }, { passive: true });
  }

  // Start initial slideshow
  startAutoPlay();
}

// Export helpers to global scope
window.showToast = showToast;
window.formatINR = formatINR;


