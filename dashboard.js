// ============================================
// OPTIMIZED FIREBASE INTEGRATION v2.1
// Consolidated, performance-optimized code
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  orderBy,
  limit,
  doc,
  getDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ============================================
// FIREBASE INITIALIZATION
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyBDTXfo3tp-go9Ik5P0pMPl4wQWC-ZPtqo",
  authDomain: "ieee-sb-mcet-35fd1.firebaseapp.com",
  projectId: "ieee-sb-mcet-35fd1",
  storageBucket: "ieee-sb-mcet-35fd1.firebasestorage.app",
  messagingSenderId: "293340494704",
  appId: "1:293340494704:web:8898a2fa50be3130792db5",
  measurementId: "G-FJKGYYHNC7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('✅ Firebase initialized successfully');

// ============================================
// UTILITY FUNCTIONS
// ============================================
const Utils = {
  // Sanitize text to prevent XSS
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // Truncate long text with ellipsis
  truncate(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength 
      ? this.escapeHtml(text.substring(0, maxLength)) + '...'
      : this.escapeHtml(text);
  },

  // Generate SVG placeholder for missing images
  createPlaceholder(text = 'Event Image', bgColor = '%23334155', textColor = '%2394a3b8') {
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='${bgColor}'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='system-ui' font-size='18' fill='${textColor}'%3E${text}%3C/text%3E%3C/svg%3E`;
  },

  // Error placeholder
  get errorPlaceholder() {
    return this.createPlaceholder('Image Error', '%23dc2626', '%23fff');
  },

  // Initialize tilt effects if available
  initTilts(container) {
    if (typeof window.initTilts === 'function') {
      window.initTilts(container);
    }
  },

  // Initialize reveal animations on scroll
  initRevealAnimations(container) {
    const revealEls = container.querySelectorAll('[data-reveal], .tile');
    if (typeof IntersectionObserver === 'undefined') return;
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    
    revealEls.forEach((el) => observer.observe(el));
  },

  // Render empty state UI
  renderEmptyState(container, icon, message) {
    if (!container) return;
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #64748b;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">${icon}</div>
        <p style="font-size: 1.1rem;">${message}</p>
      </div>
    `;
  },

  // Render error state UI
  renderErrorState(container, message) {
    if (!container) return;
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #ef4444;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
        <p style="font-size: 1.1rem;">${message}</p>
      </div>
    `;
  },

  // Render loading state UI
  renderLoadingState(container, message = 'Loading...') {
    if (!container) return;
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #64748b;">
        <div style="font-size: 2rem; margin-bottom: 1rem;">⏳</div>
        <p style="font-size: 1.1rem;">${message}</p>
      </div>
    `;
  }
};

// ============================================
// SOCIETY COLOR CONFIGURATIONS
// ============================================
const SOCIETIES = {
  'CS': { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.2)', label: 'CS' },
  'PES': { color: '#10b981', bg: 'rgba(16, 185, 129, 0.2)', label: 'PES' },
  'WIE': { color: '#ec4899', bg: 'rgba(236, 72, 153, 0.2)', label: 'WIE'},
  'EMBS': { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)', label: 'EMBS' },
  'Event': { color: '#94a3b8', bg: 'rgba(100, 116, 139, 0.2)', label: 'General' }
};

