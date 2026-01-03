// Utilities
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const isTouch =
  "ontouchstart" in window ||
  navigator.maxTouchPoints > 0 ||
  window.matchMedia("(pointer: coarse)").matches;

// Year in footer
if ($("#year")) $("#year").textContent = new Date().getFullYear();

// Theme and accent persistence
const storedTheme = localStorage.getItem("theme");
if (storedTheme) document.documentElement.setAttribute("data-theme", storedTheme);
const storedAccent = localStorage.getItem("accentPreset");
if (storedAccent) applyAccent(storedAccent);

// Progress bar
const progress = $("#progress");
if (progress) {
  const setProgress = () => {
    const h = document.documentElement;
    const scrolled =
      ((h.scrollTop || document.body.scrollTop) /
        ((h.scrollHeight || document.body.scrollHeight) - h.clientHeight)) *
      100;
    progress.style.width = scrolled + "%";
  };
  document.addEventListener("scroll", setProgress, { passive: true });
  setProgress();
}

// Intersection reveals
const revealEls = $$("[data-reveal], .stagger");
if (revealEls.length) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          io.unobserve(e.target);
          $$(".num", e.target).forEach(countUp);
        }
      });
    },
    { threshold: 0.2 }
  );
  revealEls.forEach((el) => io.observe(el));
}

