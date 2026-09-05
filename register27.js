import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, setDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ============================================================
// Firebase Setup
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyBE2Qu3N2QZPbdSQKsvTwOeGym_R-3qnHM",
  authDomain: "livewire-2027.firebaseapp.com",
  databaseURL: "https://livewire-2027-default-rtdb.firebaseio.com",
  projectId: "livewire-2027",
  storageBucket: "livewire-2027.firebasestorage.app",
  messagingSenderId: "1085354777077",
  appId: "1:1085354777077:web:775d32b8c561c2862368bc"
};

window.firebaseConfig = firebaseConfig; // Make available globally to check if replaced

let db = null;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);

  // Export functions globally so scripts / window can reference them if needed
  window.firebaseDb = db;
  window.firebaseCollection = collection;
  window.firebaseSetDoc = setDoc;
  window.firebaseDoc = doc;
  window.firebaseTimestamp = serverTimestamp;
} catch (e) {
  console.error("Firebase init failed:", e);
}

// ============================================================
// Register27 — Page Logic
// ============================================================
(function () {
  'use strict';

  // ---- Session ID for Idempotency ----
  let sessionId = localStorage.getItem('livewire_reg_session_id');
  if (!sessionId) {
    sessionId = (window.crypto && crypto.randomUUID && crypto.randomUUID()) || (Date.now().toString(36) + Math.random().toString(36).substring(2));
    localStorage.setItem('livewire_reg_session_id', sessionId);
  }

  // ---- Event Data ----
  const EVENTS = [
    { id: 'hackerrank', name: 'HackerRank', subtitle: 'Hackathon 2027', category: 'coding', participants: 1 },
    { id: 'appetite', name: 'APPetite', subtitle: 'App Creation', category: 'coding', participants: 2 },
    { id: 'sandbox', name: 'Sandbox Mania', subtitle: 'Scratch', category: 'coding', participants: 1 },
    { id: 'asc-valorant', name: 'Ascension — Valorant', subtitle: 'E-sports Tournament', category: 'gaming', participants: 5, optionalLast: false },
    { id: 'asc-rocket', name: 'Ascension — Rocket League', subtitle: 'E-sports Tournament', category: 'gaming', participants: 4 },
    { id: 'asc-bgmi', name: 'Ascension — BGMI', subtitle: 'E-sports Tournament', category: 'gaming', participants: 4 },
    { id: 'drs', name: 'Dynamic Racing Showdown', subtitle: 'Obstacle Race', category: 'gaming', participants: 2 },
    { id: 'paradox', name: 'Paradox Palette', subtitle: 'Canva Poster', category: 'designing', participants: 1 },
    { id: 'aperture', name: 'Aperture Alchemy', subtitle: 'Photography', category: 'designing', participants: 1 },
    { id: 'fbf', name: 'Frame by Frame', subtitle: 'Film Making', category: 'designing', participants: 4 },
    { id: 'soundbytes', name: 'Sound Bytes', subtitle: 'Blind Film', category: 'designing', participants: 3 },
    { id: 'aenigma', name: 'Aenigma Syntax', subtitle: 'Cryptic Hunt', category: 'innovation', participants: 2 },
    { id: 'venture', name: 'Venture Verse', subtitle: 'Entrepreneurship', category: 'innovation', participants: 3 },
    { id: 'quiz', name: 'Quiz Quotient', subtitle: 'Tech Quiz', category: 'innovation', participants: 1 },
  ];

  const TOTAL = EVENTS.length; // 14

  // ---- State ----
  const registrations = {};   // eventId → [ { fullName, phone, class, section, email }, ... ]
  let currentEvent = null;    // event object being edited
  let currentParticipant = 0; // 0-indexed
  let tempData = [];          // temporary participant data for current modal session

  // ---- DOM refs ----
  const grid = document.getElementById('eventsGrid');
  const overlay = document.getElementById('modalOverlay');
  const modalCard = document.getElementById('modalCard');
  const modalTag = document.getElementById('modalTag');
  const modalTitle = document.getElementById('modalTitle');
  const formSection = document.getElementById('modalFormSection');
  const pLabel = document.getElementById('participantLabel');
  const pDots = document.getElementById('participantDots');
  const pFields = document.getElementById('participantFields');
  const optionalNote = document.getElementById('optionalNote');
  const btnBack = document.getElementById('btnBack');
  const btnNext = document.getElementById('btnNext');
  const btnSubmit = document.getElementById('btnSubmit');
  const btnSkip = document.getElementById('btnSkip');
  const modalClose = document.getElementById('modalClose');
  const bottomBar = document.getElementById('bottomBar');
  const bottomCount = document.getElementById('bottomBarCount');
  const bottomDots = document.getElementById('bottomBarDots');
  const btnFinal = document.getElementById('btnFinalSubmit');

  // ---- Render Event Cards ----
  function renderCards() {
    if (!grid) return;
    grid.innerHTML = '';
    EVENTS.forEach(ev => {
      const card = document.createElement('div');
      card.className = 'event-card' + (registrations[ev.id] ? ' is-registered' : '');
      card.dataset.eventId = ev.id;
      card.innerHTML = `
      <div>
        <span class="card-tag ${ev.category}">${ev.category}</span>
        <div class="card-title">${ev.name}</div>
        <div class="card-subtitle">${ev.subtitle}</div>
      </div>
      <div class="card-participants">
        <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>${ev.participants > 1 ? '<path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' : ''}</svg>
        ${ev.participants} participant${ev.participants > 1 ? 's' : ''}
      </div>
    `;
      card.addEventListener('click', () => openModal(ev));
      grid.appendChild(card);
    });
  }

  // ---- Render Bottom Bar Dots ----
  function renderBottomDots() {
    if (!bottomDots) return;
    bottomDots.innerHTML = '';
    for (let i = 0; i < TOTAL; i++) {
      const dot = document.createElement('span');
      bottomDots.appendChild(dot);
    }
  }

  // ---- Update Bottom Bar ----
  function updateBottomBar() {
    if (!bottomCount || !bottomDots || !btnFinal) return;
    const count = Object.keys(registrations).length;
    bottomCount.innerHTML = `<strong>${count}</strong> / ${TOTAL} events registered`;
    const dots = bottomDots.querySelectorAll('span');
    let filled = 0;
    EVENTS.forEach((ev, i) => {
      if (registrations[ev.id]) {
        dots[i].classList.add('is-filled');
        filled++;
      } else {
        dots[i].classList.remove('is-filled');
      }
    });
    btnFinal.disabled = count === 0;

    // Show bar after first interaction (scroll past school form)
    if (bottomBar && !bottomBar.classList.contains('is-visible')) {
      bottomBar.classList.add('is-visible');
    }
  }

  // ---- Open Modal ----
  function openModal(ev) {
    currentEvent = ev;
    currentParticipant = 0;

    // Pre-fill from existing registration data, or create empty slots
    if (registrations[ev.id]) {
      tempData = JSON.parse(JSON.stringify(registrations[ev.id]));
    } else {
      tempData = [];
      for (let i = 0; i < ev.participants; i++) {
        tempData.push({ fullName: '', phone: '', class: '', section: '', email: '', discordId: '', inGameId: '' });
      }
    }

    // Set modal header
    if (modalTag) {
      modalTag.className = 'modal-tag ' + ev.category;
      modalTag.textContent = ev.category;
    }
    if (modalTitle) modalTitle.textContent = ev.name;

    renderParticipantForm();
    if (overlay) {
      overlay.classList.add('is-active');
      overlay.classList.remove('is-closing');
    }
    document.body.style.overflow = 'hidden';
  }

  // ---- Close Modal ----
  function closeModal(saveData) {
    if (overlay) {
      overlay.classList.add('is-closing');
      setTimeout(() => {
        overlay.classList.remove('is-active', 'is-closing');
        document.body.style.overflow = '';
        currentEvent = null;
        tempData = [];
      }, 450);
    }
  }

  // ---- Render Participant Form ----
  function renderParticipantForm(direction) {
    const ev = currentEvent;
    if (!ev) return;
    const idx = currentParticipant;
    const total = ev.participants;
    const isLast = idx === total - 1;
    const isFirst = idx === 0;

    // Update indicator
    if (pLabel) pLabel.textContent = total > 1 ? `Participant ${idx + 1} of ${total}` : 'Participant Details';

    // Dots
    if (pDots) {
      pDots.innerHTML = '';
      if (total > 1) {
        for (let i = 0; i < total; i++) {
          const dot = document.createElement('span');
          if (i < idx) dot.classList.add('is-done');
          if (i === idx) dot.classList.add('is-active');
          pDots.appendChild(dot);
        }
      }
    }

    // Fields
    const data = tempData[idx] || {};
    const isAscension = ev.id.startsWith('asc-');
    const discordRequired = isAscension || ev.id === 'aenigma';
    const slideClass = direction === 'back' ? 'participant-slide-back' : (direction === 'next' ? 'participant-slide' : '');
    if (pFields) {
      pFields.className = 'participant-fields ' + slideClass;
      pFields.innerHTML = `
      <div class="field">
        <label for="pFullName">Full Name</label>
        <input type="text" id="pFullName" placeholder="e.g. RAHUL KUMAR" value="${escHtml(data.fullName || '')}">
        <span class="field-error" id="errFullName"></span>
      </div>
      <div class="field">
        <label for="pPhone">Phone Number</label>
        <input type="tel" id="pPhone" placeholder="e.g. 9876543210" maxlength="10" value="${escHtml(data.phone || '')}">
        <span class="field-hint">10-digit mobile number</span>
        <span class="field-error" id="errPhone"></span>
      </div>
      <div class="field">
        <label for="pClass">Class</label>
        <input type="number" id="pClass" placeholder="e.g. 6, 9, 11, 12" min="1" max="12" value="${escHtml(data.class || '')}">
        <span class="field-hint">Enter class as a number (6, 7, 8, 9, 10, 11, 12)</span>
        <span class="field-error" id="errClass"></span>
      </div>
      <div class="field">
        <label for="pSection">Section</label>
        <input type="text" id="pSection" placeholder="e.g. A, B, C" value="${escHtml(data.section || '')}">
        <span class="field-error" id="errSection"></span>
      </div>
      <div class="field">
        <label for="pEmail">Email</label>
        <input type="email" id="pEmail" placeholder="e.g. STUDENT@GMAIL.COM" value="${escHtml(data.email || '')}">
        <span class="field-error" id="errEmail"></span>
      </div>
      <div class="field">
        <label for="pDiscordId">Discord ID ${discordRequired ? '' : '(Optional)'}</label>
        <input type="text" id="pDiscordId" placeholder="e.g. username#1234" value="${escHtml(data.discordId || '')}">
        <span class="field-error" id="errDiscordId"></span>
      </div>
      ${isAscension ? `
      <div class="field">
        <label for="pInGameId">In Game ID</label>
        <input type="text" id="pInGameId" placeholder="e.g. GAMERTAG" value="${escHtml(data.inGameId || '')}">
        <span class="field-error" id="errInGameId"></span>
      </div>
      ` : ''}
    `;
    }

    // Optional note
    if (optionalNote) optionalNote.style.display = 'none';

    // Buttons
    if (btnBack) btnBack.style.display = (isFirst || total === 1) ? 'none' : '';
    if (btnSkip) btnSkip.style.display = 'none';

    if (btnNext && btnSubmit) {
      if (total === 1 || isLast) {
        btnNext.style.display = 'none';
        btnSubmit.style.display = '';
      } else {
        btnNext.style.display = '';
        btnSubmit.style.display = 'none';
      }
    }
  }

  // ---- Save current participant fields to tempData ----
  function saveCurrentFields() {
    const idx = currentParticipant;
    tempData[idx] = {
      fullName: (document.getElementById('pFullName') || {}).value || '',
      phone: (document.getElementById('pPhone') || {}).value || '',
      class: (document.getElementById('pClass') || {}).value || '',
      section: (document.getElementById('pSection') || {}).value || '',
      email: (document.getElementById('pEmail') || {}).value || '',
      discordId: (document.getElementById('pDiscordId') || {}).value || '',
      inGameId: (document.getElementById('pInGameId') || {}).value || '',
    };
  }

  // ---- Validation ----
  function validateParticipantFields() {
    saveCurrentFields();
    const d = tempData[currentParticipant];
    let valid = true;

    // Clear all errors
    document.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; el.classList.remove('is-visible'); });
    document.querySelectorAll('.participant-fields input').forEach(el => el.classList.remove('is-error'));

    // Full Name — required, uppercase
    const nameEl = document.getElementById('pFullName');
    if (!d.fullName.trim()) {
      showFieldError('errFullName', nameEl, 'Full name is required');
      valid = false;
    } else if (d.fullName.trim() !== d.fullName.trim().toUpperCase()) {
      showFieldError('errFullName', nameEl, 'Must be in CAPITAL LETTERS');
      valid = false;
    }

    // Phone — required, exactly 10 digits
    const phoneEl = document.getElementById('pPhone');
    const phoneClean = d.phone.replace(/\s/g, '');
    if (!phoneClean) {
      showFieldError('errPhone', phoneEl, 'Phone number is required');
      valid = false;
    } else if (!/^\d{10}$/.test(phoneClean)) {
      showFieldError('errPhone', phoneEl, 'Enter a valid 10-digit phone number');
      valid = false;
    }

    // Class — required, must be a number between 6-12
    const classEl = document.getElementById('pClass');
    const classVal = d.class.trim();
    if (!classVal) {
      showFieldError('errClass', classEl, 'Class is required');
      valid = false;
    } else if (!/^\d{1,2}$/.test(classVal) || parseInt(classVal) < 6 || parseInt(classVal) > 12) {
      showFieldError('errClass', classEl, 'Enter class as a number (6–12)');
      valid = false;
    }

    // Section — required, uppercase
    const secEl = document.getElementById('pSection');
    if (!d.section.trim()) {
      showFieldError('errSection', secEl, 'Section is required');
      valid = false;
    } else if (d.section.trim() !== d.section.trim().toUpperCase()) {
      showFieldError('errSection', secEl, 'Must be in CAPITAL LETTERS');
      valid = false;
    }

    // Email — required, valid format, uppercase
    const emailEl = document.getElementById('pEmail');
    if (!d.email.trim()) {
      showFieldError('errEmail', emailEl, 'Email is required');
      valid = false;
    } else if (d.email.trim() !== d.email.trim().toUpperCase()) {
      showFieldError('errEmail', emailEl, 'Must be in CAPITAL LETTERS');
      valid = false;
    } else if (!/^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$/i.test(d.email.trim())) {
      showFieldError('errEmail', emailEl, 'Enter a valid email address');
      valid = false;
    }

    const isAscension = currentEvent && currentEvent.id.startsWith('asc-');
    const discordRequired = isAscension || (currentEvent && currentEvent.id === 'aenigma');

    // Discord ID
    const discordEl = document.getElementById('pDiscordId');
    if (discordRequired && !d.discordId.trim()) {
      showFieldError('errDiscordId', discordEl, 'Discord ID is required for this event');
      valid = false;
    }

    // In Game ID
    if (isAscension) {
      const inGameEl = document.getElementById('pInGameId');
      if (!d.inGameId.trim()) {
        showFieldError('errInGameId', inGameEl, 'In Game ID is required for Ascension events');
        valid = false;
      }
    }

    return valid;
  }

  function showFieldError(errId, inputEl, msg) {
    const errEl = document.getElementById(errId);
    if (errEl) { errEl.textContent = msg; errEl.classList.add('is-visible'); }
    if (inputEl) inputEl.classList.add('is-error');
  }

  function validateSection1() {
    let valid = true;
    // Clear previous errors
    ['schoolNameError', 'schoolEmailError', 'teacherNameError', 'teacherPhoneError', 'teacherEmailError'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = ''; el.classList.remove('is-visible'); }
    });
    ['schoolName', 'schoolEmail', 'teacherName', 'teacherPhone', 'teacherEmail'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('is-error');
    });

    const schoolName = document.getElementById('schoolName').value.trim();
    const schoolEmail = document.getElementById('schoolEmail').value.trim();
    const teacherName = document.getElementById('teacherName').value.trim();
    const teacherPhone = document.getElementById('teacherPhone').value.trim();
    const teacherEmail = document.getElementById('teacherEmail').value.trim();

    // School Name
    if (!schoolName) {
      showSectionError('schoolNameError', 'schoolName', 'School name is required');
      valid = false;
    } else if (schoolName !== schoolName.toUpperCase()) {
      showSectionError('schoolNameError', 'schoolName', 'Must be in CAPITAL LETTERS');
      valid = false;
    }

    // School Email
    if (!schoolEmail) {
      showSectionError('schoolEmailError', 'schoolEmail', 'School email is required');
      valid = false;
    } else if (schoolEmail !== schoolEmail.toUpperCase()) {
      showSectionError('schoolEmailError', 'schoolEmail', 'Must be in CAPITAL LETTERS');
      valid = false;
    } else if (!/^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$/i.test(schoolEmail)) {
      showSectionError('schoolEmailError', 'schoolEmail', 'Enter a valid email address');
      valid = false;
    }

    // Teacher Name
    if (!teacherName) {
      showSectionError('teacherNameError', 'teacherName', 'Teacher name is required');
      valid = false;
    } else if (teacherName !== teacherName.toUpperCase()) {
      showSectionError('teacherNameError', 'teacherName', 'Must be in CAPITAL LETTERS');
      valid = false;
    }

    // Teacher Phone
    const tPhoneClean = teacherPhone.replace(/\s/g, '');
    if (!tPhoneClean) {
      showSectionError('teacherPhoneError', 'teacherPhone', 'Phone number is required');
      valid = false;
    } else if (!/^\d{10}$/.test(tPhoneClean)) {
      showSectionError('teacherPhoneError', 'teacherPhone', 'Enter a valid 10-digit phone number');
      valid = false;
    }

    // Teacher Email
    if (!teacherEmail) {
      showSectionError('teacherEmailError', 'teacherEmail', 'Email is required');
      valid = false;
    } else if (teacherEmail !== teacherEmail.toUpperCase()) {
      showSectionError('teacherEmailError', 'teacherEmail', 'Must be in CAPITAL LETTERS');
      valid = false;
    } else if (!/^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$/i.test(teacherEmail)) {
      showSectionError('teacherEmailError', 'teacherEmail', 'Enter a valid email address');
      valid = false;
    }

    return valid;
  }

  function showSectionError(errId, inputId, msg) {
    const errEl = document.getElementById(errId);
    const inputEl = document.getElementById(inputId);
    if (errEl) { errEl.textContent = msg; errEl.classList.add('is-visible'); }
    if (inputEl) inputEl.classList.add('is-error');
  }

  // ---- Button Handlers ----
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (!validateParticipantFields()) return;
      currentParticipant++;
      renderParticipantForm('next');
    });
  }

  if (btnBack) {
    btnBack.addEventListener('click', () => {
      saveCurrentFields();
      currentParticipant--;
      renderParticipantForm('back');
    });
  }

  if (btnSubmit) {
    btnSubmit.addEventListener('click', () => {
      if (!validateParticipantFields()) return;
      // Save registration
      registrations[currentEvent.id] = JSON.parse(JSON.stringify(tempData));
      // Close modal with animation
      closeModal(true);
      // Re-render card with checkmark
      setTimeout(() => {
        renderCards();
        updateBottomBar();
      }, 500);
    });
  }

  if (btnSkip) {
    btnSkip.addEventListener('click', () => {
      tempData[currentParticipant] = { fullName: '', phone: '', class: '', section: '', email: '', discordId: '', inGameId: '' };
      registrations[currentEvent.id] = JSON.parse(JSON.stringify(tempData));
      closeModal(true);
      setTimeout(() => {
        renderCards();
        updateBottomBar();
      }, 500);
    });
  }

  if (modalClose) modalClose.addEventListener('click', () => closeModal(false));
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(false);
    });
  }

  // Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay && overlay.classList.contains('is-active')) {
      closeModal(false);
    }
  });

  // ---- Final Submit ----
  if (btnFinal) {
    btnFinal.addEventListener('click', async () => {
      if (!validateSection1()) {
        const schoolSection = document.getElementById('schoolSection');
        if (schoolSection) schoolSection.scrollIntoView({ behavior: 'smooth' });
        return;
      }

      const schoolName = document.getElementById('schoolName').value.trim();
      const schoolEmail = document.getElementById('schoolEmail').value.trim();
      const teacherName = document.getElementById('teacherName').value.trim();
      const teacherPhone = document.getElementById('teacherPhone').value.trim();
      const teacherEmail = document.getElementById('teacherEmail').value.trim();

      const payload = {
        school: { name: schoolName, email: schoolEmail },
        teacher: { name: teacherName, phone: teacherPhone, email: teacherEmail },
        events: registrations,
        timestamp: (window.firebaseTimestamp ? window.firebaseTimestamp() : (serverTimestamp ? serverTimestamp() : new Date().toISOString()))
      };

      // Visual feedback - Loading state
      btnFinal.textContent = 'Saving...';
      btnFinal.disabled = true;
      btnFinal.style.background = 'rgba(124, 92, 255, 0.5)';
      btnFinal.style.color = '#fff';

      try {
        const activeDb = window.firebaseDb || db;
        const activeSetDoc = window.firebaseSetDoc || setDoc;
        const activeDoc = window.firebaseDoc || doc;

        if (activeDb && activeSetDoc && window.firebaseConfig && window.firebaseConfig.apiKey !== "YOUR_API_KEY") {
          const docRef = activeDoc(activeDb, "registrations", sessionId);

          // Wrap the Firebase call in a timeout so it doesn't hang forever
          const savePromise = activeSetDoc(docRef, payload);
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout: Database didn't respond.")), 5000));

          await Promise.race([savePromise, timeoutPromise]);

          // Clear session ID after successful submission so next form uses a fresh ID
          localStorage.removeItem('livewire_reg_session_id');
        } else {
          // Simulate network delay for testing
          await new Promise(r => setTimeout(r, 1200));
          if (!window.firebaseConfig || window.firebaseConfig.apiKey === "YOUR_API_KEY") {
            throw new Error("Firebase is not configured! Please replace the keys in the HTML.");
          }
        }

        // Visual feedback - Success
        btnFinal.textContent = 'Submitted ✓';
        btnFinal.style.background = 'var(--violet)';

        // Open Success Modal
        const successOverlay = document.getElementById('successOverlay');
        if (successOverlay) {
          successOverlay.classList.add('is-active');
        }
      } catch (error) {
        console.error("Submission Error:", error);

        // Revert button
        btnFinal.textContent = 'Submit All Registrations';
        btnFinal.disabled = false;
        btnFinal.style.background = '';
        btnFinal.style.color = '';

        // Open Error Modal
        const errorOverlay = document.getElementById('errorOverlay');
        if (errorOverlay) {
          errorOverlay.classList.add('is-active');
        }
      }
    });
  }

  // ---- Show bottom bar on scroll ----
  const schoolFormEl = document.getElementById('schoolForm');
  if (schoolFormEl && bottomBar) {
    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) {
          bottomBar.classList.add('is-visible');
        }
      });
    }, { threshold: 0 });
    barObserver.observe(schoolFormEl);
  }

  // ---- Utility ----
  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML.replace(/"/g, '&quot;');
  }

  // ---- Init ----
  renderCards();
  renderBottomDots();

  // ---- Auto-uppercase and clear errors for School/Teacher forms ----
  const section1Inputs = document.querySelectorAll('#schoolForm input, #teacherForm input');

  section1Inputs.forEach(input => {
    if (input.id === 'teacherPhone') {
      input.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '');
      });
    }
    input.addEventListener('input', function () {
      const errSpan = this.parentElement.querySelector('.error-msg');
      if (errSpan) {
        errSpan.textContent = '';
        errSpan.classList.remove('is-visible');
      }
      this.classList.remove('is-error');
    });
  });

})();
