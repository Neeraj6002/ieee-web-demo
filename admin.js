// ============================================
// FIREBASE CONFIGURATION - COMPLETE ADMIN PANEL
// Quick Links + Events + Event Highlights + Gallery + ExeCom Management + MCET Updates
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

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
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account'
});



// ============================================
// APPLICATION STATE
// ============================================
const state = {
  currentUser: null,
  editingEventId: null,
  editingGalleryId: null,
  editingSectionId: null,
  events: [],
  eventHighlights: [],
  gallery: [],
  execomSections: [],
  mcetupdates: [],
  quickLinks: {
    comingSoon: null,
    liveNow: null
  }
};

// ============================================
// NOTIFICATION SYSTEM
// ============================================
class NotificationManager {
  static show(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    
    notification.innerHTML = `
      <div class="notification-content" style="display: flex; align-items: center; gap: 0.5rem;">
        <span class="notification-icon">${this.getIcon(type)}</span>
        <span class="notification-message">${message}</span>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }

  static getIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || icons.info;
  }
}

// ============================================
// AUTHENTICATION MANAGER
// ============================================
class AuthManager {
  static async signIn() {
    try {
      const loginBtn = document.getElementById('google-login-btn');
      loginBtn.disabled = true;
      loginBtn.textContent = 'Signing in...';
      
      await signInWithPopup(auth, googleProvider);
      NotificationManager.show('Successfully signed in!', 'success');
    } catch (error) {
      console.error('Login error:', error);
      
      const errorMessages = {
        'auth/popup-closed-by-user': 'Login cancelled. Please try again.',
        'auth/popup-blocked': 'Popup blocked. Please allow popups for this site.',
        'auth/unauthorized-domain': 'Domain not authorized. Check Firebase Console.',
        'auth/network-request-failed': 'Network error. Check your connection.'
      };
      
      const message = errorMessages[error.code] || error.message;
      NotificationManager.show(`Login failed: ${message}`, 'error');
    } finally {
      const loginBtn = document.getElementById('google-login-btn');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign in with Google';
    }
  }

  static async signOut() {
    try {
      await signOut(auth);
      NotificationManager.show('Signed out successfully', 'success');
    } catch (error) {
      console.error('Sign out error:', error);
      NotificationManager.show('Failed to sign out', 'error');
    }
  }

  static initialize() {
    onAuthStateChanged(auth, (user) => {
      state.currentUser = user;
      
      if (user) {
        this.showDashboard(user);
      } else {
        this.showLogin();
      }
    });
  }

  static showDashboard(user) {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('dashboard').style.display = 'flex';
    document.getElementById('user-email').textContent = user.email;
    
    // Load all data
    QuickLinksManager.loadAll();
    EventManager.loadAll();
    EventHighlightsManager.loadAll();
    GalleryManager.loadAll();
    ExecomManager.loadAll();
      McetupdatesManager.loadAll();
  }

  static showLogin() {
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
  }
}

// ============================================
// IMAGE UPLOAD MANAGER
// ============================================
class ImageManager {
  static async upload(file, folder = 'event-images') {
    this.validateFile(file);
    
    try {
      const fileExt = file.name.split('.').pop().toLowerCase();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      NotificationManager.show('Uploading image...', 'info');
      
      const storageRef = ref(storage, filePath);
      
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          uploadedBy: state.currentUser?.email || 'unknown',
          uploadedAt: new Date().toISOString()
        }
      });

      const downloadURL = await getDownloadURL(snapshot.ref);

    
      return downloadURL;
    } catch (error) {
      console.error('Upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  static async delete(imageUrl) {
    if (!imageUrl) return;
    
    try {
      const urlObj = new URL(imageUrl);
      const pathMatch = urlObj.pathname.match(/\/o\/(.+)$/);
      
      if (!pathMatch) {
        console.warn('Invalid Firebase Storage URL format:', imageUrl);
        return;
      }
      
      const encodedPath = pathMatch[1];
      const filePath = decodeURIComponent(encodedPath);
      
      const storageRef = ref(storage, filePath);
      await deleteObject(storageRef);
      
      
    } catch (error) {
      if (error.code === 'storage/object-not-found') {
        console.warn('Image not found in storage:', imageUrl);
        return;
      }
      console.error('Delete error:', error);
    }
  }

  static validateFile(file) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid file type. Use JPG, PNG, or WEBP.');
    }
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 5MB.');
    }
  }
}

// ============================================
// QUICK LINKS MANAGER
// ============================================
class QuickLinksManager {
  static async loadAll() {
    try {
      // Load Coming Soon
      const comingSoonDoc = await getDoc(doc(db, 'quick-links', 'coming-soon'));
      if (comingSoonDoc.exists()) {
        state.quickLinks.comingSoon = comingSoonDoc.data();
        this.populateComingSoonForm(state.quickLinks.comingSoon);
      }

      // Load Live Now
      const liveNowDoc = await getDoc(doc(db, 'quick-links', 'live-now'));
      if (liveNowDoc.exists()) {
        state.quickLinks.liveNow = liveNowDoc.data();
        this.populateLiveNowForm(state.quickLinks.liveNow);
      }

      
    } catch (error) {
      console.error('Load Quick Links error:', error);
      NotificationManager.show('Failed to load quick links', 'error');
    }
  }

  static populateComingSoonForm(data) {
    const form = document.querySelector('#quick-links-section .inner-card:first-of-type');
    if (!form) return;

    form.querySelector('input[type="text"]').value = data.title || '';
    form.querySelector('textarea').value = data.subtitle || '';
    form.querySelectorAll('input[type="text"]')[1].value = data.badge || '';
    form.querySelectorAll('input[type="text"]')[2].value = data.ctaLabel || '';
    form.querySelector('input[type="url"]').value = data.ctaUrl || '';
    form.querySelector('select').value = data.status || 'offline';
  }

  static populateLiveNowForm(data) {
    const form = document.querySelector('#quick-links-section .inner-card:last-of-type');
    if (!form) return;

    form.querySelector('input[type="text"]').value = data.title || '';
    form.querySelector('textarea').value = data.subtitle || '';
    form.querySelectorAll('input[type="text"]')[1].value = data.badge || '';
    form.querySelectorAll('input[type="text"]')[2].value = data.ctaLabel || '';
    form.querySelector('input[type="url"]').value = data.ctaUrl || '';
    form.querySelector('select').value = data.status || 'offline';
  }

  static async saveComingSoon() {
    try {
      const form = document.querySelector('#quick-links-section .inner-card:first-of-type');
      const saveBtn = form.querySelector('.btn-save');
      
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      const imageFile = form.querySelector('input[type="file"]').files[0];
      let imageUrl = state.quickLinks.comingSoon?.imageUrl || null;

      if (imageFile) {
        imageUrl = await ImageManager.upload(imageFile, 'quick-links-images');
        if (state.quickLinks.comingSoon?.imageUrl) {
          await ImageManager.delete(state.quickLinks.comingSoon.imageUrl);
        }
      }

      const data = {
        title: form.querySelector('input[type="text"]').value,
        subtitle: form.querySelector('textarea').value,
        badge: form.querySelectorAll('input[type="text"]')[1].value,
        ctaLabel: form.querySelectorAll('input[type="text"]')[2].value,
        ctaUrl: form.querySelector('input[type="url"]').value,
        status: form.querySelector('select').value,
        imageUrl: imageUrl,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'quick-links', 'coming-soon'), data);
      state.quickLinks.comingSoon = data;
      
      NotificationManager.show('Coming Soon block saved!', 'success');
    } catch (error) {
      console.error('Save Coming Soon error:', error);
      NotificationManager.show(`Failed to save: ${error.message}`, 'error');
    } finally {
      const form = document.querySelector('#quick-links-section .inner-card:first-of-type');
      const saveBtn = form.querySelector('.btn-save');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
    }
  }

  static async saveLiveNow() {
    try {
      const form = document.querySelector('#quick-links-section .inner-card:last-of-type');
      const saveBtn = form.querySelector('.btn-save');
      
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      const imageFile = form.querySelector('input[type="file"]').files[0];
      let imageUrl = state.quickLinks.liveNow?.imageUrl || null;

      if (imageFile) {
        imageUrl = await ImageManager.upload(imageFile, 'quick-links-images');
        if (state.quickLinks.liveNow?.imageUrl) {
          await ImageManager.delete(state.quickLinks.liveNow.imageUrl);
        }
      }

      const data = {
        title: form.querySelector('input[type="text"]').value,
        subtitle: form.querySelector('textarea').value,
        badge: form.querySelectorAll('input[type="text"]')[1].value,
        ctaLabel: form.querySelectorAll('input[type="text"]')[2].value,
        ctaUrl: form.querySelector('input[type="url"]').value,
        status: form.querySelector('select').value,
        imageUrl: imageUrl,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'quick-links', 'live-now'), data);
      state.quickLinks.liveNow = data;
      
      NotificationManager.show('Live Now block saved!', 'success');
    } catch (error) {
      console.error('Save Live Now error:', error);
      NotificationManager.show(`Failed to save: ${error.message}`, 'error');
    } finally {
      const form = document.querySelector('#quick-links-section .inner-card:last-of-type');
      const saveBtn = form.querySelector('.btn-save');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
    }
  }
}

// ============================================
// EVENT MANAGER
// ============================================
class EventManager {
  // Define society configurations
  static societies = {
    'CS': { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.2)', label: 'CS' },
    'PES': { color: '#10b981', bg: 'rgba(16, 185, 129, 0.2)', label: 'PES' },
    'WIE': { color: '#ec4899', bg: 'rgba(236, 72, 153, 0.2)', label: 'WIE' },
    'EMBS': { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)', label: 'EMBS' },
    'Event': { color: '#94a3b8', bg: 'rgba(100, 116, 139, 0.2)', label: 'General' }
  };

  static async loadAll() {
    try {
      const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      state.events = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      this.renderTable();
      
    } catch (error) {
      console.error('Load events error:', error);
      NotificationManager.show('Failed to load events', 'error');
    }
  }

  static renderTable() {
    const tbody = document.getElementById('events-table-body');
    if (!tbody) return;

    if (state.events.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 40px; color: #64748b;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
            <p>No events yet. Create your first event!</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = state.events.map(event => {
      const society = this.societies[event.society] || this.societies['Event'];
      
      return `
        <tr>
          <td>
            ${event.imageUrl ? `
              <img src="${event.imageUrl}" 
                   alt="${event.title}" 
                   style="width: 60px; height: 40px; object-fit: cover; border-radius: 4px; margin-right: 10px; vertical-align: middle;">
            ` : ''}
            <span>${this.escapeHtml(event.title)}</span>
          </td>
          <td>${this.truncate(event.summary, 80)}</td>
          <td>
            <span style="padding: 4px 12px; border-radius: 12px; font-size: 0.8rem; 
                         background: ${society.bg};
                         color: ${society.color};">
              ${society.label}
            </span>
          </td>
          <td style="white-space: nowrap;">
            <button class="btn-edit" onclick="window.editEvent('${event.id}')">Edit</button>
            <button class="btn-delete" onclick="window.deleteEvent('${event.id}', '${event.imageUrl || ''}')">Delete</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  static async save() {
    try {
      const saveBtn = document.getElementById('save-event-btn');
      saveBtn.disabled = true;
      saveBtn.textContent = state.editingEventId ? 'Updating...' : 'Saving...';

      const title = document.getElementById('event-title').value.trim();
      const summary = document.getElementById('event-summary').value.trim();
      const society = document.getElementById('event-society').value.trim();
      const imageFile = document.getElementById('event-image').files[0];

      if (!title || !summary || !society) {
        NotificationManager.show('Please fill in all required fields', 'warning');
        saveBtn.disabled = false;
        saveBtn.textContent = state.editingEventId ? 'Update Event' : 'Save Event';
        return;
      }

      let imageUrl = null;
      
      if (state.editingEventId) {
        // Editing existing event
        const existingEvent = state.events.find(e => e.id === state.editingEventId);
        imageUrl = existingEvent?.imageUrl || null;
        
        if (imageFile) {
          // Delete old image if new one is uploaded
          if (imageUrl) {
            await ImageManager.delete(imageUrl);
          }
          imageUrl = await ImageManager.upload(imageFile, 'event-images');
        }

        const eventData = {
          title,
          summary,
          society,
          imageUrl,
          updatedAt: new Date().toISOString()
        };

        await updateDoc(doc(db, 'events', state.editingEventId), eventData);
        NotificationManager.show('Event updated successfully!', 'success');
      } else {
        // Creating new event
        if (imageFile) {
          imageUrl = await ImageManager.upload(imageFile, 'event-images');
        }

        const eventData = {
          title,
          summary,
          society,
          imageUrl,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await addDoc(collection(db, 'events'), eventData);
        NotificationManager.show('Event saved successfully!', 'success');
      }

      this.clearForm();
      this.loadAll();
    } catch (error) {
      console.error('Save event error:', error);
      NotificationManager.show(`Failed to save: ${error.message}`, 'error');
    } finally {
      const saveBtn = document.getElementById('save-event-btn');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Event';
      state.editingEventId = null;
    }
  }

  static edit(eventId) {
    const event = state.events.find(e => e.id === eventId);
    if (!event) return;

    state.editingEventId = eventId;

    document.getElementById('event-title').value = event.title || '';
    document.getElementById('event-summary').value = event.summary || '';
    document.getElementById('event-society').value = event.society || 'Event';

    const saveBtn = document.getElementById('save-event-btn');
    saveBtn.textContent = 'Update Event';
    saveBtn.style.background = '#f59e0b';

    // Scroll to form
    document.getElementById('events-section').scrollIntoView({ behavior: 'smooth', block: 'start' });

    NotificationManager.show('Editing event. Update fields and click "Update Event"', 'info');
  }

  static async delete(eventId, imageUrl) {
    if (!confirm('Delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      if (imageUrl) {
        await ImageManager.delete(imageUrl);
      }

      await deleteDoc(doc(db, 'events', eventId));

      NotificationManager.show('Event deleted successfully!', 'success');
      this.loadAll();
    } catch (error) {
      console.error('Delete event error:', error);
      NotificationManager.show(`Failed to delete: ${error.message}`, 'error');
    }
  }

  static clearForm() {
    document.getElementById('event-title').value = '';
    document.getElementById('event-summary').value = '';
    document.getElementById('event-society').value = '';
    document.getElementById('event-image').value = '';
  }

  static truncate(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength
      ? this.escapeHtml(text.substring(0, maxLength)) + '...'
      : this.escapeHtml(text);
  }

  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
// ============================================
// EVENT HIGHLIGHTS MANAGER
// ============================================
class EventHighlightsManager {
  static async loadAll() {
    try {
      const q = query(collection(db, 'event-highlights'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      state.eventHighlights = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      this.renderGrid();
      
    } catch (error) {
      console.error('Load event highlights error:', error);
      NotificationManager.show('Failed to load event highlights', 'error');
    }
  }

  static renderGrid() {
    const grid = document.getElementById('highlights-grid');
    if (!grid) return;
    
    if (state.eventHighlights.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">✨</div>
          <p>No event highlights yet. Create your first highlight!</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = state.eventHighlights.map(item => `
      <div class="gallery-card">
        <img src="${item.imageUrl}" alt="${item.title || 'Event highlight'}" />
        <div class="gallery-card-info">
          <div class="gallery-card-title">${this.escapeHtml(item.title || 'Untitled')}</div>
          <small style="color: #64748b; display: block; margin-bottom: 4px;">${this.escapeHtml(item.description || '').substring(0, 60)}${item.description?.length > 60 ? '...' : ''}</small>
          ${item.badge ? `<span style="font-size: 0.7rem; color: #3b82f6; background: rgba(59, 130, 246, 0.1); padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 8px;">${this.escapeHtml(item.badge)}</span>` : ''}
          <button class="btn-delete" onclick="window.deleteHighlight('${item.id}', '${item.imageUrl}')">Delete</button>
        </div>
      </div>
    `).join('');
  }

  static async save() {
    try {
      const saveBtn = document.getElementById('save-highlight-btn');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      const title = document.getElementById('highlight-title').value.trim();
      const description = document.getElementById('highlight-description').value.trim();
      const badge = document.getElementById('highlight-badge').value.trim();
      const imageFile = document.getElementById('highlight-image').files[0];

      if (!title || !description) {
        NotificationManager.show('Please fill in title and description', 'warning');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Highlight';
        return;
      }

      if (!imageFile) {
        NotificationManager.show('Please select an image', 'warning');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Highlight';
        return;
      }

      const imageUrl = await ImageManager.upload(imageFile, 'event-highlights-images');

      const highlightData = {
        title,
        description,
        badge: badge || null,
        imageUrl,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'event-highlights'), highlightData);
      
      NotificationManager.show('Event highlight saved successfully!', 'success');
      this.clearForm();
      this.loadAll();
    } catch (error) {
      console.error('Save event highlight error:', error);
      NotificationManager.show(`Failed to save: ${error.message}`, 'error');
    } finally {
      const saveBtn = document.getElementById('save-highlight-btn');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Highlight';
    }
  }

  static async delete(highlightId, imageUrl) {
    if (!confirm('Delete this highlight? This action cannot be undone.')) {
      return;
    }
    
    try {
      if (imageUrl) {
        await ImageManager.delete(imageUrl);
      }
      
      await deleteDoc(doc(db, 'event-highlights', highlightId));
      
      NotificationManager.show('Highlight deleted successfully!', 'success');
      this.loadAll();
    } catch (error) {
      console.error('Delete highlight error:', error);
      NotificationManager.show(`Failed to delete: ${error.message}`, 'error');
    }
  }

  static clearForm() {
    document.getElementById('highlight-title').value = '';
    document.getElementById('highlight-description').value = '';
    document.getElementById('highlight-badge').value = '';
    document.getElementById('highlight-image').value = '';
  }

  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ============================================
// GALLERY MANAGER
// ============================================
class GalleryManager {
  static async loadAll() {
    try {
      const q = query(collection(db, 'gallery'), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      
      state.gallery = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      this.renderGrid();
    
    } catch (error) {
      console.error('Load gallery error:', error);
      NotificationManager.show('Failed to load gallery', 'error');
    }
  }

static renderGrid() {
    const grid = document.querySelector('#gallery-section .gallery-grid'); 
    if (!grid) {
      console.error('Gallery grid element not found');
      return;
    }
    
  
    
    if (state.gallery.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🖼️</div>
          <p>No gallery images yet. Upload your first image!</p>
        </div>
      `;
      return;
    } 

    grid.innerHTML = state.gallery.map(item => {
      
      
      return `
        <div class="gallery-card">
          <img 
            src="${item.imageUrl}" 
            alt="${this.escapeHtml(item.title || 'Gallery image')}"
            onerror="console.error('Image failed to load:', '${item.imageUrl}'); this.style.display='none'; this.nextElementSibling.style.display='flex';"
            "
          />
          <div style="display: none; align-items: center; justify-content: center; height: 200px; background: #f1f5f9; color: #64748b; font-size: 14px; text-align: center; padding: 20px; flex-direction: column;">
            <div>⚠️ Image failed to load</div>
            <small style="font-size: 11px; word-break: break-all; margin-top: 8px; max-width: 100%;">${item.imageUrl?.substring(0, 80) || 'No URL'}...</small>
          </div>
          <div class="gallery-card-info">
            <div class="gallery-card-title">${this.escapeHtml(item.title || 'Untitled')}</div>
            <small style="color: #64748b; display: block; margin-bottom: 8px;">Category: ${this.escapeHtml(item.category || 'all')}</small>
            <small style="color: #64748b; display: block; margin-bottom: 8px;">Order: ${item.order || 1}</small>
            <button class="btn-delete" onclick="window.deleteGalleryImage('${item.id}', '${item.imageUrl.replace(/'/g, "\\'")}')">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  }

  static async save() {
    try {
      const saveBtn = document.getElementById('gallery-save-btn');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Uploading...';

      const title = document.getElementById('gallery-title').value.trim() || 'Untitled';
      const category = document.getElementById('gallery-category').value.trim() || 'all';
      const order = parseInt(document.getElementById('gallery-order').value) || 1;
      const imageFile = document.getElementById('gallery-image').files[0];

      if (!imageFile) {
        NotificationManager.show('Please select an image', 'warning');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Item';
        return;
      }

      const imageUrl = await ImageManager.upload(imageFile, 'gallery-images');

      const galleryData = {
        title,
        category,
        order,
        imageUrl,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'gallery'), galleryData);
      
      NotificationManager.show('Image uploaded successfully!', 'success');
      this.clearForm();
      this.loadAll();
    } catch (error) {
      console.error('Save gallery error:', error);
      NotificationManager.show(`Failed to upload: ${error.message}`, 'error');
    } finally {
      const saveBtn = document.getElementById('gallery-save-btn');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Item';
    }
  }

  static async delete(galleryId, imageUrl) {
    if (!confirm('Delete this image? This action cannot be undone.')) {
      return;
    }
    
    try {
      if (imageUrl) {
        await ImageManager.delete(imageUrl);
      }
      
      await deleteDoc(doc(db, 'gallery', galleryId));
      
      NotificationManager.show('Image deleted successfully!', 'success');
      this.loadAll();
    } catch (error) {
      console.error('Delete gallery error:', error);
      NotificationManager.show(`Failed to delete: ${error.message}`, 'error');
    }
  }

  static clearForm() {
    document.getElementById('gallery-title').value = '';
    document.getElementById('gallery-category').value = '';
    document.getElementById('gallery-order').value = '1';
    document.getElementById('gallery-image').value = '';
  }

  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Make delete function available globally (if needed for inline onclick)
window.deleteGalleryImage = (id, url) => GalleryManager.delete(id, url);
// ============================================
// EXECOM MANAGER
// ============================================
class ExecomManager {
  static async loadAll() {
    try {
      const q = query(collection(db, 'execom-sections'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      state.execomSections = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      this.renderSections();
     
    } catch (error) {
      console.error('Load ExeCom error:', error);
      NotificationManager.show('Failed to load ExeCom sections', 'error');
    }
  }

  static renderSections() {
    const container = document.getElementById('execom-sections-list');
    if (!container) {
      console.error('Execom sections list container not found');
      return;
    }
    
    if (state.execomSections.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #64748b;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">👥</div>
          <p>No ExeCom sections yet. Create your first section!</p>
        </div>
      `;
      return;
    }

    const grouped = {};
    state.execomSections.forEach(item => {
      if (!grouped[item.sectionName]) {
        grouped[item.sectionName] = [];
      }
      grouped[item.sectionName].push(item);
    });

    container.innerHTML = Object.entries(grouped).map(([sectionName, members]) => `
      <div class="execom-section-item">
        <div class="execom-section-header">
          <h3>${this.escapeHtml(sectionName)}</h3>
          <span style="color: var(--text-dim);">${members.length} member(s)</span>
        </div>
        <table class="execom-members-table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Name</th>
              <th>Position</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${members.map(member => `
              <tr>
                <td>
                  ${member.imageUrl ? `
                    <img src="${member.imageUrl}" alt="${this.escapeHtml(member.name)}" 
                         style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                  ` : '👤'}
                </td>
                <td>${this.escapeHtml(member.name)}</td>
                <td>${this.escapeHtml(member.position)}</td>
                <td style="white-space: nowrap;">
                  <button class="btn-edit" onclick="ExecomManager.edit('${member.id}')">Edit</button>
                  <button class="btn-delete" onclick="ExecomManager.delete('${member.id}', '${member.imageUrl || ''}')">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('');
  }

    static async save() {
    try {
      const saveBtn = document.getElementById('save-member-btn');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = state.editingMemberId ? 'Updating...' : 'Saving...';
      }

      const sectionName = document.getElementById('execom-section-name')?.value?.trim();
      const name = document.getElementById('execom-member-name')?.value?.trim();
      const position = document.getElementById('execom-member-position')?.value?.trim();
      const imageFile = document.getElementById('execom-member-image')?.files[0];

      if (!sectionName || !name || !position) {
        NotificationManager.show('Please fill in all required fields', 'warning');
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = state.editingMemberId ? 'Update Member' : 'Save Member';
        }
        return;
      }

      let imageUrl = null;

      if (state.editingMemberId) {
        // Editing existing member
        const existingMember = state.execomSections.find(m => m.id === state.editingMemberId);
        imageUrl = existingMember?.imageUrl || null;

        if (imageFile) {
          // Delete old image if uploading new
          if (imageUrl) await ImageManager.delete(imageUrl);
          imageUrl = await ImageManager.upload(imageFile, 'execom-images');
        }

        const updatedData = {
          sectionName,
          name,
          position,
          imageUrl,
          updatedAt: new Date().toISOString()
        };

        await updateDoc(doc(db, 'execom-sections', state.editingMemberId), updatedData);

        NotificationManager.show('Member updated successfully!', 'success');
      } else {
        // Adding new member
        if (imageFile) {
          imageUrl = await ImageManager.upload(imageFile, 'execom-images');
        }

        const execomData = {
          sectionName,
          name,
          position,
          imageUrl,
          createdAt: new Date().toISOString()
        };

        await addDoc(collection(db, 'execom-sections'), execomData);
        NotificationManager.show('Member added successfully!', 'success');
      }

      this.clearForm();
      state.editingMemberId = null; // Reset editing state
      await this.loadAll();

      // Reset button text
      if (saveBtn) {
        saveBtn.textContent = 'Save Member';
        saveBtn.style.background = ''; // reset color
      }

    } catch (error) {
      console.error('Save ExeCom error:', error);
      NotificationManager.show(`Failed to save: ${error.message}`, 'error');
    } finally {
      const saveBtn = document.getElementById('save-member-btn');
      if (saveBtn) {
        saveBtn.disabled = false;
      }
    }
  }
  static edit(memberId) {
    const member = state.execomSections.find(m => m.id === memberId);
    if (!member) {
      NotificationManager.show('Member not found', 'error');
      return;
    }

    state.editingMemberId = memberId;

    // Populate form fields
    document.getElementById('execom-section-name').value = member.sectionName || '';
    document.getElementById('execom-member-name').value = member.name || '';
    document.getElementById('execom-member-position').value = member.position || '';

    // Change save button text
    const saveBtn = document.getElementById('save-member-btn');
    if (saveBtn) {
      saveBtn.textContent = 'Update Member';
      saveBtn.style.background = '#f59e0b'; // optional: highlight update mode
    }

    // Scroll to form
    document.querySelector('#execom-section').scrollIntoView({ behavior: 'smooth' });

    NotificationManager.show('Editing member. Make changes and click "Update Member"', 'info');
  }
  static async delete(execomId, imageUrl) {
    if (!confirm('Delete this member? This action cannot be undone.')) {
      return;
    }
    
    try {
      if (imageUrl) {
        await ImageManager.delete(imageUrl);
      }
      
      await deleteDoc(doc(db, 'execom-sections', execomId));
      
      NotificationManager.show('Member deleted successfully!', 'success');
      this.loadAll();
    } catch (error) {
      console.error('Delete ExeCom error:', error);
      NotificationManager.show(`Failed to delete: ${error.message}`, 'error');
    }
  }

  static clearForm() {
    document.getElementById('execom-section-name').value = '';
    document.getElementById('execom-member-name').value = '';
    document.getElementById('execom-member-position').value = '';
    document.getElementById('execom-member-image').value = ''; 
  }

  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
//mcet updates
class McetupdatesManager {
  static async loadAll() {
    try {
      const q = query(collection(db, 'mcetupdates'), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      
      state.mcetupdates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      this.renderGrid();
 
    } catch (error) {
      console.error('Load MCET updates error:', error);
      NotificationManager.show('Failed to load MCET updates', 'error');
    }
  }

  static renderGrid() {
    const grid = document.getElementById('mcetupdates-grid');
    if (!grid) {
      console.error('MCET updates grid element not found');
      return;
    }

    
    
    if (state.mcetupdates.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🖼️</div>
          <p>No MCET updates yet. Upload your first update!</p>
        </div>
      `;
      return;
    } 

    grid.innerHTML = state.mcetupdates.map(item => {
   
      
      return `
        <div class="mcetupdates-card">
          <img 
            src="${item.imageUrl}" 
            alt="${this.escapeHtml(item.title || 'MCET update image')}"
            onerror="console.error('Image failed to load:', '${item.imageUrl}'); this.style.display='none'; this.nextElementSibling.style.display='flex';"
       
          />
          <div style="display: none; align-items: center; justify-content: center; height: 200px; background: #f1f5f9; color: #64748b; font-size: 14px; text-align: center; padding: 20px; flex-direction: column;">
            <div>⚠️ Image failed to load</div>
            <small style="font-size: 11px; word-break: break-all; margin-top: 8px; max-width: 100%;">${item.imageUrl?.substring(0, 80) || 'No URL'}...</small>
          </div>
          <div class="mcetupdates-card-info">
            <div class="mcetupdates-card-title">${this.escapeHtml(item.title || 'Untitled')}</div>
            <small style="color: #64748b; display: block; margin-bottom: 8px;">Category: ${this.escapeHtml(item.category || 'all')}</small>
            <small style="color: #64748b; display: block; margin-bottom: 8px;">Order: ${item.order || 1}</small>
            <button class="btn-delete" onclick="window.deleteMcetupdatesImage('${item.id}', '${item.imageUrl.replace(/'/g, "\\'")}')">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  }

  static async save() {
    try {
      const saveBtn = document.getElementById('mcetupdates-save-btn');
      if (!saveBtn) {
        console.error('Save button not found');
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = 'Uploading...';

      const title = document.getElementById('mcetupdates-title').value.trim() || 'Untitled';
      const category = document.getElementById('mcetupdates-category').value.trim() || 'all';
      const order = parseInt(document.getElementById('mcetupdates-order').value) || 1;
      const imageFile = document.getElementById('mcetupdates-image').files[0];

      if (!imageFile) {
        NotificationManager.show('Please select an image', 'warning');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Item';
        return;
      }

      const imageUrl = await ImageManager.upload(imageFile, 'mcetupdates-images');

      const mcetupdatesData = {
        title,
        category,
        order,
        imageUrl,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'mcetupdates'), mcetupdatesData);
      
      NotificationManager.show('MCET update uploaded successfully!', 'success');
      this.clearForm();
      this.loadAll();
    } catch (error) {
      console.error('Save MCET updates error:', error);
      NotificationManager.show(`Failed to upload: ${error.message}`, 'error');
    } finally {
      const saveBtn = document.getElementById('mcetupdates-save-btn');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Item';
      }
    }
  }

  static async delete(mcetupdatesId, imageUrl) {
    if (!confirm('Delete this update? This action cannot be undone.')) {
      return;
    }
    
    try {
      if (imageUrl) {
        await ImageManager.delete(imageUrl);
      }

      await deleteDoc(doc(db, 'mcetupdates', mcetupdatesId));

      NotificationManager.show('MCET update deleted successfully!', 'success');
      this.loadAll();
    } catch (error) {
      console.error('Delete MCET updates error:', error);
      NotificationManager.show(`Failed to delete: ${error.message}`, 'error');
    }
  }

  static clearForm() {
    const titleInput = document.getElementById('mcetupdates-title');
    const categoryInput = document.getElementById('mcetupdates-category');
    const orderInput = document.getElementById('mcetupdates-order');
    const imageInput = document.getElementById('mcetupdates-image');

    if (titleInput) titleInput.value = '';
    if (categoryInput) categoryInput.value = '';
    if (orderInput) orderInput.value = '1';
    if (imageInput) imageInput.value = '';
  }

  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Make delete function available globally (if needed for inline onclick)
window.deleteMcetupdatesImage = (id, url) => McetupdatesManager.delete(id, url);

// Make sure to initialize the event listeners
document.addEventListener('DOMContentLoaded', () => {
  const saveMemberBtn = document.getElementById('save-member-btn');
  const clearMemberBtn = document.getElementById('clear-member-btn');
  
  if (saveMemberBtn) {
    saveMemberBtn.addEventListener('click', () => ExecomManager.save());
  }
  
  if (clearMemberBtn) {
    clearMemberBtn.addEventListener('click', () => ExecomManager.clearForm());
  }
  
  // Make delete function globally accessible
  window.deleteExecomMember = (id, imageUrl) => ExecomManager.delete(id, imageUrl);
});
// ============================================
// ADD NOTIFICATION STYLES
// ============================================
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// ============================================
// INITIALIZE EVENT LISTENERS
// ============================================
function initializeEventListeners() {
  // Auth buttons
  const loginBtn = document.getElementById('google-login-btn');
  const signOutBtn = document.getElementById('sign-out-btn');
  
  if (loginBtn) {
    loginBtn.onclick = () => AuthManager.signIn();
  }
  
  if (signOutBtn) {
    signOutBtn.onclick = () => AuthManager.signOut();
  }

  // Quick Links - Coming Soon
  const comingSoonForm = document.querySelector('#quick-links-section .inner-card:first-of-type');
  if (comingSoonForm) {
    const saveBtn = comingSoonForm.querySelector('.btn-save');
    const resetBtn = comingSoonForm.querySelector('.btn-reset');
    
    if (saveBtn) {
      saveBtn.onclick = () => QuickLinksManager.saveComingSoon();
    }
    if (resetBtn) {
      resetBtn.onclick = () => QuickLinksManager.loadAll();
    }
  }

  // Quick Links - Live Now
  const liveNowForm = document.querySelector('#quick-links-section .inner-card:last-of-type');
  if (liveNowForm) {
    const saveBtn = liveNowForm.querySelector('.btn-save');
    const resetBtn = liveNowForm.querySelector('.btn-reset');
    
    if (saveBtn) {
      saveBtn.onclick = () => QuickLinksManager.saveLiveNow();
    }
    if (resetBtn) {
      resetBtn.onclick = () => QuickLinksManager.loadAll();
    }
  }

  // Events
  const eventSaveBtn = document.getElementById('save-event-btn');
  const eventClearBtn = document.getElementById('clear-event-btn');
  
  if (eventSaveBtn) {
    eventSaveBtn.onclick = () => EventManager.save();
  }
  if (eventClearBtn) {
    eventClearBtn.onclick = () => EventManager.clearForm();
  }

  // Event Highlights
  const highlightSaveBtn = document.getElementById('save-highlight-btn');
  const highlightClearBtn = document.getElementById('clear-highlight-btn');
  
  if (highlightSaveBtn) {
    highlightSaveBtn.onclick = () => EventHighlightsManager.save();
  }
  if (highlightClearBtn) {
    highlightClearBtn.onclick = () => EventHighlightsManager.clearForm();
  }

  // Gallery
  const gallerySaveBtn = document.getElementById('gallery-save-btn');
  
  if (gallerySaveBtn) {
    gallerySaveBtn.onclick = () => GalleryManager.save();
  }

  // ExeCom
  const execomSaveBtn = document.getElementById('save-section-btn');
  const execomClearBtn = document.getElementById('clear-section-btn');
  
if (execomSaveBtn) {
    execomSaveBtn.onclick = () => ExecomManager.save();
  }
  if (execomClearBtn) {
    execomClearBtn.onclick = () => ExecomManager.clearForm();
  }

    // MCET Updates
 const mcetupdatesSaveBtn = document.getElementById('mcetupdates-save-btn');
  
  if (mcetupdatesSaveBtn) {
    mcetupdatesSaveBtn.onclick = () => McetupdatesManager.save();
  }
}

// ============================================
// MAKE MANAGERS AVAILABLE GLOBALLY
// ============================================
window.QuickLinksManager = QuickLinksManager;
window.EventManager = EventManager;
window.EventHighlightsManager = EventHighlightsManager;
window.GalleryManager = GalleryManager;
window.ExecomManager = ExecomManager;
window.McetupdatesManager = McetupdatesManager;

// Global functions for onclick handlers
window.editEvent = (id) => EventManager.edit(id);
window.deleteEvent = (id, url) => EventManager.delete(id, url);
window.deleteHighlight = (id, url) => EventHighlightsManager.delete(id, url);
window.deleteGalleryImage = (id, url) => GalleryManager.delete(id, url);
window.deleteExecomMember = (id, url) => ExecomManager.delete(id, url);
window.deleteMcetupdatesImage = (id, url) => McetupdatesManager.delete(id, url);

// ============================================
// INITIALIZE APPLICATION
// ============================================


// Initialize auth and event listeners
AuthManager.initialize();
document.addEventListener('DOMContentLoaded', initializeEventListeners);