// ============================================
// QUICK LINKS MODULE
// ============================================
const QuickLinks = {
  async load() {
    try {
      const [comingSoonDoc, liveNowDoc] = await Promise.all([
        getDoc(doc(db, 'quick-links', 'coming-soon')),
        getDoc(doc(db, 'quick-links', 'live-now'))
      ]);

      if (comingSoonDoc.exists()) {
        this.updateCard('upcoming', comingSoonDoc.data());
      }

      if (liveNowDoc.exists()) {
        this.updateCard('live', liveNowDoc.data());
      }

      console.log('✅ Quick Links loaded successfully');
    } catch (error) {
      console.error('❌ Error loading quick links:', error);
    }
  },

  updateCard(type, data) {
    const config = type === 'upcoming' 
      ? { card: 'upCard', badge: 'upBadge', name: 'upName', when: 'upWhen', status: 'upcoming' }
      : { card: 'liveNow', badge: 'liveNowBadge', name: 'liveNowName', when: 'liveNowWhen', status: 'live' };

    const card = document.getElementById(config.card);
    if (!card) return;

    const shouldShow = (type === 'upcoming' && data.status === 'active') || 
                       (type === 'live' && data.status === 'live');

    if (shouldShow) {
      card.style.display = 'flex';
      card.dataset.status = config.status;
      
      const badge = document.getElementById(config.badge);
      const name = document.getElementById(config.name);
      const when = document.getElementById(config.when);
      
      if (badge) badge.textContent = data.badge || (type === 'live' ? 'Live' : 'Upcoming');
      if (name) name.textContent = data.title || (type === 'live' ? 'Live Event' : 'Event');
      if (when) when.textContent = data.subtitle || '';

      if (data.imageUrl) {
        const thumb = card.querySelector('.thumb');
        if (thumb) thumb.style.setProperty('--img', `url('${data.imageUrl}')`);
      }

      if (data.ctaUrl) {
        card.style.cursor = 'pointer';
        card.onclick = () => window.open(data.ctaUrl, '_blank');
      }
    } else {
      card.style.display = 'none';
    }
  }
};

// ============================================
// EVENTS MODULE
// ============================================
const Events = {
  async loadForIndex() {
    try {
      const q = query(
        collection(db, 'events'),
        orderBy('createdAt', 'desc'),
        limit(12)
      );
      
      const snapshot = await getDocs(q);
      const events = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const timeA = a.createdAt?.seconds || a.createdAt || 0;
          const timeB = b.createdAt?.seconds || b.createdAt || 0;
          return timeB - timeA;
        });

      this.renderIndex(events);
      console.log(`✅ Loaded ${events.length} events (newest first)`);
    } catch (error) {
      console.error('❌ Error loading events:', error);
      Utils.renderErrorState(document.getElementById('eventTrack'), 'Failed to load events. Please refresh.');
    }
  },

  async loadFeatured() {
    try {
      const q = query(
        collection(db, 'events'), 
        where('featured', '==', true), 
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      
      const snapshot = await getDocs(q);
      const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      this.renderFeatured(events);
      console.log(`✅ Loaded ${events.length} featured events`);
    } catch (error) {
      console.error('❌ Error loading featured events:', error);
      Utils.renderErrorState(document.getElementById('eventTrack'), 'Failed to load featured events.');
    }
  },

  async loadPast() {
    try {
      const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      this.renderPast(events);
      console.log(`✅ Loaded ${events.length} past events`);
    } catch (error) {
      console.error('❌ Error loading past events:', error);
      Utils.renderErrorState(document.getElementById('pastEventsGrid'), 'Failed to load past events.');
    }
  },

  renderIndex(events) {
    const track = document.getElementById('eventTrack');
    if (!track) return;

    if (events.length === 0) {
      Utils.renderEmptyState(track, '📋', 'No events yet. Check back soon!');
      return;
    }

    track.innerHTML = events.map(event => this.createEventCard(event, false)).join('');
    this.initializeCarousel();
  },

  renderFeatured(events) {
    const track = document.getElementById('eventTrack');
    if (!track) return;

    if (events.length === 0) {
      Utils.renderEmptyState(track, '📋', 'No featured events yet.');
      return;
    }

    track.innerHTML = events.map(event => this.createEventCard(event, true)).join('');
    Utils.initTilts(track);
  },

  renderPast(events) {
    const grid = document.getElementById('pastEventsGrid');
    if (!grid) return;

    if (events.length === 0) {
      Utils.renderEmptyState(grid, '📋', 'No past events yet.');
      return;
    }

    grid.innerHTML = events.map(event => this.createEventCard(event, false, true)).join('');
    Utils.initTilts(grid);
    Utils.initRevealAnimations(grid);
  },

  createEventCard(event, isFeatured = false, showSociety = false) {
    const society = SOCIETIES[event.society] || SOCIETIES['Event'];
    const tag = isFeatured ? '⭐ Featured' : (showSociety ? society.label : 'Event');
    const tagStyle = showSociety ? `style="background: ${society.bg}; color: ${society.color};"` : '';
    const dataAttr = showSociety ? 'data-reveal' : '';

    return `
      <article class="card event tilt evt" ${dataAttr}>
        <div class="shine"></div>
        <div class="media">
          <img src="${event.imageUrl || Utils.createPlaceholder()}" 
               alt="${Utils.escapeHtml(event.title)}" 
               onerror="this.src='${Utils.errorPlaceholder}'" 
               loading="lazy">
          <div class="overlay"></div>
        </div>
        <div class="meta">
          <span class="tag" ${tagStyle}>${tag}</span>
          <h4 class="card-title-sm">${Utils.escapeHtml(event.title)}</h4>
          <p class="section-sub">${Utils.truncate(event.summary, showSociety ? 100 : 60)}</p>
        </div>
      </article>
    `;
  },

  initializeCarousel() {
    const track = document.getElementById('eventTrack');
    const prevBtn = document.getElementById('prevEvt');
    const nextBtn = document.getElementById('nextEvt');
    
    if (!track || !prevBtn || !nextBtn) return;

    const cards = track.querySelectorAll('.evt');
    if (cards.length === 0) return;

    const cardArray = Array.from(cards);
    const firstClone = cardArray.map(card => card.cloneNode(true));
    const lastClone = cardArray.map(card => card.cloneNode(true));
    
    firstClone.forEach(clone => track.appendChild(clone));
    lastClone.reverse().forEach(clone => track.insertBefore(clone, track.firstChild));

    let currentIndex = cards.length;
    const cardWidth = 320;
    
    const updateCarousel = (smooth = true) => {
      const offset = -currentIndex * cardWidth;
      track.style.transition = smooth ? 'transform 0.5s ease' : 'none';
      track.style.transform = `translateX(${offset}px)`;
    };

    prevBtn.onclick = () => {
      currentIndex--;
      updateCarousel();
      if (currentIndex < 0) {
        setTimeout(() => {
          currentIndex = cards.length - 1;
          updateCarousel(false);
        }, 500);
      }
    };

    nextBtn.onclick = () => {
      currentIndex++;
      updateCarousel();
      if (currentIndex >= cards.length * 2) {
        setTimeout(() => {
          currentIndex = cards.length;
          updateCarousel(false);
        }, 500);
      }
    };

    updateCarousel(false);
  }
};

