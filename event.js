// ============================================
// FIREBASE CONFIGURATION FOR EVENTS PAGE
// ============================================
// Add this script to your events.html page, before the closing </body> tag

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  orderBy,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ============================================
// INITIALIZE FIREBASE
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyBDTXfo3tp-go9Ik5P0pMPl4wQWC-ZPtqo",
  authDomain: "ieee-sb-mcet-35fd1.firebaseapp.com",
  projectId: "ieee-sb-mcet-35fd1",
  storageBucket: "ieee-sb-mcet-35fd1.firebasestorage.app",
  messagingSenderId: "293340494704",
  appId: "1:293340494704:web:8898a2fa50be3130792db5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('✅ Firebase initialized for events page');

// ============================================
// LOAD AND DISPLAY EVENTS
// ============================================

// Load Featured Events
async function loadFeaturedEvents() {
  try {
    const q = query(
      collection(db, 'events'),
      where('featured', '==', true),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`✅ Loaded ${events.length} featured events`);
    
    // Render featured events in carousel
    renderFeaturedCarousel(events);
  } catch (error) {
    console.error('Error loading featured events:', error);
  }
}

// Load Past Events
async function loadPastEvents() {
  try {
    const q = query(
      collection(db, 'events'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`✅ Loaded ${events.length} past events`);
    
    // Render past events grid
    renderPastEventsGrid(events);
  } catch (error) {
    console.error('Error loading past events:', error);
  }
}

// ============================================
// RENDER FEATURED CAROUSEL
// ============================================
function renderFeaturedCarousel(events) {
  const track = document.getElementById('eventTrack');
  if (!track) return;
  
  if (events.length === 0) {
    track.innerHTML = `
      <div style="padding: 40px; text-align: center; color: #94a3b8;">
        <p>No featured events yet. Add some from the admin panel!</p>
      </div>
    `;
    return;
  }
  
  // Clear existing content (keep only the first set of original cards as fallback)
  track.innerHTML = '';
  
  // Render each featured event
  events.forEach(event => {
    const card = document.createElement('article');
    card.className = 'card event tilt evt';
    card.innerHTML = `
      <div class="shine"></div>
      <div class="media">
        <img src="${event.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image'}" 
             alt="${escapeHtml(event.title)}" 
             onerror="this.src='https://via.placeholder.com/400x300?text=Image+Error'" />
        <div class="overlay"></div>
      </div>
      <div class="meta">
        <span class="tag">${escapeHtml(event.title)}</span>
        <h4 class="card-title-sm">${escapeHtml(event.title)}</h4>
        <p class="section-sub">${escapeHtml(truncate(event.summary, 60))}</p>
      </div>
    `;
    track.appendChild(card);
  });
  
  // Re-initialize tilt effects for new cards
  if (typeof initTilts === 'function') {
    initTilts(track);
  }
  
  // Re-setup carousel if needed
  if (typeof setupCarousel === 'function') {
    setupCarousel();
  }
}

// ============================================
// RENDER PAST EVENTS GRID
// ============================================
function renderPastEventsGrid(events) {
  const grid = document.querySelector('#past .values-grid');
  if (!grid) return;
  
  if (events.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; padding: 40px; text-align: center; color: #94a3b8;">
        <p>No past events yet. Add some from the admin panel!</p>
      </div>
    `;
    return;
  }
  
  // Clear existing content
  grid.innerHTML = '';
  
  // Render each event
  events.forEach(event => {
    const card = document.createElement('article');
    card.className = 'card event tilt';
    card.setAttribute('data-reveal', '');
    card.innerHTML = `
      <div class="shine"></div>
      <div class="media">
        <img src="${event.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image'}" 
             alt="${escapeHtml(event.title)}"
             onerror="this.src='https://via.placeholder.com/400x300?text=Image+Error'" />
        <div class="overlay"></div>
      </div>
      <div class="meta">
        <span class="tag">${escapeHtml(event.title)}</span>
        <h4 class="card-title-sm">${escapeHtml(event.title)}</h4>
        <p class="section-sub">${escapeHtml(truncate(event.summary, 80))}</p>
      </div>
    `;
    grid.appendChild(card);
  });
  
  // Re-initialize reveal animations
  if (typeof IntersectionObserver !== 'undefined') {
    const revealEls = grid.querySelectorAll('[data-reveal]');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    revealEls.forEach((el) => io.observe(el));
  }
  
  // Re-initialize tilt effects
  if (typeof initTilts === 'function') {
    initTilts(grid);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncate(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength 
    ? text.substring(0, maxLength) + '...'
    : text;
}

// ============================================
// INITIALIZE ON PAGE LOAD
// ============================================
window.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Loading events from Firebase...');
  
  // Load featured events for carousel
  loadFeaturedEvents();
  
  // Load all events for past events section
  loadPastEvents();
});

// Optional: Reload events every 5 minutes to keep data fresh
setInterval(() => {
  console.log('🔄 Refreshing events...');
  loadFeaturedEvents();
  loadPastEvents();
}, 5 * 60 * 1000);