// Count up animation
function countUp(el) {
  const target = +el.getAttribute("data-count");
  if (!target || Number.isNaN(target)) return;
  const duration = 1000;
  const start = performance.now();
  const step = (t) => {
    const p = Math.min(1, (t - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * eased).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* Hero title animation (stable + fallback) */
(function animateTitle() {
  const title = $("#heroTitle");
  if (!title) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const walker = document.createTreeWalker(
    title,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        return node.nodeValue.trim()
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    },
    false
  );

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach((node) => {
    const words = node.nodeValue.split(/(\s+)/);
    const frag = document.createDocumentFragment();
    words.forEach((w) => {
      if (/^\s+$/.test(w)) {
        frag.appendChild(document.createTextNode(w));
      } else {
        const outer = document.createElement("span");
        outer.className = "word";
        outer.style.display = "inline-block";
        outer.style.overflow = "hidden";

        const inner = document.createElement("span");
        inner.textContent = w;
        inner.style.display = "inline-block";
        inner.style.transform = "translateY(110%)";

        outer.appendChild(inner);
        frag.appendChild(outer);
      }
    });
    node.parentNode.replaceChild(frag, node);
  });

  const spans = $$(".word > span", title);

  const play = () => {
    if (reduce) {
      spans.forEach((s) => (s.style.transform = "translateY(0)"));
      return;
    }
    spans.forEach((s, i) => {
      setTimeout(() => {
        s.style.transition = "transform 300ms cubic-bezier(0.22,1,0.36,1)";
        s.style.transform = "translateY(0)";
      }, 15 * i);
    });
    setTimeout(() => {
      spans.forEach((s) => (s.style.transform = "translateY(0)"));
    }, 800);
  };

  if (document.visibilityState === "visible") play();
  else document.addEventListener("visibilitychange", play, { once: true });
})();

// Magnetic buttons
$$(".magnetic").forEach((btn) => {
  const strength = 14;
  const handle = (e) => {
    const rect = btn.getBoundingClientRect();
    const mx = e.clientX - (rect.left + rect.width / 2);
    const my = e.clientY - (rect.top + rect.height / 2);
    btn.style.transform = `translate(${(mx / rect.width) * strength}px,${
      (my / rect.height) * strength
    }px)`;
    const shine = $(".shine", btn);
    if (shine) {
      shine.style.setProperty("--mx", `${mx * 0.1}px`);
      shine.style.setProperty("--my", `${my * 0.1}px`);
    }
  };
  const leave = () => (btn.style.transform = "translate(0,0)");
  btn.addEventListener("mousemove", handle);
  btn.addEventListener("mouseleave", leave);
});

// Tilt effect (idempotent)
function initTilts(scope = document) {
  $$(".tilt", scope).forEach((card) => {
    if (card.dataset.tiltInit) return;
    card.dataset.tiltInit = "1";
    const maxTilt = 8;
    const onMove = (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(800px) rotateX(${
        -py * maxTilt
      }deg) rotateY(${px * maxTilt}deg)`;
      const shine = $(".shine", card);
      if (shine) {
        shine.style.setProperty("--px", `${(px + 0.5) * 100}%`);
        shine.style.setProperty("--py", `${(py + 0.5) * 100}%`);
      }
    };
    const onLeave = () => {
      card.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg)";
    };
    card.addEventListener("mousemove", onMove);
    card.addEventListener("mouseleave", onLeave);
  });
}
initTilts(document);

// Events carousel: infinite loop + drag (guarded for pages without it)
(function setupCarousel() {
  const track = $("#eventTrack");
  if (!track) return;

  const prev = $("#prevEvt");
  const next = $("#nextEvt");
  let baseWidth = 0;
  let normalizing = false;

  (function prepare() {
    const baseItems = $$(".evt", track);
    const clonesA = baseItems.map((n) => n.cloneNode(true));
    const clonesB = baseItems.map((n) => n.cloneNode(true));
    clonesA.forEach((n) => track.appendChild(n));
    clonesB.forEach((n) => track.appendChild(n));
    initTilts(track);
    requestAnimationFrame(() => {
      baseWidth = track.scrollWidth / 3;
      track.scrollLeft = baseWidth;
    });
  })();

  function normalizeScroll() {
    if (!baseWidth || normalizing) return;
    
    let targetScroll = track.scrollLeft;
    
    if (track.scrollLeft < baseWidth * 0.4) {
      targetScroll = track.scrollLeft + baseWidth;
    } else if (track.scrollLeft > baseWidth * 1.6) {
      targetScroll = track.scrollLeft - baseWidth;
    }
    
    if (targetScroll !== track.scrollLeft) {
      normalizing = true;
      track.scrollLeft = targetScroll;
      normalizing = false;
    }
  }

  (function dragToScroll() {
    let active = false;
    let startX = 0;
    let startScroll = 0;

    const onPointerDown = (e) => {
      e.preventDefault();
      active = true;
      startX = e.clientX;
      startScroll = track.scrollLeft;
      track.classList.add("dragging");
      track.setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e) => {
      if (!active) return;
      const dx = e.clientX - startX;
      let newScroll = startScroll - dx;
      
      // Seamlessly handle infinite scroll during drag
      if (newScroll < baseWidth * 0.2) {
        startScroll += baseWidth;
        newScroll = startScroll - dx;
      } else if (newScroll > baseWidth * 1.8) {
        startScroll -= baseWidth;
        newScroll = startScroll - dx;
      }
      
      track.scrollLeft = newScroll;
    };
    const onPointerUp = (e) => {
      active = false;
      track.classList.remove("dragging");
      track.releasePointerCapture?.(e.pointerId);
    };
    track.addEventListener("pointerdown", onPointerDown);
    track.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  })();

  function scrollByAmount(dir = 1) {
    const cardW =
      track.querySelector(".card")?.getBoundingClientRect().width || 280;
    track.scrollLeft += dir * (cardW + 16);
    requestAnimationFrame(normalizeScroll);
  }
  prev && prev.addEventListener("click", () => scrollByAmount(-1));
  next && next.addEventListener("click", () => scrollByAmount(1));
})();

// Gallery lightbox (supports both grid and masonry)

(function galleryLightbox() {
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");

  if (!lightbox || !lightboxImg) {
    console.warn("Lightbox elements not found");
    return;
  }

  // Use event delegation on document (safest) – works even for dynamically added images
  document.addEventListener("click", (e) => {
    // Find the closest image inside a gallery tile
    const img = e.target.closest(".gallery-grid img, .gallery-item img, .tile img, img[data-lightbox]");
    if (!img || !img.src || !img.closest('.gallery-grid, .masonry-grid')) return;

    e.preventDefault();
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt || "Gallery image";
    lightbox.classList.add("open");

    // Optional: preload larger version if you have data-src
    if (img.dataset.src) {
      lightboxImg.src = img.dataset.src;
    }
  });

  // Close when clicking overlay (not on image)
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox || e.target === lightbox.querySelector(".lightbox-close")) {
      lightbox.classList.remove("open");
      setTimeout(() => {
        lightboxImg.src = "";
      }, 300); // clear after transition
    }
  });

  // Optional: Close with Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox.classList.contains("open")) {
      lightbox.classList.remove("open");
      setTimeout(() => {
        lightboxImg.src = "";
      }, 300);
    }
  });
})();


// Custom cursor
const cursor = $("#cursor");
if (cursor && !isTouch) {
  document.addEventListener("mousemove", (e) => {
    cursor.style.opacity = "1";
    cursor.style.transform = `translate(${e.clientX - 9}px,${
      e.clientY - 9
    }px)`;
  });
  document.addEventListener("mouseleave", () => {
    cursor.style.opacity = "0";
  });
} else {
  cursor && cursor.remove();
}

// Space background (particles)
(function spaceBG() {
  const c = $("#space");
  if (!c) return;
  const x = c.getContext("2d");
  let w, h, dpr, stars;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = c.clientWidth;
    h = c.clientHeight;
    c.width = w * dpr;
    c.height = h * dpr;
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeStars();
  }
  function makeStars() {
    const count = Math.round((w * h) / 9000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.2 + 0.2,
      s: Math.random() * 0.5 + 0.2,
    }));
  }
  function draw(t) {
    x.clearRect(0, 0, w, h);
    for (const st of stars) {
      st.x += st.s * 0.08;
      if (st.x > w) st.x = 0;
      const glow = Math.sin((t * 0.001 + st.x) * 0.8) * 0.4 + 0.6;
      x.fillStyle = `rgba(${78 * glow},${140 * glow},${255 * glow},${0.75})`;
      x.beginPath();
      x.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      x.fill();
    }
    requestAnimationFrame(draw);
  }
  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(draw);
})();

// Sticky nav hide/show - DISABLED
// (function smartNav() {
//   const nav = $("#nav");
//   if (!nav) return;
//   let last = window.scrollY;
//   let ticking = false;
//   function onScroll() {
//     const cur = window.scrollY;
//     if (!ticking) {
//       window.requestAnimationFrame(() => {
//         const down = cur > last && cur > 120;
//         nav.style.transform = down ? "translateY(-100%)" : "translateY(0)";
//         last = cur;
//         ticking = false;
//       });
//       ticking = true;
//     }
//   }
//   window.addEventListener("scroll", onScroll, { passive: true });
// })();

/* Live Now + Upcoming countdown (guarded for pages without it) */
(function liveAndUpcoming() {
  const liveNowCard = $("#liveNow");
  const upCard = $("#upCard");
  if (!liveNowCard && !upCard) return;

  // Live Now
  if (liveNowCard) {
    const liveNowBadge = $("#liveNowBadge");
    const liveNowName = $("#liveNowName");
    const liveNowWhen = $("#liveNowWhen");
    const LIVE_NOW = null; // set to object to enable live

    if (LIVE_NOW) {
      liveNowCard.dataset.status = "live";
      if (liveNowBadge) liveNowBadge.textContent = "Live";
      if (liveNowName) liveNowName.textContent = LIVE_NOW.name || "Live Session";
      if (liveNowWhen) liveNowWhen.textContent = "Streaming now";
    } else {
      liveNowCard.dataset.status = "offline";
      if (liveNowBadge) liveNowBadge.textContent = "Live";
      if (liveNowName) liveNowName.textContent = "No live events now";
      if (liveNowWhen) liveNowWhen.textContent = "—";
    }
  }

  // Upcoming countdown
  if (upCard) {
    const upBadge = $("#upBadge");
    const upName = $("#upName");
    const upWhen = $("#upWhen");
    const upCountdown = $("#upCountdown");

    const now = new Date();
    const target = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 2,
      16,
      0,
      0
    );

    if (upBadge) upBadge.textContent = "Upcoming";
    if (upName) upName.textContent = "GFX Workshop";
    if (upWhen) upWhen.textContent = "In 2 days • 4:00 PM";
    upCard.dataset.status = "upcoming";

    function fmt(n) {
      return String(n).padStart(2, "0");
    }
    function tick() {
      const diff = target - new Date();
      if (diff <= 0) {
        upCard.dataset.status = "live";
        if (upBadge) upBadge.textContent = "Live";
        if (upWhen) upWhen.textContent = "Happening now";
        if (upCountdown) upCountdown.textContent = "00:00:00";
        return;
      }
      const s = Math.floor(diff / 1000);
      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      if (upCountdown) {
        upCountdown.textContent =
          (d > 0 ? d + "d " : "") + `${fmt(h)}:${fmt(m)}:${fmt(sec)}`;
      }
      requestAnimationFrame(tick);
    }
    tick();
  }
})();

/* Bottom color switcher */
(function colorSwitcher() {
  const switcher = $("#switcher");
  const themeBtn = $("#switchTheme");
  if (!switcher || !themeBtn) return;

  function toggleTheme() {
    const root = document.documentElement;
    const cur = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", cur);
    localStorage.setItem("theme", cur);
  }

  themeBtn.addEventListener("click", toggleTheme);

  switcher.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-preset]");
    if (!btn) return;
    const preset = btn.getAttribute("data-preset");
    applyAccent(preset);
    localStorage.setItem("accentPreset", preset);
  });

  if (!localStorage.getItem("theme")) {
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)")
      .matches;
    document.documentElement.setAttribute(
      "data-theme",
      prefersLight ? "light" : "dark"
    );
  }
})();

/* FAQ toggles: robust and card-wide click */
(function fixFaqToggle() {
  const activate = () => {
    const items = Array.from(document.querySelectorAll("#faqs .faq-item"));
    if (!items.length) return;

    items.forEach((it) => {
      const btn = it.querySelector(".faq-q");
      if (btn && !btn.hasAttribute("type")) btn.setAttribute("type", "button");

      const toggle = () => {
        const open = it.classList.toggle("open");
        if (btn) btn.setAttribute("aria-expanded", String(open));
      };

      btn && btn.addEventListener("click", toggle);

      // Also allow clicking the card except inside the answer content
      it.addEventListener("click", (e) => {
        if (e.target.closest(".faq-a")) return;
        if (e.target.closest("a, button:not(.faq-q)")) return;
        if (!e.target.closest(".faq-q")) toggle();
      });
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", activate);
  } else {
    activate();
  }
})();

function applyAccent(preset) {
  const root = document.documentElement;
  const PALETTES = {
    ocean: ["78, 141, 255", "255, 101, 132", "90, 255, 180"],
    violet: ["168, 85, 247", "99, 102, 241", "244, 114, 182"],
    sunset: ["251, 146, 60", "239, 68, 68", "250, 204, 21"],
    emerald: ["16, 185, 129", "59, 130, 246", "34, 197, 94"],
    amber: ["245, 158, 11", "99, 102, 241", "244, 63, 94"],
  };
  const p = PALETTES[preset] || PALETTES.ocean;
  root.style.setProperty("--accent-2", p[0]);
  root.style.setProperty("--accent", p[1]);
  root.style.setProperty("--accent-3", p[2]);
}

/* Active Nav Highlighting */
(function highlightActiveNav() {
  const menuLinks = document.querySelectorAll('.menu a');
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  
  menuLinks.forEach(link => {
    const href = link.getAttribute('href');
    const pageName = href.split('/').pop().split('#')[0];
    const currentPageName = currentPage.split('/').pop();
    
    if (pageName === currentPageName || (currentPageName === '' && pageName === 'index.html')) {
      link.classList.add('active');
    }
  });
})();

/* Netlify Forms Handler */
async function handleContactSubmit(event) {
  event.preventDefault();
  const form = event.target;
  
  try {
    const response = await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(new FormData(form)).toString()
    });
    
    if (response.ok) {
      form.reset();
      window.history.back();
    } else {
      alert("Error submitting form. Please try again.");
    }
  } catch (error) {
    console.error("Form submission error:", error);
    alert("Error submitting form. Please try again.");
  }
}

async function handleNewsletterSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const button = form.querySelector('.newsletter-btn');
  
  try {
    const response = await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(new FormData(form)).toString()
    });
    
    if (response.ok) {
      // Replace button with success message
      const successMessage = document.createElement('div');
      successMessage.className = 'newsletter-success';
      successMessage.textContent = '✓ Subscribed';
      button.replaceWith(successMessage);
      
      // Reset form
      form.reset();
    } else {
      alert("Error subscribing. Please try again.");
    }
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    alert("Error subscribing. Please try again.");
  }
}   
/* Fast logo preloader with progress */
(function fastLogoPreloader() {
  const loader = document.getElementById("loader");
  const fill = document.getElementById("loaderFill");
  const pctEl = document.getElementById("loaderPct");
  if (!loader || !fill || !pctEl) return;

  document.documentElement.classList.add("is-loading");

  const set = (p) => {
    const val = Math.max(0, Math.min(100, Math.round(p)));
    fill.style.width = val + "%";
    pctEl.textContent = val + "%";
  };

  // Track <img> elements (background images aren't included, but we finish fast on DOM ready)
  const imgs = Array.from(document.images || []);
  const total = Math.max(1, imgs.length);
  let loaded = 0;

  const bump = () => {
    loaded += 1;
    // Cap at 90% until we decide to finish, keeps a sense of motion
    const progress = Math.min(90, (loaded / total) * 90);
    set(progress);
  };

  imgs.forEach((img) => {
    if (img.complete) return bump();
    img.addEventListener("load", bump, { once: true });
    img.addEventListener("error", bump, { once: true });
  });

  // Finish quickly when DOM is ready (fast)
  const minShow = 150; // lower = faster; try 0–150ms
  const start = performance.now();

  const finish = () => {
    set(100);
    loader.classList.add("hide");
    document.documentElement.classList.remove("is-loading");
    setTimeout(() => loader.remove(), 220); // match CSS fade duration
  };

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      const elapsed = performance.now() - start;
      const delay = Math.max(0, minShow - elapsed);
      setTimeout(finish, delay);
    },
    { once: true }
  );

  // Safety cap if DOMContentLoaded is delayed unusually
  setTimeout(finish, 3000);
})();

//nav

  document.addEventListener("DOMContentLoaded", () => {
    const menuToggle = document.querySelector(".menu-toggle");
    const mobileMenu = document.getElementById("mobileMenu");
    const menuClose = document.getElementById("menuClose");

    // Show mobile menu
    menuToggle.addEventListener("click", () => {
      mobileMenu.classList.add("show");
      document.body.style.overflow = "hidden";
    });

    // Hide mobile menu
    menuClose.addEventListener("click", () => {
      mobileMenu.classList.remove("show");
      document.body.style.overflow = "";
    });

    // Optional: close if clicked outside
    document.addEventListener("click", (event) => {
      if (
        !mobileMenu.contains(event.target) &&
        !menuToggle.contains(event.target)
      ) {
        mobileMenu.classList.remove("show");
        document.body.style.overflow = ""
      }
    });
  });

// gallery show more btn
// Show More / Show Less functionality
document.addEventListener('DOMContentLoaded', () => {
  const showMoreBtn = document.getElementById('showMoreBtn');
  const galleryGrid = document.querySelector('.gallery-grid');
  
  showMoreBtn.addEventListener('click', (e) => {
    e.preventDefault();
    galleryGrid.classList.toggle('show-all');
    
    if (galleryGrid.classList.contains('show-all')) {
      showMoreBtn.innerHTML = 'View Less <span class="shine"></span>';
    } else {
      showMoreBtn.innerHTML = 'View More <span class="shine"></span>';
    }
  });
});