// ============================================
// GALLERY MODULE
// ============================================
const Gallery = {
  allItems: [],
  currentFilter: 'all',

  async load(isFullGallery = false) {
    try {
      const q = isFullGallery 
        ? query(collection(db, 'gallery'), orderBy('createdAt', 'desc'))
        : query(collection(db, 'gallery'), orderBy('order', 'asc'), limit(6));
      
      const snapshot = await getDocs(q);
      this.allItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      this.render(this.allItems, isFullGallery);
      console.log(`✅ Loaded ${this.allItems.length} gallery images`);
    } catch (error) {
      console.error('❌ Error loading gallery:', error);
      const grid = document.getElementById('galleryGrid');
      Utils.renderErrorState(grid, 'Failed to load gallery.');
    }
  },

  render(items, isFullGallery = false) {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;

    if (items.length === 0) {
      Utils.renderEmptyState(grid, '🖼️', 'No gallery images yet.');
      return;
    }

    grid.innerHTML = items.map(item => `
      <a class="tile tilt" ${isFullGallery ? '' : `onclick="openLightbox('${item.imageUrl}')"`}>
        <div class="shine"></div>
        <img 
          src="${item.imageUrl || Utils.createPlaceholder('Gallery Image')}" 
          alt="${Utils.escapeHtml(item.title || 'Gallery image')}"
          onerror="if(!this.dataset.errored){this.dataset.errored='1';this.src='${Utils.errorPlaceholder}';}"
          loading="lazy" />
      </a>
    `).join('');

    Utils.initTilts(grid);
    if (isFullGallery) {
      Utils.initRevealAnimations(grid);
    }
  },

  filter(category) {
    this.currentFilter = category;
    
    document.querySelectorAll('.chips .chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.filter === category);
    });
    
    const filtered = category === 'all' 
      ? this.allItems 
      : this.allItems.filter(item => item.category === category);
    
    this.render(filtered, true);
  }
};

