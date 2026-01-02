// ============================================
// FIREBASE CONFIGURATION - COMPLETE ADMIN PANEL
// Quick Links + Events + Gallery + ExeCom Management
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

console.log('✅ Firebase initialized (Auth, Firestore, Storage)');

// ============================================
// APPLICATION STATE
// ============================================
const state = {
  currentUser: null,
  editingEventId: null,
  editingGalleryId: null,
  editingSectionId: null,
  events: [],
  gallery: [],
  execomSections: [],
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
    GalleryManager.loadAll();
    ExecomManager.loadAll();
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

      console.log('✅ Image uploaded:', downloadURL);
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
      
      console.log('✅ Image deleted:', filePath);
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

      console.log('✅ Loaded Quick Links');
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
  static async loadAll() {
    try {
      const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      state.events = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      this.renderTable();
      console.log(`✅ Loaded ${state.events.length} events`);
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

    tbody.innerHTML = state.events.map(event => `
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
                       background: ${event.featured ? 'rgba(59, 130, 246, 0.2)' : 'rgba(100, 116, 139, 0.2)'};
                       color: ${event.featured ? '#3b82f6' : '#94a3b8'};">
            ${event.featured ? '⭐ Featured' : 'Standard'}
          </span>
        </td>
        <td style="white-space: nowrap;">
          <button class="btn-edit" onclick="window.editEvent('${event.id}')">Edit</button>
          <button class="btn-delete" onclick="window.deleteEvent('${event.id}', '${event.imageUrl || ''}')">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  static async save() {
    try {
      const saveBtn = document.getElementById('save-event-btn');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      const title = document.getElementById('event-title').value.trim();
      const summary = document.getElementById('event-summary').value.trim();
      const featured = document.getElementById('event-featured').value === 'yes';
      const imageFile = document.getElementById('event-image').files[0];

      if (!title || !summary) {
        NotificationManager.show('Please fill in all required fields', 'warning');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Event';
        return;
      }

      let imageUrl = null;
      if (imageFile) {
        imageUrl = await ImageManager.upload(imageFile, 'event-images');
      }

      const eventData = {
        title,
        summary,
        featured,
        imageUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'events'), eventData);
      
      NotificationManager.show('Event saved successfully!', 'success');
      this.clearForm();
      this.loadAll();
    } catch (error) {
      console.error('Save event error:', error);
      NotificationManager.show(`Failed to save: ${error.message}`, 'error');
    } finally {
      const saveBtn = document.getElementById('save-event-btn');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Event';
    }
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
    document.getElementById('event-featured').value = 'no';
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
      console.log(`✅ Loaded ${state.gallery.length} gallery images`);
    } catch (error) {
      console.error('Load gallery error:', error);
      NotificationManager.show('Failed to load gallery', 'error');
    }
  }

  static renderGrid() {
    const grid = document.querySelector('.gallery-grid');
    if (!grid) return;
    
    if (state.gallery.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🖼️</div>
          <p>No gallery images yet. Upload your first image!</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = state.gallery.map(item => `
      <div class="gallery-card">
        <img src="${item.imageUrl}" alt="${item.title || 'Gallery image'}" />
        <div class="gallery-card-info">
          <div class="gallery-card-title">${this.escapeHtml(item.title || 'Untitled')}</div>
          <small style="color: #64748b; display: block; margin-bottom: 8px;">${this.escapeHtml(item.category || 'all')}</small>
          <button class="btn-delete" onclick="window.deleteGalleryImage('${item.id}', '${item.imageUrl}')">Delete</button>
        </div>
      </div>
    `).join('');
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
      console.log(`✅ Loaded ${state.execomSections.length} ExeCom sections`);
    } catch (error) {
      console.error('Load ExeCom error:', error);
      NotificationManager.show('Failed to load ExeCom sections', 'error');
    }
  }

  static renderSections() {
    const container = document.getElementById('execom-sections-list');
    if (!container) return;
    
    if (state.execomSections.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #64748b;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">👥</div>
          <p>No ExeCom sections yet. Create your first section!</p>
        </div>
      `;
      return;
    }

    // Group by section name
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
          <h3>${sectionName}</h3>
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
                    <img src="${member.imageUrl}" alt="${member.name}" 
                         style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                  ` : '👤'}
                </td>
                <td>${this.escapeHtml(member.name)}</td>
                <td>${this.escapeHtml(member.position)}</td>
                <td>
                  <button class="btn-delete" onclick="window.deleteExecomMember('${member.id}', '${member.imageUrl || ''}')">Delete</button>
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
      const saveBtn = document.getElementById('save-section-btn');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      const sectionName = document.getElementById('execom-section-name').value;
      const inputs = document.querySelectorAll('#execom-section input[type="text"]');
      const name = inputs[0]?.value.trim();
      const position = inputs[1]?.value.trim();
      const imageFile = document.getElementById('execom-section-image').files[0];

      if (!sectionName) {
        NotificationManager.show('Please select a section', 'warning');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save section';
        return;
      }

      if (!name || !position) {
        NotificationManager.show('Please fill in name and position', 'warning');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save section';
        return;
      }

      let imageUrl = null;
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
      
      NotificationManager.show('ExeCom member added successfully!', 'success');
      this.clearForm();
      this.loadAll();
    } catch (error) {
      console.error('Save ExeCom error:', error);
      NotificationManager.show(`Failed to save: ${error.message}`, 'error');
    } finally {
      const saveBtn = document.getElementById('save-section-btn');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save section';
    }
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
    const inputs = document.querySelectorAll('#execom-section input[type="text"]');
    inputs.forEach(input => input.value = '');
    document.getElementById('execom-section-image').value = '';
  }

  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

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
}

// ============================================
// MAKE MANAGERS AVAILABLE GLOBALLY
// ============================================
window.QuickLinksManager = QuickLinksManager;
window.EventManager = EventManager;
window.GalleryManager = GalleryManager;
window.ExecomManager = ExecomManager;

// Global functions for onclick handlers
window.editEvent = (id) => EventManager.edit(id);
window.deleteEvent = (id, url) => EventManager.delete(id, url);
window.deleteGalleryImage = (id, url) => GalleryManager.delete(id, url);
window.deleteExecomMember = (id, url) => ExecomManager.delete(id, url);

// ============================================
// INITIALIZE APPLICATION
// ============================================
console.log('🚀 IEEE Admin Panel - Complete Management System');
console.log('✅ Firebase Services: Auth, Firestore, Storage');
console.log('📦 Features: Quick Links, Events, Gallery, ExeCom');

// Initialize auth and event listeners
AuthManager.initialize();
document.addEventListener('DOMContentLoaded', initializeEventListeners);