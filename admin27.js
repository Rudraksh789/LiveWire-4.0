// ============================================================
// LiveWire 4.0 — Admin Dashboard Logic
// ============================================================

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBE2Qu3N2QZPbdSQKsvTwOeGym_R-3qnHM",
  authDomain: "livewire-2027.firebaseapp.com",
  databaseURL: "https://livewire-2027-default-rtdb.firebaseio.com",
  projectId: "livewire-2027",
  storageBucket: "livewire-2027.firebasestorage.app",
  messagingSenderId: "1085354777077",
  appId: "1:1085354777077:web:775d32b8c561c2862368bc"
};

let db = null;
let auth = null;

try {
  if (typeof firebase !== 'undefined' && firebase.initializeApp) {
    const app = firebase.apps && firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
    window.firebaseDb = db;
    window.firebaseAuth = auth;
  }
} catch (e) {
  console.error("Firebase initialization failed:", e);
}

// DOM Elements
const loginOverlay = document.getElementById('loginOverlay');
const adminDashboard = document.getElementById('adminDashboard');
const loginForm = document.getElementById('loginForm');
const adminPassword = document.getElementById('adminPassword');
const btnLogin = document.getElementById('btnLogin');
const btnTogglePass = document.getElementById('btnTogglePass');
const loginError = document.getElementById('loginError');
const btnLogout = document.getElementById('btnLogout');
const searchInput = document.getElementById('searchInput');
const btnExport = document.getElementById('btnExport');
const tableBody = document.getElementById('tableBody');
const thActions = document.getElementById('thActions');

let allData = [];
let isDev = true;
let isUnlocking = false;
let unsubscribe = null;

const EVENT_NAMES = {
  'hackerrank': 'HackerRank',
  'appetite': 'APPetite',
  'sandbox': 'Sandbox Mania',
  'asc-valorant': 'Ascension — Valorant',
  'asc-rocket': 'Ascension — Rocket League',
  'asc-bgmi': 'Ascension — BGMI',
  'drs': 'Dynamic Racing Showdown',
  'paradox': 'Paradox Palette',
  'aperture': 'Aperture Alchemy',
  'fbf': 'Frame by Frame',
  'soundbytes': 'Sound Bytes',
  'aenigma': 'Aenigma Syntax',
  'venture': 'Venture Verse',
  'quiz': 'Quiz Quotient'
};

// Real-time error trigger with shake and neon glow
function triggerError(message) {
  const card = document.querySelector('.login-card');
  const errorBadge = document.getElementById('loginError');
  const errorText = document.getElementById('loginErrorText');

  if (errorText) errorText.textContent = message;
  if (errorBadge) errorBadge.classList.add('is-visible');

  if (adminPassword) {
    adminPassword.classList.add('input-error');
    adminPassword.focus();
    adminPassword.select();
  }

  if (card) {
    card.classList.remove('shake-error');
    void card.offsetWidth; // Force reflow to re-trigger CSS shake animation
    card.classList.add('shake-error');
  }
}

// Enable/disable Unlock button & clear error state when typing
function syncLoginButton() {
  if (!adminPassword || !btnLogin) return;
  const val = adminPassword.value.trim();
  btnLogin.disabled = val.length === 0;

  if (adminPassword.classList.contains('input-error')) {
    adminPassword.classList.remove('input-error');
  }
  const errorBadge = document.getElementById('loginError');
  if (errorBadge && errorBadge.classList.contains('is-visible')) {
    errorBadge.classList.remove('is-visible');
  }
}

if (adminPassword) {
  adminPassword.addEventListener('input', syncLoginButton);
  adminPassword.addEventListener('keyup', syncLoginButton);
  adminPassword.addEventListener('change', syncLoginButton);

  // Handle Enter key on empty field
  adminPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && adminPassword.value.trim().length === 0) {
      e.preventDefault();
      triggerError('Please enter password to unlock.');
    }
  });

  // Run immediately on page load in case browser pre-fills
  syncLoginButton();
}