// Lightbox functionality
window.openLightbox = function(imageUrl) {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  
  if (lightbox && lightboxImg) {
    lightboxImg.src = imageUrl;
    lightbox.style.display = 'flex';
    lightbox.onclick = () => lightbox.style.display = 'none';
  }
};

// ============================================
// EXECOM MODULE
// ============================================
const ExeCom = {
  SECTION_MAPPINGS: {
    "Advisory & Faculty": "advisors",
    "Core Committee": "core-2025",
    "Team Leads": "leads",
    "Team Coordinators": "coordinators",
    "WIE-AG ExeCom": "wie-execom",
    "PES ExeCom": "pes-execom",
    "CS ExeCom": "cs-execom",
    "Mentor": "Mentor"
  },

  async loadForIndex() {
    try {
      const q = query(
        collection(db, 'execom-sections'),
        where('sectionName', '==', 'Core Committee'),
        limit(6)
      );
      
      const snapshot = await getDocs(q);
      let members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fallback: load any 6 members if no Core Committee found
      if (members.length === 0) {
        const allQ = query(collection(db, 'execom-sections'), limit(6));
        const allSnapshot = await getDocs(allQ);
        members = allSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      this.renderGrid(members, 'teamGrid');
      console.log(`✅ Loaded ${members.length} ExeCom members`);
    } catch (error) {
      console.error('❌ Error loading ExeCom:', error);
      this.renderError('teamGrid');
    }
  },

  async loadFull() {
    try {
      const q = query(collection(db, 'execom-sections'), orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('⚠️ No ExeCom data found');
        return;
      }

      const sections = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const sectionName = data.sectionName;
        
        if (!sections[sectionName]) sections[sectionName] = [];
        sections[sectionName].push({ id: doc.id, ...data });
      });

      console.log('✅ Loaded sections:', Object.keys(sections));

      Object.entries(sections).forEach(([sectionName, members]) => {
        this.renderSection(sectionName, members);
      });
    } catch (error) {
      console.error('❌ Error loading full ExeCom:', error);
    }
  },

  renderGrid(members, containerId) {
    const grid = document.getElementById(containerId);
    if (!grid) return;

    if (members.length === 0) {
      Utils.renderEmptyState(grid, '👥', 'No team members yet.');
      return;
    }

    grid.innerHTML = members.map(member => this.createMemberCard(member)).join('');
  },

  renderSection(sectionName, members) {
    const sectionId = this.SECTION_MAPPINGS[sectionName];
    if (!sectionId) {
      console.warn(`⚠️ No mapping for section: ${sectionName}`);
      return;
    }

    const section = document.getElementById(sectionId);
    if (!section) {
      console.warn(`⚠️ Section not found: ${sectionId}`);
      return;
    }

    const teamContainer = section.querySelector('.team[data-reveal]');
    if (!teamContainer) {
      console.warn(`⚠️ Team container not found: ${sectionId}`);
      return;
    }

    teamContainer.innerHTML = members.map(member => this.createMemberCard(member)).join('');
    console.log(`✅ Rendered ${members.length} members in ${sectionName}`);
  },

  renderError(containerId) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    Utils.renderErrorState(grid, 'Failed to load team members.');
  },

  createMemberCard(member) {
    const avatarStyle = member.imageUrl ? `style="--img: url('${member.imageUrl}')"` : '';
    
    return `
      <div class="card member tilt">
        <div class="avatar" ${avatarStyle}></div>
        <div>
          <h4>${Utils.escapeHtml(member.name)}</h4>
          <div class="role">${Utils.escapeHtml(member.position)}</div>
        </div>
        <div class="shine"></div>
      </div>
    `;
  }
};

