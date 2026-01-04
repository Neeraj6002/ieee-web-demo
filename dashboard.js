// ============================================
// OPTIMIZED FIREBASE INTEGRATION
// Consolidated and performance-optimized code
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
// FIREBASE INITIALIZATION (Singleton)
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

console.log('✅ Firebase initialized');

// ============================================
// SHARED UTILITIES
// ============================================
const Utils = {
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  truncate(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength 
      ? this.escapeHtml(text.substring(0, maxLength)) + '...'
      : this.escapeHtml(text);
  },

  createPlaceholder(text = 'Event Image', bgColor = '%23334155', textColor = '%2394a3b8') {
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='${bgColor}'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='system-ui' font-size='18' fill='${textColor}'%3E${text}%3C/text%3E%3C/svg%3E`;
  },

  errorPlaceholder: null, // Will be set below

  initTilts(container) {
    if (typeof window.initTilts === 'function') {
      window.initTilts(container);
    }
  },

  initRevealAnimations(container) {
    const revealEls = container.querySelectorAll('[data-reveal], .tile');
    if (typeof IntersectionObserver === 'undefined') return;
    
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.2 });
    
    revealEls.forEach((el) => io.observe(el));
  },

  renderEmptyState(container, icon, message) {
    if (!container) return;
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">${icon}</div>
        <p>${message}</p>
      </div>
    `;
  },

  renderErrorState(container, message) {
    if (!container) return;
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ef4444;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
        <p>${message}</p>
      </div>
    `;
  }
};

Utils.errorPlaceholder = Utils.createPlaceholder('Image Error', '%23dc2626', '%23fff');

// ============================================
// SOCIETY CONFIGURATIONS (Shared)
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

      console.log('✅ Loaded Quick Links');
    } catch (error) {
      console.error('Error loading quick links:', error);
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
      const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      this.renderIndex(events);
      console.log(`✅ Loaded ${events.length} events for index`);
    } catch (error) {
      console.error('Error loading events:', error);
      Utils.renderErrorState(document.getElementById('eventTrack'), 'Failed to load events. Please refresh the page.');
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
      console.error('Error loading featured events:', error);
      Utils.renderErrorState(document.getElementById('eventTrack'), 'Failed to load featured events. Please try again later.');
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
      console.error('Error loading past events:', error);
      Utils.renderErrorState(document.getElementById('pastEventsGrid'), 'Failed to load past events. Please try again later.');
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
      Utils.renderEmptyState(track, '📋', 'No featured events yet. Check back soon!');
      return;
    }

    track.innerHTML = events.map(event => this.createEventCard(event, true)).join('');
    Utils.initTilts(track);
  },

  renderPast(events) {
    const grid = document.getElementById('pastEventsGrid');
    if (!grid) return;

    if (events.length === 0) {
      Utils.renderEmptyState(grid, '📋', 'No past events yet. Check back soon!');
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

    const firstClone = Array.from(cards).map(card => card.cloneNode(true));
    const lastClone = Array.from(cards).map(card => card.cloneNode(true));
    
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
      console.error('Error loading gallery:', error);
      const grid = document.getElementById(isFullGallery ? 'galleryGrid' : 'galleryGrid');
      Utils.renderErrorState(grid, 'Failed to load gallery. Please refresh the page.');
    }
  },

  render(items, isFullGallery = false) {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;

    if (items.length === 0) {
      Utils.renderEmptyState(grid, '🖼️', 'No gallery images yet. Check back soon!');
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
    "CS ExeCom": "cs-execom"
  },

async loadForIndex() {
    try {
      const q = query(
        collection(db, 'events'),
        orderBy('createdAt', 'desc'),
        limit(12)
      );
      
      const snapshot = await getDocs(q);
      // Ensure newest events are first by checking timestamp
      const events = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          // Handle Firestore Timestamp objects
          const timeA = a.createdAt?.seconds || a.createdAt || 0;
          const timeB = b.createdAt?.seconds || b.createdAt || 0;
          return timeB - timeA; // Descending order (newest first)
        });

      this.renderIndex(events);
      console.log(`✅ Loaded ${events.length} events for index (newest first)`);
    } catch (error) {
      console.error('Error loading events:', error);
      Utils.renderErrorState(document.getElementById('eventTrack'), 'Failed to load events. Please refresh the page.');
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
      console.error('❌ Error loading ExeCom data:', error);
    }
  },

  renderGrid(members, containerId) {
    const grid = document.getElementById(containerId);
    if (!grid) return;

    if (members.length === 0) {
      Utils.renderEmptyState(grid, '👥', 'No team members yet. Check back soon!');
      return;
    }

    grid.innerHTML = members.map(member => this.createMemberCard(member)).join('');
  },

  renderSection(sectionName, members) {
    const sectionId = this.SECTION_MAPPINGS[sectionName];
    if (!sectionId) {
      console.warn(`⚠️ No mapping found for section: ${sectionName}`);
      return;
    }

    const section = document.getElementById(sectionId);
    if (!section) {
      console.warn(`⚠️ Section not found: ${sectionId}`);
      return;
    }

    const teamContainer = section.querySelector('.team[data-reveal]');
    if (!teamContainer) {
      console.warn(`⚠️ Team container not found in section: ${sectionId}`);
      return;
    }

    teamContainer.innerHTML = members.map(member => this.createMemberCard(member)).join('');
    console.log(`✅ Rendered ${members.length} members in ${sectionName}`);
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
// PAGE INITIALIZERS
// ============================================
const PageInit = {
  /* async index() {
    console.log('🚀 Loading Index Page...');
    await Promise.all([
      QuickLinks.load(),
      Events.loadForIndex(),
      Gallery.load(false),
      ExeCom.loadExecom()
    ]);
    console.log('✅ Index page loaded');
  }, */

  async events() {
    console.log('🚀 Loading Events Page...');
    await Promise.all([
      QuickLinks.load(),
      Events.loadFeatured(),
      Events.loadPast()
    ]);
    console.log('✅ Events page loaded');
  },

  async execom() {
    console.log('🚀 Loading ExeCom Page...');
    await ExeCom.loadFull();
    console.log('✅ ExeCom page loaded');
  },

  async gallery() {
    console.log('🚀 Loading Gallery Page...');
    await Gallery.load(true);
    
    // Setup filter clicks
    document.querySelectorAll('.chips .chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        const filter = chip.dataset.filter;
        if (filter) Gallery.filter(filter);
      });
    });

    // Optional: Auto-refresh every 5 minutes
    setInterval(() => {
      console.log('🔄 Refreshing gallery...');
      Gallery.load(true);
    }, 5 * 60 * 1000);

    console.log('✅ Gallery page loaded');
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
  } else {
    PageInit.index();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', detectAndInit);
} else {
  detectAndInit();
}

//...........
async function loadExecom() {
  try {
    // Load only Core Committee members for homepage
    const q = query(
      collection(db, 'execom-sections'),
      where('sectionName', '==', 'Core Committee'),
      limit(6)
    );
    
    const snapshot = await getDocs(q);
    const members = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // If no Core Committee members, load any 6 members
    if (members.length === 0) {
      const allMembersQuery = query(
        collection(db, 'execom-sections'),
        limit(6)
      );
      const allSnapshot = await getDocs(allMembersQuery);
      const allMembers = allSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      renderExecom(allMembers);
    } else {
      renderExecom(members);
    }

    console.log(`✅ Loaded ${members.length} ExeCom members`);
  } catch (error) {
    console.error('Error loading ExeCom:', error);
    renderExecomError();
  }
}

function renderExecom(members) {
  const grid = document.getElementById('teamGrid');
  if (!grid) return;

  if (members.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">👥</div>
        <p>No team members yet. Check back soon!</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = members.map(member => `
    <div class="card member tilt">
      <div class="avatar" style="--img: url('${member.imageUrl || 'https://via.placeholder.com/150'}')"></div>
      <div>
        <h4>${escapeHtml(member.name)}</h4>
        <div class="role">${escapeHtml(member.position)}</div>
      </div>
      <div class="shine"></div>
    </div>
  `).join('');
}

function renderExecomError() {
  const grid = document.getElementById('teamGrid');
  if (!grid) return;
  
  grid.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ef4444;">
      <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
      <p>Failed to load team members. Please refresh the page.</p>
    </div>
  `;
}