// Animated Eye Toggle for Show/Hide Password
if (btnTogglePass && adminPassword) {
  btnTogglePass.addEventListener('click', (e) => {
    e.preventDefault();
    const isPass = adminPassword.type === 'password';
    adminPassword.type = isPass ? 'text' : 'password';

    // Toggle styling & animation classes
    btnTogglePass.classList.toggle('is-visible', isPass);
    btnTogglePass.classList.remove('animate-pop');
    void btnTogglePass.offsetWidth; // Force reflow to replay CSS keyframe
    btnTogglePass.classList.add('animate-pop');

    btnTogglePass.setAttribute('title', isPass ? 'Hide password' : 'Show password');
    btnTogglePass.setAttribute('aria-label', isPass ? 'Hide password' : 'Show password');

    adminPassword.focus();
  });
}

// Auth state observer
function setupAuth() {
  if (!auth) return;
  auth.onAuthStateChanged((user) => {
    if (user) {
      isDev = user.email === 'dev@livewire.com';
      const errorBadge = document.getElementById('loginError');
      if (errorBadge) errorBadge.classList.remove('is-visible');
      unlockDashboard();
    } else {
      isUnlocking = false;
      loginOverlay.classList.remove('is-hidden', 'is-exiting');
      loginOverlay.style.display = 'flex';
      adminDashboard.classList.remove('is-visible');
    }
  });
}

if (auth) {
  setupAuth();
}

// Login Submit
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pwd = adminPassword.value.trim();

    if (!pwd) {
      triggerError('Please enter password to unlock.');
      return;
    }

    let emailToTry = '';
    if (pwd === 'dev.lab.27') {
      emailToTry = 'dev@livewire.com';
    } else if (pwd === 'wired.lab.27') {
      emailToTry = 'admin@livewire.com';
    } else {
      triggerError('Access Denied · Incorrect Password');
      return;
    }

    btnLogin.disabled = true;
    btnLogin.textContent = 'Authenticating...';

    if (!auth) {
      // Offline / fallback demo mode
      setTimeout(() => {
        isDev = pwd === 'dev.lab.27';
        unlockDashboard();
      }, 500);
      return;
    }

    auth.signInWithEmailAndPassword(emailToTry, pwd)
      .then(() => {
        adminPassword.value = '';
        syncLoginButton();
        btnLogin.textContent = 'Unlock Database';
      })
      .catch((error) => {
        syncLoginButton();
        btnLogin.textContent = 'Unlock Database';
        triggerError('Authentication Failed · Check Credentials');
      });
  });
}

// Logout
if (btnLogout) {
  btnLogout.addEventListener('click', () => {
    if (auth) {
      auth.signOut()
        .then(() => {
          isUnlocking = false;
          const transScreen = document.getElementById('transitionScreen');
          if (transScreen) {
            transScreen.classList.remove('is-active', 'is-fading');
            transScreen.style.display = 'none';
          }
          adminDashboard.classList.remove('is-visible');
          loginOverlay.classList.remove('is-exiting', 'is-hidden');
          loginOverlay.style.display = 'flex';
          adminPassword.value = '';
          syncLoginButton();
          btnLogin.textContent = 'Unlock Database';
        })
        .catch(err => console.error("Logout failed", err));
    } else {
      isUnlocking = false;
      const transScreen = document.getElementById('transitionScreen');
      if (transScreen) {
        transScreen.classList.remove('is-active', 'is-fading');
        transScreen.style.display = 'none';
      }
      adminDashboard.classList.remove('is-visible');
      loginOverlay.classList.remove('is-exiting', 'is-hidden');
      loginOverlay.style.display = 'flex';
      adminPassword.value = '';
      syncLoginButton();
    }
  });
}