// ============================================
// MCET UPDATES MODULE
// ============================================
const McetUpdates = {
  async load() {
    const grid = document.querySelector('.gallery-grid');
    if (!grid) return;

    try {
      Utils.renderLoadingState(grid, 'Loading MCET Updates...');

      // Sort by createdAt in DESCENDING order (newest first)
      const q = query(collection(db, 'mcetupdates'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        Utils.renderEmptyState(grid, '📰', 'No updates yet. Check back soon!');
        return;
      }

      const updates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      this.render(updates, grid);
      
      console.log(`✅ Loaded ${updates.length} MCET Updates (newest first)`);
    } catch (error) {
      console.error('❌ Error loading MCET updates:', error);
      Utils.renderErrorState(grid, 'Failed to load updates. Please try again.');
    }
  },

  render(updates, grid) {
    grid.innerHTML = updates.map((update, index) => {
      const title = update.title || `MCET Update Vol ${updates.length - index}`;
      
      return `
        <a href="${update.imageUrl}" class="tile tilt m-update" data-lightbox="mcet">
          <div class="shine"></div>
          <img 
            src="${update.imageUrl}" 
            alt="${Utils.escapeHtml(title)}" 
            onerror="this.src='${Utils.errorPlaceholder}'"
            loading="lazy" />
          <div class="tile-overlay">
            <p class="tile-title">${Utils.escapeHtml(title)}</p>
          </div>
        </a>
      `;
    }).join('');

    Utils.initTilts(grid);
    Utils.initRevealAnimations(grid);

    // Re-initialize lightbox if available
    if (window.initLightbox) window.initLightbox();
  }
};

// Expose for debugging
window.loadMcetUpdates = () => McetUpdates.load();

// ============================================
// PAGE INITIALIZERS
// ============================================
const PageInit = {
  async index() {
    console.log('🚀 Initializing Index Page...');
    await Promise.all([
      QuickLinks.load(),
      Events.loadForIndex(),
      Gallery.load(false),
      ExeCom.loadForIndex()
    ]);
    console.log('✅ Index page loaded successfully');
  },

  async events() {
    console.log('🚀 Initializing Events Page...');
    await Promise.all([
      QuickLinks.load(),
      Events.loadFeatured(),
      Events.loadPast()
    ]);
    console.log('✅ Events page loaded successfully');
  },

  async execom() {
    console.log('🚀 Initializing ExeCom Page...');
    await ExeCom.loadFull();
    console.log('✅ ExeCom page loaded successfully');
  },

  async gallery() {
    console.log('🚀 Initializing Gallery Page...');
    await Gallery.load(true);
    
    // Setup filter clicks
    document.querySelectorAll('.chips .chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        const filter = chip.dataset.filter;
        if (filter) Gallery.filter(filter);
      });
    });

    console.log('✅ Gallery page loaded successfully');
  },

  async mcetUpdates() {
    console.log('🚀 Initializing MCET Updates Page...');
    await McetUpdates.load();
    console.log('✅ MCET Updates page loaded successfully');
  }
};

// ============================================
// AUTO-DETECT PAGE AND INITIALIZE
// ============================================
function detectAndInit() {
  const path = window.location.pathname;
  
  if (path.includes('events.html') || document.getElementById('pastEventsGrid')) {
    PageInit.events();
  } else if (path.includes('execom.html') || document.getElementById('advisors')) {
    PageInit.execom();
  } else if (path.includes('gallery.html') || (document.getElementById('galleryGrid') && document.querySelector('.chips'))) {
    PageInit.gallery();
  } else if (path.includes('mcet') || document.querySelector('.gallery-grid .m-update')) {
    PageInit.mcetUpdates();
  } else {
    PageInit.index();
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', detectAndInit);
} else {
  detectAndInit();
}

// Export modules globally for external access
window.FirebaseModules = {
  QuickLinks,
  Events,
  Gallery,
  ExeCom,
  McetUpdates,
  PageInit
};

console.log('🎉 Firebase Integration v2.1 loaded successfully');