// Cinematic Unlock & Loading Animation Sequence
function unlockDashboard() {
  if (isUnlocking) return;
  isUnlocking = true;

  const transScreen = document.getElementById('transitionScreen');
  const transLoaderWrap = document.getElementById('transLoaderWrap');
  const transLoaderFill = document.getElementById('transLoaderFill');
  const transPercent = document.getElementById('transPercent');
  const transLoadingText = document.getElementById('transLoadingText');
  const transWelcomeWrap = document.getElementById('transWelcomeWrap');

  // Step 1: Animate login screen elements away (scale down, blur, fade)
  loginOverlay.classList.add('is-exiting');

  setTimeout(() => {
    loginOverlay.style.display = 'none';

    // Step 2: Show transition screen with loader
    transScreen.style.display = 'flex';
    transScreen.classList.remove('is-fading');
    transScreen.classList.add('is-active');

    transLoaderWrap.classList.remove('is-done');
    transWelcomeWrap.classList.remove('is-visible');

    // Step 3: Run cybernetic progress bar animation (0% -> 100%)
    let progress = 0;
    const duration = 1400; // 1.4s smooth progress
    const startTime = performance.now();

    const statusMessages = [
      { at: 0, text: 'DECRYPTING ARCHIVES...' },
      { at: 35, text: 'VERIFYING SECURITY TOKENS...' },
      { at: 70, text: 'INITIALIZING DATA STREAM...' },
      { at: 92, text: 'ACCESS GRANTED' }
    ];

    function animateLoader(now) {
      const elapsed = now - startTime;
      const p = Math.min(elapsed / duration, 1);

      // Smooth ease-out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      progress = Math.round(eased * 100);

      transLoaderFill.style.width = progress + '%';
      transPercent.textContent = progress + '%';

      // Update cyber status messages
      for (let i = statusMessages.length - 1; i >= 0; i--) {
        if (progress >= statusMessages[i].at) {
          transLoadingText.textContent = statusMessages[i].text;
          break;
        }
      }

      if (p < 1) {
        requestAnimationFrame(animateLoader);
      } else {
        // Step 4: Loading complete! Transition from loading bar to welcome animation
        setTimeout(() => {
          transLoaderWrap.classList.add('is-done');
          setTimeout(() => {
            transWelcomeWrap.classList.add('is-visible');
          }, 220);

          // Step 5: After welcome display, fade out transition screen and reveal database
          setTimeout(() => {
            transScreen.classList.add('is-fading');

            setTimeout(() => {
              transScreen.classList.remove('is-active', 'is-fading');
              transScreen.style.display = 'none';
              adminDashboard.classList.add('is-visible');
              if (isDev && thActions) thActions.style.display = 'table-cell';

              fetchData();
              isUnlocking = false;
            }, 650);
          }, 1400); // 1.4s of welcome message
        }, 350);
      }
    }

    setTimeout(() => {
      requestAnimationFrame(animateLoader);
    }, 120);

  }, 450); // 450ms for loginOverlay exit animation
}

// Fetch and flatten Firestore data
function fetchData() {
  try {
    if (unsubscribe) unsubscribe();
    if (!db) {
      tableBody.innerHTML = `<tr><td colspan="11" class="empty-state">Firebase offline or connecting...</td></tr>`;
      return;
    }

    unsubscribe = db.collection("registrations").onSnapshot((querySnapshot) => {
      allData = [];

      querySnapshot.forEach((docSnap) => {
        const id = docSnap.id;
        const data = docSnap.data();
        const schoolName = data.school?.name || 'N/A';
        const schoolEmail = data.school?.email || 'N/A';
        const teacherName = data.teacher?.name || 'N/A';
        const teacherPhone = data.teacher?.phone || 'N/A';
        const teacherEmail = data.teacher?.email || 'N/A';

        if (data.events) {
          Object.keys(data.events).forEach(eventId => {
            const participants = data.events[eventId];
            if (Array.isArray(participants)) {
              participants.forEach((p, index) => {
                if (p.fullName && p.fullName.trim() !== '') {
                  allData.push({
                    docId: id,
                    schoolName: schoolName,
                    schoolEmail: schoolEmail,
                    teacherName: teacherName,
                    teacherPhone: teacherPhone,
                    teacherEmail: teacherEmail,
                    eventId: eventId,
                    pIndex: index,
                    event: EVENT_NAMES[eventId] || eventId,
                    participant: p.fullName,
                    pClass: p.class || '-',
                    section: p.section || '-',
                    phone: p.phone || '-',
                    email: p.email || '-',
                    discordId: p.discordId || '-',
                    inGameId: p.inGameId || '-'
                  });
                }
              });
            }
          });
        }
      });

      renderTable(allData);
    }, (error) => {
      console.error("Error fetching data: ", error);
      tableBody.innerHTML = `<tr><td colspan="11" class="error-msg is-visible">Error loading data. Check console.</td></tr>`;
    });
  } catch (error) {
    console.error("Error setting up listener: ", error);
    tableBody.innerHTML = `<tr><td colspan="11" class="error-msg is-visible">Error loading data. Check console.</td></tr>`;
  }
}

// Render Table Rows
function renderTable(data) {
  if (!tableBody) return;
  if (data.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="11" class="empty-state">No registrations found.</td></tr>`;
    return;
  }

  tableBody.innerHTML = data.map(row => `
    <tr>
      <td><strong>${row.schoolName}</strong></td>
      <td>${row.schoolEmail}</td>
      <td><span class="tag-event">${row.event}</span></td>
      <td>${row.participant}</td>
      <td>${row.pClass}</td>
      <td>${row.section}</td>
      <td>${row.phone}</td>
      <td>${row.email}</td>
      <td>${row.discordId}</td>
      <td>${row.inGameId}</td>
      ${isDev ? `<td><button class="btn-delete" onclick="deleteReg('${row.docId}', '${row.eventId}', ${row.pIndex})">Delete</button></td>` : ''}
    </tr>
  `).join('');
}

// Delete Registration (Single Participant Slot)
window.deleteReg = async function (docId, eventId, pIndex) {
  if (!confirm("Are you sure you want to delete this specific participant?")) return;
  if (!db) return alert("Firebase is not connected.");

  try {
    const docRef = db.collection("registrations").doc(docId);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const data = docSnap.data();
      const events = data.events || {};

      if (events[eventId] && events[eventId][pIndex]) {
        events[eventId][pIndex] = { fullName: "", class: "", section: "", phone: "", email: "", discordId: "", inGameId: "" };
        await docRef.update({ events: events });
        alert("Participant deleted successfully.");
      } else {
        alert("Participant data not found in document.");
      }
    }
  } catch (error) {
    console.error("Error deleting document:", error);
    alert("Failed to delete. Check console.");
  }
};

// Search Filter
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = allData.filter(row => {
      return Object.values(row).some(val =>
        String(val).toLowerCase().includes(q)
      );
    });
    renderTable(filtered);
  });
}

// Export CSV
if (btnExport) {
  btnExport.addEventListener('click', () => {
    if (allData.length === 0) return alert('No data to export!');

    const headers = ['Doc ID', 'School Name', 'School Email', 'Teacher Name', 'Teacher Phone', 'Teacher Email', 'Event', 'Participant Name', 'Class', 'Section', 'Participant Phone', 'Participant Email', 'Discord ID', 'In Game ID'];
    const csvRows = [];
    csvRows.push(headers.join(','));

    const currentData = searchInput && searchInput.value ? allData.filter(row => Object.values(row).some(val => String(val).toLowerCase().includes(searchInput.value.toLowerCase()))) : allData;

    function sanitizeCsvField(value, forceText = false) {
      let str = String(value || "");
      if (forceText && !str.startsWith("'")) {
        str = "'" + str;
      } else if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str;
      }
      return `"${str.replace(/"/g, '""')}"`;
    }

    for (const row of currentData) {
      const values = [
        sanitizeCsvField(row.docId),
        sanitizeCsvField(row.schoolName),
        sanitizeCsvField(row.schoolEmail),
        sanitizeCsvField(row.teacherName),
        sanitizeCsvField(row.teacherPhone, true),
        sanitizeCsvField(row.teacherEmail),
        sanitizeCsvField(row.event),
        sanitizeCsvField(row.participant),
        sanitizeCsvField(row.pClass),
        sanitizeCsvField(row.section),
        sanitizeCsvField(row.phone, true),
        sanitizeCsvField(row.email),
        sanitizeCsvField(row.discordId),
        sanitizeCsvField(row.inGameId)
      ];
      csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'LiveWire_Registrations.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
}
