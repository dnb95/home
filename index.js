import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  getFirestore, collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  doc, query, where, onSnapshot, orderBy, setDoc, limit
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const FB = {
  apiKey: "AIzaSyAP5gV1yUVEKnd_x3RkqyxYwF7vpnROgR0",
  authDomain: "tstmg-1.firebaseapp.com",
  projectId: "tstmg-1",
  storageBucket: "tstmg-1.firebasestorage.app",
  messagingSenderId: "626888970289",
  appId: "1:626888970289:web:23880053888f3dd1a88510"
};

const app  = initializeApp(FB);
const auth = getAuth(app);
const db   = getFirestore(app);

emailjs.init("2VkygefcXxbSOlhFX");

const GROQ_API_URL = "https://groqrelay.greninja71144.workers.dev";
const GROQ_MODEL   = "llama-3.3-70b-versatile"; 

window.currentUser = null;
window.usersMap    = new Map();
window.subjectsMap = new Map();
window._uploadedFiles = [];

window._coursUnsub   = null;
window._frUnsub      = null;
window._pinnedUnsub  = null;

window._quizUnsub    = null;
window._aiQuizUnsub  = null;
window._liveQuizzesData = [];
window._liveAIQuizzesData = [];

window._pubFeedUnsub = null;
window._dmChatsUnsub = null;
window._dmMsgsUnsub  = null;
window._currentViewedUser = null;

window._filterContext = 'cours'; 
window._coursFilter = { subject: 'all', order: 'recent' };
window._frFilter    = { subject: 'all', type: 'all', order: 'recent' };
window._quizFilter  = { subject: 'all', type: 'all', order: 'recent' };

window._pubSubjFilter = "all";
window._pubTabActive  = "cours";

window._pubLikesData = { posts: [], quizzes: [], ai_quizzes: [] };
window._pubLikesUnsubPosts = null;
window._pubLikesUnsubQuizzes = null;
window._pubLikesUnsubAIQuizzes = null;

window._activeChatId = null;
window._activeChatPartnerId = null;
window._dmFileToUpload = null;

const CLOUDINARY_CLOUD_NAME    = "dmtggmxrm";
const CLOUDINARY_UPLOAD_PRESET = "iAcqTr_Pg13v5d-Es84wIkdUqaw";

window._currentQuizData = null;
window._quizMode = null; 
window._currentQuestionIndex = 0;
window._quizUserAnswers = [];
window._quizStartTime = 0;
window._hasViewedAnswers = false;

window._currentAudio = null;
window._galleryImages = [];
window._galleryIndex = 0;
window._allAdminUsers = [];

window.formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 10000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return num.toString();
};

window.getBadge = (userObj) => {
  return (userObj && userObj.isVerified) ? `<img src="https://cdn.prod.website-files.com/6214eaa668d0de27c3ea80cf/652fd0e960df145545f25f12_Pastille%20bleu%20certification%20instagram.png" class="verified-icon" title="Compte certifié">` : '';
};

window.updateUnreadDots = (count) => {
  document.querySelectorAll('.nav-unread-dot').forEach(d => {
    d.style.display = count > 0 ? 'inline-block' : 'none';
  });
};

function loadTheme() {
  const dark = localStorage.getItem("dnb_theme") === "dark";
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  const t = document.getElementById("tog-dark");
  if(t) t.checked = dark;
}
loadTheme();

window.applyTheme = (dark) => {
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  localStorage.setItem("dnb_theme", dark ? "dark" : "light");
};

function loadAnimationsSetting() {
  const noAnim = localStorage.getItem("dnb_no_transitions") === "true";
  document.body.classList.toggle("no-transitions", noAnim);
  const tog = document.getElementById("tog-animations");
  if(tog) tog.checked = !noAnim;
}
loadAnimationsSetting();

window.toggleAnimations = (enabled) => {
  document.body.classList.toggle("no-transitions", !enabled);
  localStorage.setItem("dnb_no_transitions", (!enabled).toString());
  showToast(enabled ? "Animations activées ✨" : "Animations désactivées ⚡");
};

window.showToast = (msg) => {
  const t = document.getElementById("toast");
  t.innerText = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
};

onSnapshot(collection(db, "users"), snap => {
  snap.forEach(d => {
    const u = d.data();
    window.usersMap.set(u.username, { id: d.id, ...u });
    if (currentUser && u.username === currentUser.username) {
      Object.assign(currentUser, { id: d.id, ...u });
    }
  });
  
  if (document.getElementById("page-cours").classList.contains("active")) loadCoursFeed();
  if (document.getElementById("page-fichesrev").classList.contains("active")) loadFRFeed();
  if (document.getElementById("page-quiz").classList.contains("active")) loadQuizFeed();
  
  if (window._currentViewedUser) {
    renderPublicProfile(window._currentViewedUser.username);
    if (window._pubTabActive === 'likes') renderPubLikes();
  }
  
  if (currentUser) {
    const myBadge = getBadge(currentUser);
    document.getElementById("drop-name").innerHTML = (currentUser.displayName || currentUser.username) + myBadge;
    document.getElementById("drawer-name").innerHTML = (currentUser.displayName || currentUser.username) + myBadge;
  }
});

window.addEventListener("hashchange", handleHashChange);

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(handleHashChange, 50);
  if (!localStorage.getItem('dnb_cookie_consent')) {
    document.getElementById('cookie-banner').style.display = 'flex';
  }
});

window.handleCookies = (accept) => {
  localStorage.setItem('dnb_cookie_consent', accept ? 'true' : 'false');
  document.getElementById('cookie-banner').style.display = 'none';
  if (accept) {
     console.log("Google Analytics activé");
  }
};

function handleHashChange() {
  let hash = window.location.hash.trim();
  if (!hash || hash === "#" || hash === "#page-matieres") {
    showInternalView('accueil'); 
    return;
  }
  if (hash.startsWith("#page-")) {
    let target = hash.replace("#page-", "");
    if (target === 'matieres') target = 'accueil';
    showInternalView(target); 
    return;
  }
  const uname = decodeURIComponent(hash.substring(1)).toLowerCase().trim();
  if (uname) {
      renderPublicProfile(uname);
  } else {
      showInternalView('accueil');
  }
}

function showInternalView(target) {
  if (target === 'matieres') target = 'accueil';
  if (target === 'admin') {
    const isAdmin = currentUser && (currentUser.role === 'admin' || (currentUser.subRoles && currentUser.subRoles.includes('admin')));
    if (!isAdmin) { 
      showToast("Accès non autorisé."); 
      window.location.hash = "#page-accueil"; 
      return; 
    }
    syncAdminDashboardStats();
    syncAdminUsers();
    syncAdminMats();
  }

  document.querySelectorAll(".page-view").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".drawer-btn[data-tab]").forEach(b => b.classList.remove("active"));
  
  const page = document.getElementById(`page-${target}`);
  if (page) {
    page.classList.remove("active");
    void page.offsetWidth; 
    page.classList.add("active");
  }

  const tab = document.querySelector(`.nav-tab[data-target="${target}"]`);
  if (tab) tab.classList.add("active");

  const drawerBtn = document.querySelector(`.drawer-btn[data-tab="${target}"]`);
  if (drawerBtn) drawerBtn.classList.add("active");

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (target === 'messages') loadDMChats();
  if (target === 'quiz') loadQuizFeed();
  if (target === 'setting') { loadAIQuizHistory(); loadAnimationsSetting(); }
  if (target === 'cours') loadCoursFeed();
  if (target === 'fichesrev') loadFRFeed();
  if (target === 'accueil') { loadPinnedAnnonces(); loadAnnonces(); }
}

signInAnonymously(auth).then(async () => {
  const s = localStorage.getItem("dnb_reviz_session");
  if (s) {
    const cached = JSON.parse(s);
    hydrateSession(cached);
    try {
      const freshSnap = await getDoc(doc(db, "users", cached.id));
      if (freshSnap.exists()) {
        hydrateSession({ id: freshSnap.id, ...freshSnap.data() });
      }
    } catch(e) {
      console.error(e);
    }
  }
  handleHashChange();
}).catch(console.error);

window.handleLogin = async () => {
  const id  = document.getElementById("login-id").value.trim().toLowerCase();
  const pwd = document.getElementById("login-pwd").value.trim();
  if (!id || !pwd) {
    showToast("Remplis tous les champs.");
    return;
  }

  const q = query(collection(db, "users"), where("username", "==", id));
  const snap = await getDocs(q);    
  if (snap.empty) {
    showToast("Identifiant introuvable.");
    return;
  }
  const d = snap.docs[0];
  const u = { id: d.id, ...d.data() };
  
  if (u.password !== pwd) {
    showToast("Mot de passe incorrect.");
    return;
  }
  hydrateSession(u);
};

document.getElementById("login-pwd").addEventListener("keydown", e => { if (e.key === "Enter") handleLogin(); });
document.getElementById("login-id").addEventListener("keydown", e => { if (e.key === "Enter") handleLogin(); });

window.handleLogout = () => {
  localStorage.removeItem("dnb_reviz_session");
  window.location.hash = "";
  window.location.reload();
};

async function seedSubjects() {
  const base = [
    { name: "Management", icon: "💼" },
    { name: "Sciences de Gestion", icon: "📊" },
    { name: "Droit et Économie", icon: "⚖️" },
    { name: "Philosophie", icon: "🦉" },
    { name: "Mathématiques", icon: "📐" },
    { name: "Histoire-Géographie", icon: "🌍" },
    { name: "Langues Vivantes", icon: "🗣️" },
    { name: "Spécialité MSGN", icon: "🚀" }
  ];
  for (const m of base) {
    await addDoc(collection(db, "subjects"), m);
  }
}

function displayNameFromId(id) {
  return id.split(/[\.\-_]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

function hydrateSession(u) {
  window.currentUser = u;
  localStorage.setItem("dnb_reviz_session", JSON.stringify(u));

  document.getElementById("view-login").style.display = "none";
  document.getElementById("view-app").style.display = "block";
  loadTheme();

  setAvatar(u.avatar, u.displayName || u.username);
  
  const myBadge = getBadge(u);
  document.getElementById("drop-name").innerHTML  = (u.displayName || u.username) + myBadge;
  document.getElementById("drawer-name").innerHTML  = (u.displayName || u.username) + myBadge;
  
  document.getElementById("drop-role").innerText  = u.role;
  document.getElementById("prof-id").value        = u.username;
  document.getElementById("prof-display").value   = u.displayName || u.username;

  document.getElementById("prof-bio-input").value      = u.bio || "";
  document.getElementById("prof-insta-input").value    = u.instagram || "";
  document.getElementById("prof-linkedin-input").value = u.linkedin || "";
  document.getElementById("prof-banner-input").value   = u.banner || "";
  
  const isAdmin  = u.role === "admin" || (u.subRoles && u.subRoles.includes("admin"));
  const groupTiktok = document.getElementById("group-tiktok");
  if (groupTiktok && isAdmin) {
    groupTiktok.classList.remove("hidden");
    document.getElementById("prof-tiktok-input").value = u.tiktok || "";
  }

  if (document.getElementById("tog-allow-msgs")) {
    document.getElementById("tog-allow-msgs").checked = u.allowMessages !== false;
  }
  if (document.getElementById("tog-email-notif")) {
    document.getElementById("tog-email-notif").checked = !!u.emailNotifs;
  }
  if (document.getElementById("setting-email")) {
    document.getElementById("setting-email").value = u.email || "";
  }

  const canDepot = u.role === "professeur" || u.role === "admin" || u.role === "HS" || (u.subRoles && (u.subRoles.includes("volontaire") || u.subRoles.includes("admin")));

  document.getElementById("tab-admin").classList.toggle("hidden", !isAdmin);
  document.getElementById("tab-depot").classList.toggle("hidden", !canDepot);
  document.getElementById("tab-creer-quiz").classList.toggle("hidden", !canDepot);
  
  document.querySelectorAll(".admin-only").forEach(el => el.classList.toggle("hidden", !isAdmin));

  const drawerDepot = document.getElementById("drawer-depot");
  const drawerAdmin = document.getElementById("drawer-admin");
  const drawerCreerQuiz = document.getElementById("drawer-creer-quiz");
  
  if (drawerDepot) drawerDepot.classList.toggle("hidden", !canDepot);
  if (drawerCreerQuiz) drawerCreerQuiz.classList.toggle("hidden", !canDepot);
  if (drawerAdmin) drawerAdmin.classList.toggle("hidden", !isAdmin);

  document.getElementById("drawer-role").innerText = u.role;
  setDrawerAvatar(u.avatar, u.displayName || u.username);

  if (u.isTempPassword) openModal("m-force-pwd");

  loadMatieres();
  syncContrib();
  
  if (isAdmin) {
    syncAdminDashboardStats();
    syncAdminUsers();
    syncAdminMats();
  }
  
  loadAnnonces();
  loadPinnedAnnonces();
  loadCoursFeed();
  loadFRFeed();
  loadDMChats(); 
  
  if (document.getElementById("page-quiz").classList.contains("active")) {
    loadQuizFeed();
  }
}

function setAvatar(data, name) {
  const initials = (name || "?").split(" ").map(p => p[0]).join("").substring(0, 2).toUpperCase();
  
  ["nav-initials", "prof-initials"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerText = initials;
  });
  
  ["nav-av-img", "prof-av-img"].forEach(id => {
    const el = document.getElementById(id); 
    if (!el) return;
    if (data) {
      el.src = data;
      el.style.display = "block";
    } else {
      el.style.display = "none";
    }
  });
  
  const navI = document.getElementById("nav-initials");
  if (navI) navI.style.display = data ? "none" : "block";
  const pI = document.getElementById("prof-initials");
  if (pI) pI.style.display = data ? "none" : "block";
}

function setDrawerAvatar(data, name) {
  const initials = (name || "?").split(" ").map(p => p[0]).join("").substring(0, 2).toUpperCase();
  const el = document.getElementById("drawer-initials");
  const img = document.getElementById("drawer-av-img");
  
  if (el) el.innerText = initials;
  if (img) {
    if (data) {
      img.src = data;
      img.style.display = "block";
      if (el) el.style.display = "none";
    } else {
      img.style.display = "none";
      if (el) el.style.display = "block";
    }
  }
}

window.handleForcePwd = async () => {
  const p = document.getElementById("force-pwd").value.trim();
  if (p.length < 4) {
    showToast("Min. 4 caractères.");
    return;
  }
  
  await updateDoc(doc(db, "users", currentUser.id), { password: p, isTempPassword: false });
  currentUser.password = p; 
  currentUser.isTempPassword = false;
  localStorage.setItem("dnb_reviz_session", JSON.stringify(currentUser));
  closeModal("m-force-pwd"); 
  showToast("Mot de passe mis à jour ✓");
};

async function uploadToCloudinary(file) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  fd.append("resource_type", "auto"); 
  
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`, {
    method: "POST",
    body: fd
  });
  
  if (!res.ok) throw new Error(`Cloudinary HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.secure_url; 
}

window.uploadAvatar = (e) => {
  const file = e.target.files[0]; 
  if (!file) return;
  
  const r = new FileReader();
  r.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); 
      c.width = c.height = 140;
      c.getContext("2d").drawImage(img, 0, 0, 140, 140);
      const b64 = c.toDataURL("image/jpeg", 0.8);
      
      updateDoc(doc(db, "users", currentUser.id), { avatar: b64 }).then(() => {
        currentUser.avatar = b64;
        localStorage.setItem("dnb_reviz_session", JSON.stringify(currentUser));
        setAvatar(b64, currentUser.displayName); 
        showToast("Photo mise à jour ✓");
      });
    };
    img.src = ev.target.result;
  };
  r.readAsDataURL(file);
};

window.uploadMyBanner = async (e) => {
  const file = e.target.files[0]; 
  if (!file) return;
  
  showToast("Upload de la bannière en cours...");
  try {
    const url = await uploadToCloudinary(file);
    document.getElementById("prof-banner-input").value = url;
    showToast("Bannière chargée ✓ N'oublie pas d'Enregistrer");
  } catch (err) { 
    showToast("Erreur Cloudinary"); 
  }
};

window.saveProfile = async () => {
  const d        = document.getElementById("prof-display").value.trim();
  const bio      = document.getElementById("prof-bio-input").value.trim();
  const insta    = document.getElementById("prof-insta-input").value.trim();
  const linkedin = document.getElementById("prof-linkedin-input").value.trim();
  const banner   = document.getElementById("prof-banner-input").value.trim();
  const tkInput  = document.getElementById("prof-tiktok-input");
  const tiktok   = tkInput ? tkInput.value.trim() : "";

  if (!d) return;

  const updates = { displayName: d, bio, instagram: insta, linkedin, banner, tiktok };
  await updateDoc(doc(db, "users", currentUser.id), updates);
  
  Object.assign(currentUser, updates);
  localStorage.setItem("dnb_reviz_session", JSON.stringify(currentUser));
  
  const myBadge = getBadge(currentUser);
  document.getElementById("drop-name").innerHTML = d + myBadge;
  document.getElementById("drawer-name").innerHTML = d + myBadge;
  setAvatar(currentUser.avatar, d);
  setDrawerAvatar(currentUser.avatar, d);
  
  showToast("Profil enregistré ✓");
  syncContrib();
};

window.goToMyLikes = () => {
  if (!currentUser) return;
  window.location.hash = '#' + currentUser.username;
  setTimeout(() => {
    switchPubTab('likes');
  }, 400);
};

window.toggleAllowMsgs = async (val) => {
  await updateDoc(doc(db, "users", currentUser.id), { allowMessages: val });
  currentUser.allowMessages = val;
  localStorage.setItem("dnb_reviz_session", JSON.stringify(currentUser));
};

window.toggleEmailNotifs = async (val) => {
  await updateDoc(doc(db, "users", currentUser.id), { emailNotifs: val });
  currentUser.emailNotifs = val;
  localStorage.setItem("dnb_reviz_session", JSON.stringify(currentUser));
};

window.saveEmailSettings = async () => {
  const e = document.getElementById("setting-email").value.trim();
  await updateDoc(doc(db, "users", currentUser.id), { email: e });
  currentUser.email = e;
  localStorage.setItem("dnb_reviz_session", JSON.stringify(currentUser));
  showToast("Adresse email sauvegardée ✓");
};

async function sendEmailNotif(type, receiverObj, extraParams) {
  if (!receiverObj.emailNotifs || !receiverObj.email) return;
  let templateId = type === 'message' ? 'template_ira8lxo' : 'template_uxyq7sp';
  emailjs.send("service_cza73j9", templateId, {
    username: receiverObj.displayName || receiverObj.username,
    sender: currentUser.displayName || currentUser.username,
    email: receiverObj.email,
    ...extraParams
  }).catch(console.error);
}

async function syncContrib() {
  const q1 = query(collection(db, "posts"), where("authorId", "==", currentUser.username));
  const q2 = query(collection(db, "quizzes"), where("authorId", "==", currentUser.username));
  const q3 = query(collection(db, "ai_quizzes"), where("authorId", "==", currentUser.username));
  
  const snap1 = await getDocs(q1);
  const snap2 = await getDocs(q2);
  const snap3 = await getDocs(q3);
  
  const el = document.getElementById("contrib-count"); 
  if (el) el.innerText = snap1.size + snap2.size + snap3.size;
}

window.changePassword = async () => {
  const p = document.getElementById("setting-pwd").value.trim(); 
  if (!p) return;
  
  await updateDoc(doc(db, "users", currentUser.id), { password: p, isTempPassword: false });
  currentUser.password = p;
  localStorage.setItem("dnb_reviz_session", JSON.stringify(currentUser));
  document.getElementById("setting-pwd").value = "";
  showToast("Mot de passe changé ✓");
};

function loadMatieres() {
  onSnapshot(collection(db, "subjects"), (snap) => {
    const isAdmin = currentUser.role === "admin" || (currentUser.subRoles && currentUser.subRoles.includes("admin"));
    const mainGrid = document.getElementById("matieres-grid");
    const selDepot = document.getElementById("post-matiere");
    const selQuizCreate = document.getElementById("quiz-create-matiere");
    const selQuizIA = document.getElementById("quiz-ia-matiere");
    
    mainGrid.innerHTML = ""; 
    selDepot.innerHTML = ""; 
    selQuizCreate.innerHTML = ""; 
    selQuizIA.innerHTML = ""; 
    window.subjectsMap.clear();

    snap.forEach(d => {
      const m = d.data();
      window.subjectsMap.set(m.name, m.icon);

      mainGrid.innerHTML += `
        <div class="slider-matiere-card" onclick="openSubjectInMatieres('${esc(m.name)}')">
          ${isAdmin ? `<button class="card-del" onclick="event.stopPropagation();delMatiere('${d.id}')">✕</button>` : ""}
          <div>
            <div class="card-icon" style="font-size:36px;margin-bottom:14px;">${m.icon}</div>
            <div class="card-title" style="font-size:18px;font-weight:600;color:var(--ink);margin-bottom:6px;">${m.name}</div>
          </div>
          ${isAdmin ? `<button class="btn-ghost btn-sm" style="align-self:flex-start;margin-top:12px;" onclick="event.stopPropagation();editMatiere('${d.id}','${esc(m.name)}','${m.icon}')">✏️ Modifier</button>`
                   : `<span class="caption" style="color:var(--primary);font-weight:600;margin-top:auto;display:inline-block;">Consulter →</span>`}
        </div>`;
        
      const opt = `<option value="${esc(m.name)}">${m.icon} ${m.name}</option>`;
      selDepot.innerHTML += opt;
      selQuizCreate.innerHTML += opt;
      selQuizIA.innerHTML += opt;
    });
    selQuizIA.innerHTML += `<option value="autre">Autre (préciser...)</option>`;
  });
}

window.openSubjectInMatieres = (name) => {
  window._coursFilter.subject = name; 
  switchTab('cours');
  loadCoursFeed();
};

window.openFilterModal = (context) => {
  window._filterContext = context;
  const typeGroup = document.getElementById("filter-type-group");
  const typeLabel = document.getElementById("filter-type-label");
  const subjSelect = document.getElementById("filter-subject");
  const orderSelect = document.getElementById("filter-order");
  const typeSelect = document.getElementById("filter-type");

  let htmlSubjs = `<option value="all">Toutes les matières</option>`;
  Array.from(window.subjectsMap.entries()).sort((a,b) => a[0].localeCompare(b[0])).forEach(([name, icon]) => {
    htmlSubjs += `<option value="${esc(name)}">${icon} ${name}</option>`;
  });
  subjSelect.innerHTML = htmlSubjs;

  if (context === 'cours') {
    typeGroup.style.display = 'none';
    subjSelect.value = window._coursFilter.subject;
    orderSelect.value = window._coursFilter.order;
  } else if (context === 'quiz') {
    typeGroup.style.display = 'flex';
    typeLabel.innerText = "Type de quiz";
    typeSelect.innerHTML = `
      <option value="all">Tous</option>
      <option value="manuel">Classiques</option>
      <option value="ia">Générés par l'IA</option>
    `;
    typeSelect.value = window._quizFilter.type;
    subjSelect.value = window._quizFilter.subject;
    orderSelect.value = window._quizFilter.order;
  } else {
    typeGroup.style.display = 'flex';
    typeLabel.innerText = "Type de document";
    typeSelect.innerHTML = `
      <option value="all">Tout</option>
      <option value="fiches">Fiches</option>
      <option value="revisions">Révisions</option>
    `;
    subjSelect.value = window._frFilter.subject;
    typeSelect.value = window._frFilter.type;
    orderSelect.value = window._frFilter.order;
  }
  openModal("m-filters");
};

window.applyFilters = () => {
  if (window._filterContext === 'cours') {
    window._coursFilter.subject = document.getElementById("filter-subject").value;
    window._coursFilter.order = document.getElementById("filter-order").value;
    closeModal("m-filters");
    loadCoursFeed();
  } else if (window._filterContext === 'quiz') {
    window._quizFilter.subject = document.getElementById("filter-subject").value;
    window._quizFilter.type = document.getElementById("filter-type").value;
    window._quizFilter.order = document.getElementById("filter-order").value;
    closeModal("m-filters");
    loadQuizFeed();
  } else {
    window._frFilter.subject = document.getElementById("filter-subject").value;
    window._frFilter.type = document.getElementById("filter-type").value;
    window._frFilter.order = document.getElementById("filter-order").value;
    closeModal("m-filters");
    loadFRFeed();
  }
};

window.navCarousel = (id, dir) => {
  const el = document.getElementById(`carousel-${id}`);
  if (!el) return;
  const imagesStr = el.getAttribute("data-images") || "[]";
  let images = [];
  try { images = JSON.parse(imagesStr); } catch(e) { return; }
  if (images.length <= 1) return;
  
  let idx = parseInt(el.getAttribute("data-index") || "0", 10);
  idx = (idx + dir + images.length) % images.length;
  el.setAttribute("data-index", idx);
  
  const imgEl = document.getElementById(`carousel-img-${id}`);
  const badgeEl = document.getElementById(`carousel-badge-${id}`);
  if (imgEl) imgEl.src = images[idx];
  if (badgeEl) badgeEl.innerText = `${idx + 1} / ${images.length}`;
};

window.openGalleryModal = (images, index = 0) => {
  if (!images || !images.length) return;
  window._galleryImages = images;
  window._galleryIndex = index;
  updateGalleryDisplay();
  openModal("m-gallery");
};

window.navGallery = (dir, event) => {
  if (event) event.stopPropagation();
  if (window._galleryImages.length <= 1) return;
  window._galleryIndex = (window._galleryIndex + dir + window._galleryImages.length) % window._galleryImages.length;
  updateGalleryDisplay();
};

function updateGalleryDisplay() {
  const imgEl = document.getElementById("gal-img");
  const counterEl = document.getElementById("gal-counter");
  const prevBtn = document.getElementById("gal-prev");
  const nextBtn = document.getElementById("gal-next");
  if (imgEl) imgEl.src = window._galleryImages[window._galleryIndex];
  if (counterEl) {
    counterEl.innerText = window._galleryImages.length > 1 ? `${window._galleryIndex + 1} / ${window._galleryImages.length}` : "";
  }
  if (prevBtn) prevBtn.style.display = window._galleryImages.length > 1 ? "flex" : "none";
  if (nextBtn) nextBtn.style.display = window._galleryImages.length > 1 ? "flex" : "none";
}

window.openReportModal = (id, title, author) => {
  document.getElementById("report-post-id").value = id;
  document.getElementById("report-post-title").value = title;
  document.getElementById("report-post-author").value = author;
  document.getElementById("report-reason").value = "";
  openModal("m-report");
};

window.submitReport = async () => {
  const postId = document.getElementById("report-post-id").value;
  const postTitle = document.getElementById("report-post-title").value;
  const postAuthor = document.getElementById("report-post-author").value;
  const reason = document.getElementById("report-reason").value.trim() || "Aucune raison précisée";
  
  try {
    await addDoc(collection(db, "reports"), {
      postId, postTitle, postAuthor,
      reporterId: currentUser ? currentUser.username : "Anonyme",
      reason, status: "pending",
      timestamp: Date.now()
    });
    closeModal("m-report");
    showToast("Publication signalée à la modération ✓");
  } catch(e) {
    showToast("Erreur lors de l'envoi du signalement.");
  }
};

window.getPostHTML = (p, context) => {
  const pId = p.id;
  const isAdmin = currentUser?.role === "admin" || (currentUser?.subRoles && currentUser.subRoles.includes("admin"));
  const canDel = isAdmin || p.authorId === currentUser?.username;
  const hasLiked = (p.likes || []).includes(currentUser?.username);
  const likeCount = (p.likes || []).length;

  const liveAuthor = window.usersMap.get(p.authorId) || {};
  const liveRole   = liveAuthor.role || p.authorRole || "élève";
  const liveName   = liveAuthor.displayName || p.authorDisplayName || p.authorId;
  const liveAv     = liveAuthor.avatar !== undefined ? liveAuthor.avatar : p.authorAvatar;
  const authorBadge = getBadge(liveAuthor);
  
  const subjIcon = p.type === "annonce" ? "📌" : (window.subjectsMap.get(p.matiere) || "📚");

  const avContent = liveAv ? `<img src="${liveAv}" alt="">` : liveName.split(" ").map(x => x[0]).join("").substring(0, 2).toUpperCase();
  const roleClass = liveRole === "professeur" ? "professeur" : liveRole === "admin" ? "admin" : liveRole === "HS" ? "hs" : "eleve";
  
  const typeLabels = { cours: "Cours", fiches: "Fiche", revisions: "Révisions", annonce: "Annonce Épinglée" };
  const typeLabel  = typeLabels[p.type] || p.type;
  
  const tagBgClass = p.type === "annonce" ? "background:var(--danger);color:#fff;" : "";

  let filesList = [];
  if (p.files && Array.isArray(p.files) && p.files.length > 0) {
    filesList = p.files;
  } else if (p.fileData || p.url) {
    const targetUrl = p.fileData || p.url;
    filesList = [{
      url: targetUrl,
      name: p.fileName || p.title || "Document",
      type: p.fileType || ""
    }];
  }

  const images = [];
  const docs = [];

  filesList.forEach(f => {
    const u = (f.url || "").toLowerCase();
    const t = (f.type || "").toLowerCase();
    const isPDF = t === "application/pdf" || u.endsWith(".pdf");
    const isImg = !isPDF && (t.startsWith("image/") || u.match(/\.(jpeg|jpg|gif|png|webp)$/i) || u.includes("res.cloudinary.com/"));
    if (isImg) {
      images.push(f);
    } else if (f.url) {
      docs.push(f);
    }
  });

  let mediaBox = "";
  if (images.length === 1) {
    const imgUrl = esc(images[0].url);
    mediaBox = `<div class="post-media-preview" onclick="openGalleryModal(['${imgUrl}'], 0)"><img src="${imgUrl}" alt="Aperçu"></div>`;
  } else if (images.length > 1) {
    const imagesList = images.map(i => i.url);
    const imagesJson = esc(JSON.stringify(imagesList));
    mediaBox = `
      <div class="post-carousel" id="carousel-${context}-${pId}" data-index="0" data-images="${imagesJson}" style="position:relative; width:100%; max-height:350px; border-radius:14px; overflow:hidden; background:var(--file-bg); border:1px solid var(--hl); margin-top:4px; display:flex; align-items:center; justify-content:center; user-select:none;">
        <img id="carousel-img-${context}-${pId}" src="${imagesList[0]}" alt="Page 1" style="width:100%; height:100%; max-height:350px; object-fit:contain; cursor:pointer;" onclick="openGalleryModal(${esc(JSON.stringify(imagesList))}, parseInt(document.getElementById('carousel-${context}-${pId}').getAttribute('data-index')||0, 10))">
        <div class="carousel-badge" id="carousel-badge-${context}-${pId}" style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.65); color:#fff; font-size:12px; font-weight:600; padding:4px 10px; border-radius:999px; pointer-events:none; backdrop-filter:blur(4px);">1 / ${imagesList.length}</div>
        <button type="button" class="carousel-btn prev" onclick="event.stopPropagation(); navCarousel('${context}-${pId}', -1)" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); width:36px; height:36px; border-radius:50%; background:rgba(255,255,255,0.85); color:#1d1d1f; font-size:20px; font-weight:700; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.25); border:none; cursor:pointer; transition:0.15s;">‹</button>
        <button type="button" class="carousel-btn next" onclick="event.stopPropagation(); navCarousel('${context}-${pId}', 1)" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); width:36px; height:36px; border-radius:50%; background:rgba(255,255,255,0.85); color:#1d1d1f; font-size:20px; font-weight:700; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.25); border:none; cursor:pointer; transition:0.15s;">›</button>
      </div>`;
  }

  let fileChips = "";
  if (docs.length > 0) {
    fileChips = docs.map(d => {
      const cleanName = d.name || p.title || "Document";
      const isPDF = d.type === "application/pdf" || (d.url || "").toLowerCase().endsWith(".pdf");
      return `
      <div class="file-chip mt-1">
        <div class="file-chip-info" title="${esc(cleanName)}">
          <span style="font-size:22px">${isPDF ? "📄" : "🔗"}</span>
          <span>${cleanName}</span>
        </div>
        <a href="${d.url}" target="_blank" rel="noopener" class="btn-download">📥 Consulter</a>
      </div>`;
    }).join("");
  }

  let comments = p.comments || [];
  let commentsCount = comments.reduce((acc, c) => acc + 1 + (c.replies ? c.replies.length : 0), 0);
  
  comments.sort((a,b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return (a.timestamp || 0) - (b.timestamp || 0);
  });

  let cmtHTML = "";
  comments.forEach(c => {
    const cmtId = c.id || String(c.timestamp); 
    const cmtAuthor = window.usersMap.get(c.userId) || {};
    const cmtName = cmtAuthor.displayName || c.displayName || c.userId;
    const cmtBadge = getBadge(cmtAuthor);
    const canModCmt = isAdmin || currentUser?.username === c.userId || currentUser?.username === p.authorId;
    const canPin = isAdmin || currentUser?.username === p.authorId;
    
    let repliesHTML = "";
    if (c.replies && c.replies.length > 0) {
      c.replies.sort((r1, r2) => (r1.timestamp || 0) - (r2.timestamp || 0)).forEach(r => {
        const rId = r.id || String(r.timestamp);
        const rAuthor = window.usersMap.get(r.userId) || {};
        const rName = rAuthor.displayName || r.displayName || r.userId;
        const rBadge = getBadge(rAuthor);
        const canDelRep = isAdmin || currentUser?.username === r.userId || currentUser?.username === p.authorId;
        
        repliesHTML += `
        <div class="cmt-reply">
          <a href="#${r.userId}" class="cmt-user">${rName}${rBadge}</a> : ${r.text}
          ${canDelRep ? `<div class="cmt-actions"><button class="del" onclick="delCmt('${pId}','${cmtId}','${rId}')">Supprimer</button></div>` : ''}
        </div>`;
      });
    }

    cmtHTML += `
    <div class="cmt-block ${c.isPinned ? 'pinned' : ''}">
      <div class="cmt-header">
        <div class="cmt-row">
          ${c.isPinned ? '📌 ' : ''}<a href="#${c.userId}" class="cmt-user">${cmtName}${cmtBadge}</a> : ${c.text}
        </div>
      </div>
      <div class="cmt-actions">
        <button onclick="toggleReplyBox('${pId}','${cmtId}','${context}')">Répondre</button>
        ${canPin ? `<button onclick="pinCmt('${pId}','${cmtId}')">${c.isPinned ? 'Désépingler' : 'Épingler'}</button>` : ''}
        ${canModCmt ? `<button class="del" onclick="delCmt('${pId}','${cmtId}')">Supprimer</button>` : ''}
      </div>
      ${repliesHTML ? `<div class="cmt-replies">${repliesHTML}</div>` : ''}
      <form class="cmt-form" id="reply-form-${context}-${pId}-${cmtId}" style="display:none;" onsubmit="addReply(event,'${pId}','${cmtId}')">
        <input type="text" placeholder="Répondre..." required>
        <button type="submit" class="cmt-send">Envoyer</button>
      </form>
    </div>`;
  });

  const dateStr = p.timestamp ? new Date(p.timestamp).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Date inconnue";

  return `
    <div class="post-card">
      <div style="display:flex;flex-direction:column;gap:14px;flex:1">
        <div class="post-header">
          <a href="#${p.authorId}" class="post-av">${avContent}</a>
          <div style="flex:1;min-width:0">
            <a href="#${p.authorId}" class="post-author-name">${liveName}${authorBadge}</a>
            <div class="post-meta">
              <span class="rbadge ${roleClass}">${liveRole}</span>
              <span class="type-tag ${p.type}" style="${tagBgClass}">${typeLabel}</span>
              <span class="subj-tag">${subjIcon} ${p.matiere}</span>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            ${canDel ? `<button class="btn-danger btn-sm" onclick="deletePost('${pId}')">Supprimer</button>` : ""}
            <button onclick="openReportModal('${pId}', '${esc(p.title || "Document")}', '${p.authorId}')" style="background:transparent; color:var(--ink-m); font-size:20px; font-weight:bold; cursor:pointer; padding:0 6px; border:none; line-height:1;" title="Signaler la publication">…</button>
          </div>
        </div>
        <div>
          <div class="post-title">${p.title}</div>
          ${p.description ? `<p class="post-desc">${p.description}</p>` : ""}
        </div>
        ${mediaBox}
        ${fileChips}
      </div>
      <div>
        <div class="post-date">Publié le ${dateStr}</div>
        <div class="post-actions">
          <button class="like-btn ${hasLiked ? "liked" : ""}" onclick="toggleLike('${pId}')">
            ${hasLiked ? "❤️" : "🤍"} ${likeCount}
          </button>
          <button class="comment-tog-btn" onclick="toggleComments('${pId}','${context}')">💬 ${commentsCount} commentaires</button>
          <button class="like-btn" onclick="openShareModal('${pId}', 'post', '${esc(p.title)}')">↗️ Partager</button>
        </div>
        <div class="comments-wrap" id="comments-wrap-${context}-${pId}">
          <div class="comments-box">
            ${cmtHTML}
          </div>
          <form class="cmt-form mt-1" onsubmit="addComment(event,'${pId}')">
            <input type="text" placeholder="Ajouter un commentaire…" required>
            <button type="submit" class="cmt-send">Commenter</button>
          </form>
        </div>
      </div>
    </div>`;
};

window.getQuizHTML = (q) => {
  const qId = q.id;
  const isAdmin = currentUser?.role === "admin" || (currentUser?.subRoles && currentUser.subRoles.includes("admin"));
  const canDel = isAdmin || q.authorId === currentUser?.username;

  const liveAuthor = window.usersMap.get(q.authorId) || {};
  const liveRole   = liveAuthor.role || q.authorRole || "élève";
  const liveName   = liveAuthor.displayName || q.authorDisplayName || q.authorId;
  const liveAv     = liveAuthor.avatar !== undefined ? liveAuthor.avatar : q.authorAvatar;
  const authorBadge = getBadge(liveAuthor);
  const subjIcon   = window.subjectsMap.get(q.matiere) || "📚";

  const avContent = liveAv ? `<img src="${liveAv}" alt="">` : liveName.split(" ").map(x => x[0]).join("").substring(0, 2).toUpperCase();
  const roleClass = liveRole === "professeur" ? "professeur" : liveRole === "admin" ? "admin" : liveRole === "HS" ? "hs" : "eleve";
  const dateStr = q.timestamp ? new Date(q.timestamp).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "Inconnue";

  const hasLiked = (q.likes || []).includes(currentUser?.username);
  const likeCount = (q.likes || []).length;

  return `
    <div class="quiz-card">
      <div class="post-header">
        <a href="#${q.authorId}" class="post-av">${avContent}</a>
        <div style="flex:1;min-width:0">
          <a href="#${q.authorId}" class="post-author-name">${liveName}${authorBadge}</a>
          <div class="post-meta">
            <span class="rbadge ${roleClass}">${liveRole}</span>
            <span class="subj-tag">${subjIcon} ${q.matiere}</span>
            <span class="type-tag" style="background:var(--primary); color:#fff;">${q.isAI ? 'Quiz IA' : 'Quiz'}</span>
          </div>
        </div>
        ${canDel ? `<button class="btn-danger btn-sm" onclick="${q.isAI ? 'deleteAIQuiz' : 'deleteQuiz'}('${qId}')">Supprimer</button>` : ""}
      </div>
      <div>
        <div class="post-title">${q.title}</div>
        ${q.description ? `<p class="post-desc">${q.description}</p>` : ""}
        <div class="caption mt-1">${(q.questions || []).length} questions • Créé le ${dateStr} • <strong>Fait par ${q.attemptsCount || 0} personne(s)</strong></div>
      </div>
      <div class="post-actions" style="margin-top: 8px; border-top: 1px solid var(--hl); padding-top: 12px;">
        <button class="like-btn ${hasLiked ? 'liked' : ''}" onclick="toggleQuizLike('${qId}', ${q.isAI})">
          ${hasLiked ? '❤️' : '🤍'} ${likeCount}
        </button>
        <button class="like-btn" onclick="openShareModal('${qId}', '${q.isAI ? 'ai_quiz' : 'quiz'}', '${esc(q.title)}')">↗️ Partager</button>
      </div>
      <button class="btn-pill mt-1" style="justify-content:center; width:100%;" onclick="checkAndStartQuiz('${qId}', ${q.isAI})">Commencer le quiz</button>
    </div>`;
};

function loadPinnedAnnonces() {
  if (window._pinnedUnsub) { window._pinnedUnsub(); window._pinnedUnsub = null; }
  const zone = document.getElementById("pinned-annonces-zone");
  if (!zone) return;
  
  const qPinned = query(collection(db, "posts"), where("type", "==", "annonce"));
  window._pinnedUnsub = onSnapshot(qPinned, snap => {
    if (snap.empty) {
      zone.innerHTML = "";
      return;
    }
    let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    docs.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    let html = `<div class="pinned-post-wrapper">
                  <h3 style="margin-bottom:16px; color:var(--ink); display:flex; align-items:center; gap:8px;">📌 Annonces Épinglées</h3>
                  <div style="display:flex; flex-direction:column; gap:16px;">`;
    docs.forEach(p => {
      html += window.getPostHTML(p, "pinned");
    });
    html += `</div></div>`;
    zone.innerHTML = html;
  });
}

function loadCoursFeed() {
  if (window._coursUnsub) { window._coursUnsub(); window._coursUnsub = null; }
  
  const container = document.getElementById("cours-feed"); 
  if (!container) return;
  
  container.innerHTML = `<div style="display:flex;justify-content:center;grid-column:1/-1;padding:40px"><div class="spinner"></div></div>`;
  
  const q = window._coursFilter.subject === "all"
    ? query(collection(db, "posts"), where("type", "==", "cours"))
    : query(collection(db, "posts"), where("matiere", "==", window._coursFilter.subject), where("type", "==", "cours"));
    
  window._coursUnsub = onSnapshot(q, snap => {
    let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const canSeeHS = currentUser && (currentUser.role === "admin" || currentUser.role === "HS" || (currentUser.subRoles && currentUser.subRoles.includes("admin")));
    if (!canSeeHS) {
      docs = docs.filter(p => p.authorRole !== "HS");
    }
    renderFeedFromDocs(docs, container, "Aucun cours disponible pour le moment", window._coursFilter.order, "cours");
  });
}

function loadFRFeed() {
  if (window._frUnsub) { window._frUnsub(); window._frUnsub = null; }
  
  const container = document.getElementById("fr-feed"); 
  if (!container) return;
  
  container.innerHTML = `<div style="display:flex;justify-content:center;grid-column:1/-1;padding:40px"><div class="spinner"></div></div>`;
  
  const types = window._frFilter.type === "all" ? ["fiches", "revisions"] : [window._frFilter.type];
  let q;
  
  if (window._frFilter.subject === "all") {
    q = types.length > 1 ? query(collection(db, "posts"), where("type", "in", types)) : query(collection(db, "posts"), where("type", "==", types[0]));
  } else {
    q = types.length > 1 ? query(collection(db, "posts"), where("matiere", "==", window._frFilter.subject), where("type", "in", types)) : query(collection(db, "posts"), where("matiere", "==", window._frFilter.subject), where("type", "==", types[0]));
  }
  
  window._frUnsub = onSnapshot(q, snap => {
    let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const canSeeHS = currentUser && (currentUser.role === "admin" || currentUser.role === "HS" || (currentUser.subRoles && currentUser.subRoles.includes("admin")));
    if (!canSeeHS) {
      docs = docs.filter(p => p.authorRole !== "HS");
    }
    renderFeedFromDocs(docs, container, "Aucune fiche ni révision pour le moment", window._frFilter.order, "fr");
  });
}

function renderFeedFromDocs(postsArray, container, emptyMsg, sortOrder = 'recent', context = 'main') {
  container.innerHTML = "";
  if (postsArray.length === 0) {
    container.innerHTML = `<div class="empty-text">${emptyMsg || "Aucune ressource pour l'instant"}</div>`; 
    return;
  }

  if (sortOrder === 'likes') {
    postsArray.sort((a,b) => (b.likes || []).length - (a.likes || []).length);
  } else if (sortOrder === 'oldest') {
    postsArray.sort((a,b) => (a.timestamp || 0) - (b.timestamp || 0));
  } else {
    postsArray.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
  }

  postsArray.forEach(p => {
    container.innerHTML += window.getPostHTML(p, context);
  });
}

function loadAnnonces() {
  const isAdmin = currentUser.role === "admin" || (currentUser.subRoles && currentUser.subRoles.includes("admin"));
  const zone = document.getElementById("annonces-zone"); 
  if (!zone) return;

  onSnapshot(collection(db, "annonces"), (snap) => {
    const titleRow = `
    <div class="ann-section-title">
      📢 Annonces
      ${isAdmin ? `<button class="btn-pill-van btn-sm" onclick="openAnnonceModal('')">+ Nouvelle annonce</button>` : ""}
    </div>`;
    
    if (snap.empty) {
      zone.innerHTML = isAdmin ? titleRow + `<div class="empty-text">Aucune petite annonce pour le moment</div>` : ""; 
      return;
    }
    
    let cards = "";
    snap.docs.sort((a,b) => (b.data().timestamp || 0) - (a.data().timestamp || 0)).forEach(d => {
      const a = d.data();
      cards += `
      <div class="ann-card">
        <div class="ann-card-title">${a.title}</div>
        <div class="ann-card-body">${a.body || ""}</div>
        ${isAdmin ? `<div class="ann-actions"><button class="btn-ghost btn-sm" onclick="openAnnonceModal('${d.id}','${esc(a.title)}','${esc(a.body || '')}')">Modifier</button><button class="btn-danger btn-sm" onclick="delAnnonce('${d.id}')">Supprimer</button></div>` : ""}
      </div>`;
    });
    zone.innerHTML = titleRow + `<div style="display:flex;flex-direction:column;gap:12px;grid-column:1/-1">${cards}</div>`;
  });
}

window.openAnnonceModal = (id, title = "", body = "") => {
  document.getElementById("m-ann-title").innerText = id ? "Modifier l'annonce" : "Nouvelle annonce";
  document.getElementById("ann-edit-id").value = id; 
  document.getElementById("ann-title").value = title; 
  document.getElementById("ann-body").value = body;
  openModal("m-ann");
};

window.saveAnnonce = async () => {
  const id = document.getElementById("ann-edit-id").value;
  const title = document.getElementById("ann-title").value.trim();
  const body = document.getElementById("ann-body").value.trim();
  
  if (!title) {
    showToast("Titre requis.");
    return;
  }
  
  if (id) {
    await updateDoc(doc(db, "annonces", id), { title, body }); 
  } else {
    await addDoc(collection(db, "annonces"), { title, body, timestamp: Date.now() });
  }
  
  closeModal("m-ann"); 
  showToast("Annonce publiée ✓");
};

window.delAnnonce = async (id) => {
  if (confirm("Supprimer cette annonce ?")) await deleteDoc(doc(db, "annonces", id));
};

window.handleFileSelect = (e) => {
  const files = Array.from(e.target.files || []); 
  if (!files.length) return;
  
  if (files.length > 5) {
    showToast("Maximum 5 fichiers autorisés par document.");
    e.target.value = "";
    window._uploadedFiles = [];
    document.getElementById("file-prev").style.display = "none";
    return;
  }

  let totalSize = 0;
  files.forEach(f => totalSize += f.size);
  if (totalSize > 25 * 1024 * 1024) {
    e.target.value = ""; 
    window._uploadedFiles = []; 
    document.getElementById("file-prev").style.display = "none"; 
    openModal("m-filesize"); 
    return;
  }
  
  window._uploadedFiles = files;
  const bar = document.getElementById("file-prev"); 
  bar.style.display = "flex";
  
  document.getElementById("file-prev-name").innerText = `${files.length} fichier(s) sélectionné(s)`;
  document.getElementById("file-prev-icon").innerText = "📁"; 
  
  const listDiv = document.getElementById("file-prev-list");
  if (listDiv) {
    listDiv.innerHTML = files.map(f => `<div>• ${f.name} (${(f.size/1024/1024).toFixed(2)} Mo)</div>`).join("");
  }
  document.getElementById("post-url").value = "";
};

window.clearFile = () => {
  window._uploadedFiles = []; 
  document.getElementById("post-file").value = ""; 
  document.getElementById("file-prev").style.display = "none";
};

window.handlePostTypeChange = () => {
  const type = document.getElementById("post-type").value;
  const matiereGroup = document.getElementById("group-post-matiere");
  if (type === "annonce") {
    matiereGroup.style.display = "none";
  } else {
    matiereGroup.style.display = "flex";
  }
};

window.handleCreatePost = async () => {
  const title = document.getElementById("post-title").value.trim();
  const type = document.getElementById("post-type").value;
  
  let matiere = "Annonces";
  if (type !== "annonce") {
    matiere = document.getElementById("post-matiere").value;
    if (!matiere) {
      showToast("Matière requise.");
      return;
    }
  }
  
  const desc = document.getElementById("post-desc").value.trim();
  const urlInput = document.getElementById("post-url").value.trim();
  
  if (!title) {
    showToast("Titre requis.");
    return;
  }

  let filesArray = [];
  if (window._uploadedFiles && window._uploadedFiles.length > 0) {
    const btn = document.querySelector('[onclick="handleCreatePost()"]'); 
    if (btn) { btn.disabled = true; btn.innerText = "Upload des fichiers en cours…"; }
    
    try {
      for (const file of window._uploadedFiles) {
        const fileUrl = await uploadToCloudinary(file);
        filesArray.push({
          url: fileUrl,
          name: file.name,
          type: file.type
        });
      }
    } catch (err) {
      showToast("Erreur lors de l'upload Cloudinary."); 
      if (btn) { btn.disabled = false; btn.innerText = "Partager avec la classe"; } 
      return;
    }
    
    if (btn) { btn.disabled = false; btn.innerText = "Partager avec la classe"; }
  } else if (urlInput) {
    filesArray.push({
      url: urlInput,
      name: "Lien externe",
      type: "link"
    });
  }

  const firstFile = filesArray[0] || {};
  const post = {
    title, matiere, type, description: desc,
    files: filesArray,
    fileData: firstFile.url || "",
    fileName: firstFile.name || "",
    fileType: firstFile.type || "",
    url: firstFile.url || urlInput || "",
    authorId: currentUser.username,
    authorDisplayName: currentUser.displayName || currentUser.username,
    authorAvatar: currentUser.avatar || "",
    authorRole: currentUser.role || "élève",
    likes: [], comments: [], timestamp: Date.now()
  };

  try {
    await addDoc(collection(db, "posts"), post);
    
    document.getElementById("post-title").value = ""; 
    document.getElementById("post-desc").value = ""; 
    document.getElementById("post-url").value = ""; 
    clearFile(); 
    syncContrib(); 
    showToast("Partagé avec la classe ✓");
    
    if (currentUser.followers && currentUser.followers.length > 0) {
       currentUser.followers.forEach(uname => {
         const fUser = window.usersMap.get(uname);
         if (fUser) sendEmailNotif('post', fUser);
       });
    }

    if (type === "cours") switchTab('cours'); 
    else if (type === "annonce") switchTab('accueil');
    else switchTab('fichesrev');
    
  } catch(e) { 
    showToast("Erreur d'envoi."); 
  }
};

const dz = document.getElementById("drop-zone");
if (dz) {
  dz.addEventListener("dragover", e => { e.preventDefault(); dz.style.borderColor = "var(--primary)"; });
  dz.addEventListener("dragleave", () => { dz.style.borderColor = ""; });
  dz.addEventListener("drop", e => {
    e.preventDefault(); 
    dz.style.borderColor = ""; 
    const files = e.dataTransfer.files;
    if (files && files.length > 0) { 
      const inp = document.getElementById("post-file");
      inp.files = files; 
      handleFileSelect({ target: inp }); 
    }
  });
}

window.toggleLike = async (postId) => {
  const ref = doc(db, "posts", postId);
  const snap = await getDoc(ref); 
  if (!snap.exists()) return;
  
  let likes = snap.data().likes || [];
  if (likes.includes(currentUser.username)) {
    likes = likes.filter(u => u !== currentUser.username); 
  } else {
    likes.push(currentUser.username);
  }
  
  await updateDoc(ref, { likes });
};

window.toggleQuizLike = async (quizId, isAI) => {
  const colName = isAI ? "ai_quizzes" : "quizzes";
  const ref = doc(db, colName, quizId);
  const snap = await getDoc(ref); 
  if (!snap.exists()) return;
  
  let likes = snap.data().likes || [];
  if (likes.includes(currentUser.username)) {
    likes = likes.filter(u => u !== currentUser.username); 
  } else {
    likes.push(currentUser.username);
  }
  
  await updateDoc(ref, { likes });
};

window.toggleComments = (postId, context = 'main') => {
  const wrp = document.getElementById(`comments-wrap-${context}-${postId}`);
  if (wrp) wrp.classList.toggle('show');
};

window.toggleReplyBox = (postId, cmtId, context = 'main') => {
  const f = document.getElementById(`reply-form-${context}-${postId}-${cmtId}`);
  if (f) f.style.display = f.style.display === 'none' ? 'flex' : 'none';
};

function generateId() { return Date.now().toString() + Math.random().toString(36).substr(2, 5); }

window.addComment = async (e, postId) => {
  e.preventDefault(); 
  const input = e.target.querySelector("input");
  const txt = input.value.trim(); 
  if (!txt) return;
  
  const ref = doc(db, "posts", postId);
  const snap = await getDoc(ref); 
  if (!snap.exists()) return;
  
  const comments = snap.data().comments || [];
  comments.push({ id: generateId(), userId: currentUser.username, displayName: currentUser.displayName || currentUser.username, text: txt, timestamp: Date.now(), isPinned: false, replies: [] });
  
  await updateDoc(ref, { comments }); 
  input.value = "";
};

window.addReply = async (e, postId, cmtId) => {
  e.preventDefault(); 
  const input = e.target.querySelector("input");
  const txt = input.value.trim(); 
  if (!txt) return;
  
  const ref = doc(db, "posts", postId);
  const snap = await getDoc(ref); 
  if (!snap.exists()) return;
  
  const comments = snap.data().comments || [];
  const idx = comments.findIndex(c => c.id === cmtId || String(c.timestamp) === cmtId);
  
  if (idx > -1) {
    if (!comments[idx].replies) comments[idx].replies = [];
    comments[idx].replies.push({ id: generateId(), userId: currentUser.username, displayName: currentUser.displayName || currentUser.username, text: txt, timestamp: Date.now() });
    await updateDoc(ref, { comments }); 
    input.value = "";
  }
};

window.delCmt = async (postId, cmtId, replyId = null) => {
  if (!confirm("Supprimer ce commentaire ?")) return;
  
  const ref = doc(db, "posts", postId);
  const snap = await getDoc(ref); 
  if (!snap.exists()) return;
  
  let comments = snap.data().comments || [];
  
  if (replyId) {
    const cIdx = comments.findIndex(c => c.id === cmtId || String(c.timestamp) === cmtId);
    if (cIdx > -1 && comments[cIdx].replies) {
       comments[cIdx].replies = comments[cIdx].replies.filter(r => r.id !== replyId && String(r.timestamp) !== replyId);
    }
  } else {
    comments = comments.filter(c => c.id !== cmtId && String(c.timestamp) !== cmtId);
  }
  
  await updateDoc(ref, { comments });
};

window.pinCmt = async (postId, cmtId) => {
  const ref = doc(db, "posts", postId);
  const snap = await getDoc(ref); 
  if (!snap.exists()) return;
  
  let comments = snap.data().comments || [];
  const idx = comments.findIndex(c => c.id === cmtId || String(c.timestamp) === cmtId);
  
  if (idx > -1) {
    comments[idx].isPinned = !comments[idx].isPinned;
    await updateDoc(ref, { comments });
  }
};

window.deletePost = async (id) => { if (confirm("Supprimer ce document ?")) await deleteDoc(doc(db, "posts", id)); };
window.deleteQuiz = async (id) => { if (confirm("Supprimer ce quiz ?")) await deleteDoc(doc(db, "quizzes", id)); };
window.deleteAIQuiz = async (id) => { if (confirm("Supprimer ce quiz IA ?")) await deleteDoc(doc(db, "ai_quizzes", id)); loadAIQuizHistory(); };

window.openShareModal = (itemId, itemType, itemTitle) => {
  window._shareItem = { id: itemId, type: itemType, title: itemTitle };
  const q = query(collection(db, "dm_chats"), where("participants", "array-contains", currentUser.username));
  
  getDocs(q).then(snap => {
    let html = "";
    snap.docs.sort((a,b) => (b.data().lastTimestamp || 0) - (a.data().lastTimestamp || 0)).forEach(d => {
      const c = d.data();
      const partnerUname = c.participants.find(u => u !== currentUser.username);
      const pUser = window.usersMap.get(partnerUname) || {displayName: partnerUname, username: partnerUname};
      
      const avHtml = pUser.avatar 
        ? `<img src="${pUser.avatar}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;">` 
        : `<div class="drawer-av" style="width:38px;height:38px;flex-shrink:0;">${(pUser.displayName || pUser.username).substring(0,2).toUpperCase()}</div>`;

      html += `
        <div class="follow-user-row" onclick="shareToChat('${d.id}', '${partnerUname}')" style="display:flex; align-items:center; gap:12px; cursor:pointer;">
           ${avHtml}
           <div style="flex:1;min-width:0;">
               <div style="font-weight:600;font-size:15px;color:var(--ink);">${pUser.displayName || pUser.username}</div>
               <div style="font-size:13px;color:var(--ink-m);">@${partnerUname}</div>
           </div>
        </div>
      `;
    });
    if (!html) html = "<div class='empty-text'>Aucune discussion récente. Va dans Messages pour en créer une.</div>";
    document.getElementById("share-contacts-list").innerHTML = html;
    openModal('m-share');
  });
};

window.shareToChat = async (chatId, partnerUname) => {
  if (!window._shareItem) return;
  
  await addDoc(collection(db, "dm_messages"), {
    chatId: chatId,
    senderId: currentUser.username,
    text: "", 
    fileUrl: "",
    sharedItemId: window._shareItem.id,
    sharedItemType: window._shareItem.type,
    sharedItemTitle: window._shareItem.title,
    timestamp: Date.now()
  });

  await updateDoc(doc(db, "dm_chats", chatId), {
    lastMessage: `Partage : ${window._shareItem.title.substring(0, 20)}...`,
    lastTimestamp: Date.now(),
    lastSenderId: currentUser.username,
    readBy: [currentUser.username]
  });

  closeModal('m-share');
  showToast("Partagé avec succès ✓");
  
  const pUser = window.usersMap.get(partnerUname);
  if (pUser) sendEmailNotif('message', pUser);
};

window.openSharedItem = async (id, type) => {
  if (type === 'quiz') {
    checkAndStartQuiz(id, false);
  } else if (type === 'ai_quiz') {
    checkAndStartQuiz(id, true);
  } else if (type === 'post') {
    const snap = await getDoc(doc(db, "posts", id));
    if (!snap.exists()) {
      showToast("Ce document n'existe plus ou a été supprimé.");
      return;
    }
    const p = { id: snap.id, ...snap.data() };
    const html = window.getPostHTML(p, 'shared');
    document.getElementById("view-post-content").innerHTML = html;
    openModal("m-view-post");
  }
};


window.switchPubTab = (tabId) => {
  window._pubTabActive = tabId;
  document.querySelectorAll('#pub-tiktok-tabs .tk-tab').forEach(b => b.classList.remove('active'));
  document.querySelector(`#pub-tiktok-tabs .tk-tab[data-ptab="${tabId}"]`).classList.add('active');
  
  document.querySelectorAll('.pub-tab-content').forEach(c => c.style.display = 'none');
  document.getElementById(`pub-tab-${tabId}`).style.display = 'block';

  const fContainer = document.getElementById("pub-filter-container");
  if (tabId === 'cours' || tabId === 'quiz') fContainer.style.display = 'block';
  else fContainer.style.display = 'none';

  if (window._currentViewedUser) renderPublicProfile(window._currentViewedUser.username);
  if (tabId === 'likes') renderPubLikes();
};

function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag]));
}

window.renderPublicProfile = (uname) => {
  document.querySelectorAll(".page-view").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach(b => b.classList.remove("active"));
  
  const pubPage = document.getElementById("page-pub-profil");
  if (pubPage) {
    pubPage.classList.remove("active");
    void pubPage.offsetWidth; 
    pubPage.classList.add("active");
  }
  
  const loading = document.getElementById("pub-loading-overlay");
  const wrapper = document.getElementById("pub-content-wrapper");
  loading.style.display = "flex";
  wrapper.style.display = "none";
  window.scrollTo({ top: 0, behavior: "smooth" });

  setTimeout(() => {
    const targetUser = window.usersMap.get(uname);
    if (!targetUser) { 
      loading.style.display = "none"; 
      showToast("Membre introuvable"); 
      window.location.hash = "#page-accueil"; 
      return; 
    }

    loading.style.display = "none";
    wrapper.style.display = "block";

    window._currentViewedUser = targetUser;

    document.getElementById("pub-banner").style.backgroundImage = targetUser.banner ? `url('${targetUser.banner}')` : "";

    const imgEl = document.getElementById("pub-av-img"), initEl = document.getElementById("pub-av-init");
    if (targetUser.avatar) {
      imgEl.src = targetUser.avatar; 
      imgEl.style.display = "block"; 
      initEl.style.display = "none";
    } else {
      imgEl.style.display = "none"; 
      initEl.style.display = "block";
      initEl.innerText = (targetUser.displayName || targetUser.username).split(" ").map(x => x[0]).join("").substring(0, 2).toUpperCase();
    }

    const badge = getBadge(targetUser);
    document.getElementById("pub-name").innerHTML = (targetUser.displayName || targetUser.username) + badge;

    document.getElementById("pub-id").innerText   = targetUser.username;
    
    let bioContent = targetUser.bio || "Aucune biographie.";
    const isAdmin = targetUser.role === "admin" || (targetUser.subRoles && targetUser.subRoles.includes("admin"));
    
    if (isAdmin && bioContent !== "Aucune biographie.") {
        bioContent = escapeHTML(bioContent);
        bioContent = bioContent.replace(/@([a-zA-Z0-9._]+)/g, '<a style="color:var(--primary); font-weight:600; text-decoration:none;" href="#$1">@$1</a>');
        document.getElementById("pub-bio").innerHTML = bioContent;
    } else {
        document.getElementById("pub-bio").innerText = bioContent;
    }

    const roleEl = document.getElementById("pub-role"); 
    roleEl.innerText = targetUser.role || "élève";
    roleEl.className = "rbadge " + (targetUser.role === "professeur" ? "professeur" : targetUser.role === "admin" ? "admin" : targetUser.role === "HS" ? "hs" : "eleve");

    const fakesCount = targetUser.fakeFollowersCount !== undefined ? targetUser.fakeFollowersCount : (targetUser.fakeFollowers || []).length;
    const realsCount = (targetUser.followers || []).length;

    document.getElementById("pub-cnt-followers").innerText = window.formatNumber(realsCount + fakesCount);
    document.getElementById("pub-cnt-following").innerText = window.formatNumber((targetUser.following || []).length);

    const socBox = document.getElementById("pub-socials"); 
    socBox.innerHTML = "";
    if (targetUser.instagram) {
      const cleanInsta = targetUser.instagram.replace("https://instagram.com/", "").replace("https://www.instagram.com/", "").replace("@", "").trim();
      socBox.innerHTML += `<a href="https://instagram.com/${cleanInsta}" target="_blank" class="soc-pill insta"><svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><rect x="2" y="2" width="20" height="20" rx="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg><span>${cleanInsta}</span></a>`;
    }
    if (targetUser.linkedin) {
      const cleanLd = targetUser.linkedin.startsWith("http") ? targetUser.linkedin : "https://" + targetUser.linkedin;
      socBox.innerHTML += `<a href="${cleanLd}" target="_blank" class="soc-pill linkedin"><svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg><span>LinkedIn</span></a>`;
    }
    if (targetUser.tiktok) {
      const cleanTk = targetUser.tiktok.replace("https://tiktok.com/", "").replace("https://www.tiktok.com/", "").replace("@", "").trim();
      socBox.innerHTML += `<a href="https://tiktok.com/@${cleanTk}" target="_blank" class="soc-pill tiktok"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91 0 .73 1.5 1.93 2.7 3.44 3.26v4.06c-1.33-.28-2.58-.93-3.56-1.87-.01 2.21-.01 4.41-.02 6.62-.2 2.6-1.6 5.06-3.86 6.36-2.6 1.5-5.91 1.25-8.15-.65-2.07-1.77-2.98-4.66-2.22-7.25.75-2.52 2.87-4.46 5.48-4.93v4.25c-1.2.29-2.23 1.16-2.6 2.37-.38 1.25.04 2.65 1.05 3.44 1.1.84 2.7.93 3.9.23 1.15-.67 1.83-1.89 1.83-3.21.02-4.8.02-9.6.02-14.4 0-.01-.01-.02-.02-.03z"/></svg><span>${cleanTk}</span></a>`;
    }

    const followBtn = document.getElementById("pub-follow-btn");
    if (currentUser && targetUser.username === currentUser.username) followBtn.style.display = "none";
    else {
      followBtn.style.display = "inline-flex";
      if ((currentUser?.following || []).includes(targetUser.username)) { 
        followBtn.innerText = "Abonné ✓"; 
        followBtn.className = "btn-pill btn-following"; 
      } else { 
        followBtn.innerText = "S'abonner"; 
        followBtn.className = "btn-pill"; 
      }
    }

    if (window._pubFeedUnsub) { window._pubFeedUnsub(); window._pubFeedUnsub = null; }
    
    if (window._pubTabActive === 'cours') {
      const qFeed = query(collection(db, "posts"), where("authorId", "==", targetUser.username));
      window._pubFeedUnsub = onSnapshot(qFeed, snapFeed => {
        const rawDocs = snapFeed.docs.map(d => ({ id: d.id, ...d.data() }));
        document.getElementById("pub-cnt-contribs-top").innerText = rawDocs.length;

        const userMats = [...new Set(rawDocs.map(p => p.matiere))].sort();
        let filterBarHtml = `<button class="filter-btn ${window._pubSubjFilter === 'all' ? 'active' : ''}" onclick="setPubSubjFilter('all',this)">Tout (${rawDocs.length})</button>`;
        userMats.forEach(mName => {
          const icon = window.subjectsMap.get(mName) || "📚";
          const cnt = rawDocs.filter(p => p.matiere === mName).length;
          filterBarHtml += `<button class="filter-btn ${window._pubSubjFilter === mName ? 'active' : ''}" onclick="setPubSubjFilter('${esc(mName)}',this)">${icon} ${mName} (${cnt})</button>`;
        });
        document.getElementById("pub-subj-filter-bar").innerHTML = filterBarHtml;

        const filteredDocs = window._pubSubjFilter === 'all' ? rawDocs : rawDocs.filter(p => p.matiere === window._pubSubjFilter);
        renderFeedFromDocs(filteredDocs, document.getElementById("pub-feed"), "Aucun document partagé pour ce filtre.", 'recent', 'pubfeed');
      });
    } else if (window._pubTabActive === 'quiz') {
      const qFeed = query(collection(db, "quizzes"), where("authorId", "==", targetUser.username));
      window._pubFeedUnsub = onSnapshot(qFeed, snapFeed => {
        const rawDocs = snapFeed.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const userMats = [...new Set(rawDocs.map(p => p.matiere))].sort();
        let filterBarHtml = `<button class="filter-btn ${window._pubSubjFilter === 'all' ? 'active' : ''}" onclick="setPubSubjFilter('all',this)">Tout (${rawDocs.length})</button>`;
        userMats.forEach(mName => {
          const icon = window.subjectsMap.get(mName) || "📚";
          const cnt = rawDocs.filter(p => p.matiere === mName).length;
          filterBarHtml += `<button class="filter-btn ${window._pubSubjFilter === mName ? 'active' : ''}" onclick="setPubSubjFilter('${esc(mName)}',this)">${icon} ${mName} (${cnt})</button>`;
        });
        document.getElementById("pub-subj-filter-bar").innerHTML = filterBarHtml;

        const filteredDocs = window._pubSubjFilter === 'all' ? rawDocs : rawDocs.filter(p => p.matiere === window._pubSubjFilter);
        renderQuizFeedToContainer(filteredDocs, document.getElementById("pub-quiz-feed"), "Aucun quiz partagé pour ce filtre.");
      });
    } else if (window._pubTabActive === 'quiz-ia') {
      const qFeed = query(collection(db, "ai_quizzes"), where("authorId", "==", targetUser.username));
      window._pubFeedUnsub = onSnapshot(qFeed, snapFeed => {
        const rawDocs = snapFeed.docs.map(d => ({ id: d.id, ...d.data() }));
        renderQuizFeedToContainer(rawDocs, document.getElementById("pub-quiz-ia-feed"), "Aucun quiz IA généré pour l'instant.");
      });
    } else if (window._pubTabActive === 'likes') {
      loadPubLikes();
    }
  }, 100);
};

window.setPubSubjFilter = (val, btn) => {
  window._pubSubjFilter = val;
  document.querySelectorAll("#pub-subj-filter-bar .filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  if (window._currentViewedUser) renderPublicProfile(window._currentViewedUser.username);
};

window.loadPubLikes = () => {
  if (!window._currentViewedUser) return;
  if (window._pubLikesUnsubPosts) { window._pubLikesUnsubPosts(); }
  if (window._pubLikesUnsubQuizzes) { window._pubLikesUnsubQuizzes(); }
  if (window._pubLikesUnsubAIQuizzes) { window._pubLikesUnsubAIQuizzes(); }

  const uname = window._currentViewedUser.username;
  window._pubLikesData = { posts: [], quizzes: [], ai_quizzes: [] };

  document.getElementById("pub-likes-feed").innerHTML = `<div style="display:flex;justify-content:center;grid-column:1/-1;padding:40px"><div class="spinner"></div></div>`;

  const triggerRender = () => {
    if (window._pubTabActive === 'likes') renderPubLikes();
  };

  const qPosts = query(collection(db, "posts"), where("likes", "array-contains", uname));
  window._pubLikesUnsubPosts = onSnapshot(qPosts, snap => {
    window._pubLikesData.posts = snap.docs.map(d => ({ id: d.id, _feedType: 'post', ...d.data() }));
    triggerRender();
  });

  const qQuizzes = query(collection(db, "quizzes"), where("likes", "array-contains", uname));
  window._pubLikesUnsubQuizzes = onSnapshot(qQuizzes, snap => {
    window._pubLikesData.quizzes = snap.docs.map(d => ({ id: d.id, _feedType: 'quiz', ...d.data() }));
    triggerRender();
  });

  const qAIQuizzes = query(collection(db, "ai_quizzes"), where("likes", "array-contains", uname));
  window._pubLikesUnsubAIQuizzes = onSnapshot(qAIQuizzes, snap => {
    window._pubLikesData.ai_quizzes = snap.docs.map(d => ({ id: d.id, _feedType: 'quiz', ...d.data() }));
    triggerRender();
  });
};

window.renderPubLikes = () => {
  const sortOrder = document.getElementById("pub-likes-sort").value;
  
  const rawDocs = [
    ...window._pubLikesData.posts,
    ...window._pubLikesData.quizzes,
    ...window._pubLikesData.ai_quizzes
  ];

  const container = document.getElementById("pub-likes-feed");
  container.innerHTML = "";

  if (rawDocs.length === 0) {
    container.innerHTML = `<div class="empty-text">Aucun document ou quiz aimé pour le moment.</div>`;
    return;
  }

  if (sortOrder === 'oldest') {
    rawDocs.sort((a,b) => (a.timestamp || 0) - (b.timestamp || 0));
  } else {
    rawDocs.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
  }

  rawDocs.forEach(item => {
    if (item._feedType === 'post') {
      container.innerHTML += window.getPostHTML(item, 'publikes');
    } else {
      container.innerHTML += window.getQuizHTML(item);
    }
  });
};

window.toggleFollowCurrentProfile = async () => {
  if (!window._currentViewedUser || !currentUser) return;
  const targetUname = window._currentViewedUser.username; 
  if (targetUname === currentUser.username) return;
  
  const targetDoc = window.usersMap.get(targetUname); 
  if (!targetDoc) return;

  let myFollowing = [...(currentUser.following || [])], theirFollowers = [...(targetDoc.followers || [])];
  const isFollowing = myFollowing.includes(targetUname);

  if (isFollowing) {
    myFollowing = myFollowing.filter(x => x !== targetUname); 
    theirFollowers = theirFollowers.filter(x => x !== currentUser.username);
  } else {
    myFollowing.push(targetUname); 
    theirFollowers.push(currentUser.username);
  }

  currentUser.following = myFollowing; 
  localStorage.setItem("dnb_reviz_session", JSON.stringify(currentUser));
  
  const fBtn = document.getElementById("pub-follow-btn");
  if (fBtn) { 
    if (!isFollowing) {
      fBtn.innerText = "Abonné ✓";
      fBtn.className = "btn-pill btn-following"; 
    } else {
      fBtn.innerText = "S'abonner";
      fBtn.className = "btn-pill";
    } 
  }

  await Promise.all([
    updateDoc(doc(db, "users", currentUser.id), { following: myFollowing }), 
    updateDoc(doc(db, "users", targetDoc.id), { followers: theirFollowers })
  ]);
};

window.openFollowersModal = (mode) => {
  if (!window._currentViewedUser) return;
  const isFollowers = mode === 'followers';
  document.getElementById("m-follows-title").innerText = isFollowers ? "Abonnés" : "Abonnements";
  
  const box = document.getElementById("follows-list-box"); 
  box.innerHTML = "";
  
  const realUsernames = isFollowers ? (window._currentViewedUser.followers || []) : (window._currentViewedUser.following || []);
  let fullList = realUsernames.map(u => window.usersMap.get(u)).filter(Boolean);

  if (isFollowers && window._currentViewedUser.fakeFollowers) {
    fullList = [...fullList, ...window._currentViewedUser.fakeFollowers];
  }

  const totalAvailable = fullList.length;
  fullList = fullList.slice(0, 50);

  if (fullList.length === 0) {
    box.innerHTML = `<div class="empty-text" style="padding:40px 0">Personne ici</div>`;
  } else {
    fullList.forEach(u => {
      const nameDisp = u.displayName || u.username;
      const roleDisp = u.role || "élève";
      const avHtml = u.avatar ? `<img src="${u.avatar}" style="display:block;">` : `<span style="display:block">${nameDisp.split(" ").map(x => x[0]).join("").substring(0, 2).toUpperCase()}</span>`;
      const badge = getBadge(u);
      
      box.innerHTML += `
      <div class="follow-user-row" onclick="if(!'${u.isFake || ''}'){ window.location.hash='#${esc(u.username)}'; closeModal('m-follows'); }">
        <div class="drawer-av" style="flex-shrink:0">${avHtml}</div>
        <div style="min-width:0;flex:1">
          <div style="font-weight:600;font-size:15px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${nameDisp}${badge}</div>
          <div style="font-size:13px;color:var(--ink-m)">@${u.username} • <span style="text-transform:capitalize">${roleDisp}</span></div>
        </div>
      </div>`;
    });
    if (totalAvailable > 50) {
      box.innerHTML += `<div style="text-align:center; padding: 12px; font-size:13px; color:var(--ink-m); margin-top:8px; border-top: 1px solid var(--hl);">L'affichage est limité aux 50 premiers pour préserver la vitesse.</div>`;
    }
  }
  openModal("m-follows");
};

window.openCurrentDMProfile = () => {
  if (window._activeChatPartnerId) {
    window.location.hash = '#' + window._activeChatPartnerId;
  }
};

function loadDMChats() {
  if (!currentUser) return;
  if (window._dmChatsUnsub) window._dmChatsUnsub();
  
  const q = query(collection(db, "dm_chats"), where("participants", "array-contains", currentUser.username));
  window._dmChatsUnsub = onSnapshot(q, snap => {
    const box = document.getElementById("dm-contacts-list");
    if (snap.empty) { 
      box.innerHTML = `<div class="empty-text">Aucune discussion</div>`;
      updateUnreadDots(0); 
      return; 
    }
    
    let html = "";
    let chats = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));
    
    let unreadCount = 0;

    chats.forEach(c => {
      const partnerUname = c.participants.find(u => u !== currentUser.username);
      const partnerUser = window.usersMap.get(partnerUname) || { username: partnerUname, displayName: partnerUname };
      const dName = partnerUser.displayName || partnerUser.username;
      const partnerBadge = getBadge(partnerUser);
      const init = dName.split(" ").map(x => x[0]).join("").substring(0, 2).toUpperCase();
      const avHtml = partnerUser.avatar ? `<img src="${partnerUser.avatar}" style="display:block;width:100%;height:100%;object-fit:cover;">` : init;
      
      const isUnreadByMe = c.lastSenderId && c.lastSenderId !== currentUser.username && (!c.readBy || !c.readBy.includes(currentUser.username));
      if (isUnreadByMe) unreadCount++;

      const amILastSender = c.lastSenderId === currentUser.username;
      let statusText = "";
      if (amILastSender) {
         const isReadByPartner = c.readBy && c.readBy.includes(partnerUname);
         statusText = isReadByPartner ? `<span class="msg-status">· Vu</span>` : `<span class="msg-status">· Envoyé</span>`;
      }

      const previewClass = isUnreadByMe ? "msg-unread-preview" : "";
      const isActive = window._activeChatId === c.id;

      html += `
        <div class="dm-contact-row ${isActive ? 'active' : ''}" onclick="openChat('${c.id}', '${partnerUname}')">
           <div class="drawer-av" style="flex-shrink:0">${avHtml}</div>
           <div style="flex:1;min-width:0;">
             <div style="font-weight:600;font-size:15px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${dName}${partnerBadge}</div>
             <div style="font-size:13px;color:var(--ink-m);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" class="${previewClass}">${c.lastMessage || 'Nouvelle discussion'} ${statusText}</div>
           </div>
        </div>
      `;
    });
    box.innerHTML = html;
    updateUnreadDots(unreadCount);
  });
}

window.renderContactSearch = () => {
  const v = document.getElementById("search-contact").value.trim().toLowerCase();
  const box = document.getElementById("new-chat-list");
  let html = "";
  let count = 0;
  
  for (const [uname, u] of window.usersMap.entries()) {
    if (uname === currentUser.username) continue;
    if (u.allowMessages === false) continue;
    
    const dName = u.displayName || uname;
    if (!v || dName.toLowerCase().includes(v) || uname.includes(v)) {
      const init = dName.split(" ").map(x => x[0]).join("").substring(0, 2).toUpperCase();
      const avHtml = u.avatar ? `<img src="${u.avatar}" style="display:block;width:100%;height:100%;object-fit:cover;">` : init;
      const uBadge = getBadge(u);
      html += `
        <div class="follow-user-row" onclick="startNewChat('${uname}')">
          <div class="drawer-av" style="flex-shrink:0">${avHtml}</div>
          <div style="min-width:0;flex:1"><div style="font-weight:600;font-size:15px; display:flex; align-items:center;">${dName}${uBadge}</div><div style="font-size:13px;color:var(--ink-m)">@${uname}</div></div>
        </div>
      `;
      count++;
    }
  }
  if (count === 0) html = `<div class="empty-text">Aucun membre trouvé</div>`;
  box.innerHTML = html;
};

window.startNewChat = async (targetUname) => {
  if (!currentUser) return;
  closeModal('m-new-chat');
  
  const q = query(collection(db, "dm_chats"), where("participants", "array-contains", currentUser.username));
  const snap = await getDocs(q);
  let existingChatId = null;
  
  snap.forEach(d => {
    if (d.data().participants.includes(targetUname)) existingChatId = d.id;
  });
  
  if (existingChatId) {
    openChat(existingChatId, targetUname);
  } else {
    const newRef = doc(collection(db, "dm_chats"));
    await setDoc(newRef, { participants: [currentUser.username, targetUname], lastMessage: "", lastTimestamp: Date.now() });
    openChat(newRef.id, targetUname);
  }
};

window.openChat = async (chatId, partnerUname) => {
  window._activeChatId = chatId;
  window._activeChatPartnerId = partnerUname;

  const chatSnap = await getDoc(doc(db, "dm_chats", chatId));
  if (chatSnap.exists()) {
    const c = chatSnap.data();
    if (c.lastSenderId && c.lastSenderId !== currentUser.username && (!c.readBy || !c.readBy.includes(currentUser.username))) {
      await updateDoc(doc(db, "dm_chats", chatId), { readBy: [...(c.readBy||[]), currentUser.username] });
    }
  }
  
  document.getElementById("dm-form").style.display = "flex";
  document.querySelectorAll(".dm-contact-row").forEach(r => r.classList.remove("active"));
  
  if (window.innerWidth <= 850) {
    document.getElementById("dm-sidebar").classList.add("hide-mobile");
    document.getElementById("dm-chat-area").classList.remove("hide-mobile");
  }

  const pUser = window.usersMap.get(partnerUname) || { username: partnerUname, displayName: partnerUname };
  const pBadge = getBadge(pUser);
  document.getElementById("dm-active-name").innerHTML = (pUser.displayName || pUser.username) + pBadge;
  document.getElementById("dm-active-role").innerText = "@" + pUser.username + (pUser.role ? " • " + pUser.role : "");
  
  const init = (pUser.displayName || pUser.username).split(" ").map(x => x[0]).join("").substring(0, 2).toUpperCase();
  const avImg = document.getElementById("dm-active-av");
  const avInit = document.getElementById("dm-active-init");
  
  if (pUser.avatar) { 
    avImg.src = pUser.avatar; 
    avImg.style.display = "block"; 
    avInit.style.display = "none"; 
  } else { 
    avImg.style.display = "none"; 
    avInit.style.display = "block"; 
    avInit.innerText = init; 
  }

  if (window._dmMsgsUnsub) window._dmMsgsUnsub();
  
  const q = query(collection(db, "dm_messages"), where("chatId", "==", chatId));
  window._dmMsgsUnsub = onSnapshot(q, snap => {
    const docs = snap.docs.map(d => d.data());
    docs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)); 

    const box = document.getElementById("dm-msgs-box");
    box.innerHTML = "";
    
    docs.forEach(m => {
      const isMe = m.senderId === currentUser.username;
      const dStr = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      let attachHtml = "";
      if (m.fileUrl) {
         if (m.fileUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) || m.fileUrl.includes("res.cloudinary.com/")) {
           attachHtml = `<div style="margin-bottom:6px;"><a href="${m.fileUrl}" target="_blank"><img src="${m.fileUrl}" style="max-width:100%;border-radius:8px;max-height:200px;object-fit:cover;"></a></div>`;
         } else {
           attachHtml = `<div style="margin-bottom:6px;"><a href="${m.fileUrl}" target="_blank" style="color:inherit;text-decoration:underline;">📄 Pièce jointe</a></div>`;
         }
      }
      
      let shareHtml = "";
      if (m.sharedItemId) {
        const icon = (m.sharedItemType === 'post') ? '📄' : '🎯';
        const typeLabel = (m.sharedItemType === 'post') ? 'Document' : (m.sharedItemType === 'ai_quiz' ? 'Quiz IA' : 'Quiz');
        shareHtml = `
          <div style="margin-top: ${m.text || attachHtml ? '8px' : '0'}; padding:12px; background:var(--card-bg); border:1px solid var(--hl); border-radius:12px; color:var(--ink);">
            <div style="font-weight:600; font-size:14px; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
              <span style="font-size:18px;">${icon}</span> ${typeLabel} partagé
            </div>
            <div style="font-size:13px; margin-bottom:12px; line-height:1.4;">${m.sharedItemTitle}</div>
            <button class="btn-pill" style="width:100%; justify-content:center; padding:8px 12px; font-size:13px;" onclick="openSharedItem('${m.sharedItemId}', '${m.sharedItemType}')">Ouvrir</button>
          </div>
        `;
      }
      
      box.innerHTML += `
        <div class="dm-msg-wrapper ${isMe ? 'me' : 'them'}">
          <div class="dm-msg-bubble">
            ${attachHtml}
            ${m.text ? `<div>${m.text}</div>` : ''}
            ${shareHtml}
          </div>
          <div class="dm-msg-time">${dStr}</div>
        </div>
      `;
    });
    box.scrollTop = box.scrollHeight;
  });
};

window.backToDMSidebar = () => {
  document.getElementById("dm-sidebar").classList.remove("hide-mobile");
  document.getElementById("dm-chat-area").classList.add("hide-mobile");
};

window.handleDMFile = (e) => {
  const file = e.target.files[0]; 
  if (!file) return;
  
  if (file.size > 25 * 1024 * 1024) { 
    e.target.value = ""; 
    openModal("m-filesize"); 
    return; 
  }
  
  window._dmFileToUpload = file;
  document.getElementById("dm-file-preview").style.display = "block";
  document.getElementById("dm-file-preview").innerText = "📎 " + file.name + " prêt à envoyer";
};

window.handleSendDM = async (e) => {
  e.preventDefault();
  if (!window._activeChatId) return;
  
  const input = document.getElementById("dm-text-input");
  const txt = input.value.trim();
  
  if (!txt && !window._dmFileToUpload) return;
  
  const btn = e.target.querySelector("button");
  btn.disabled = true;

  let fileUrl = "";
  if (window._dmFileToUpload) {
    try { 
      fileUrl = await uploadToCloudinary(window._dmFileToUpload); 
    } catch(er) { 
      showToast("Erreur upload pièce jointe"); 
      btn.disabled = false; 
      return; 
    }
  }

  await addDoc(collection(db, "dm_messages"), {
    chatId: window._activeChatId,
    senderId: currentUser.username,
    text: txt,
    fileUrl: fileUrl,
    timestamp: Date.now()
  });

  const shortMsg = txt ? (txt.length > 25 ? txt.substring(0, 25) + "..." : txt) : "Pièce jointe 📎";
  await updateDoc(doc(db, "dm_chats", window._activeChatId), {
    lastMessage: shortMsg,
    lastTimestamp: Date.now(),
    lastSenderId: currentUser.username,
    readBy: [currentUser.username]
  });

  const pUser = window.usersMap.get(window._activeChatPartnerId);
  if (pUser) sendEmailNotif('message', pUser);

  input.value = "";
  window._dmFileToUpload = null;
  document.getElementById("dm-file-preview").style.display = "none";
  document.getElementById("dm-file-input").value = "";
  btn.disabled = false;
};

async function callGroqAPI(systemPrompt, userPrompt) {
  const conversationHistory = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];

  try {
    const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
        model: GROQ_MODEL,
        messages: conversationHistory,
        temperature: 0.6,
        max_tokens: 3000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) throw new Error("Erreur de l'API GROQ: " + response.status);
    
    const data = await response.json();
    let text = data.choices[0].message.content;
    
    const jsonRegex = /\{[\s\S]*\}/;
    const match = text.match(jsonRegex);
    if (match) {
      text = match[0];
    }

    return JSON.parse(text);
  } catch (e) {
    console.error("Format IA reçu (non-parsable):", e);
    throw new Error("L'IA n'a pas respecté le format JSON ou la réponse a été coupée.");
  }
}

let quizQuestionCount = 0;
window.addQuizQuestionField = () => {
  if (quizQuestionCount >= 50) { 
    showToast("Maximum 50 questions."); 
    return; 
  }
  quizQuestionCount++;
  const container = document.getElementById("quiz-questions-container");
  
  const html = `
    <div class="quiz-question-box" id="qbox-${quizQuestionCount}">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h3 style="margin:0; font-size:16px;">Question ${quizQuestionCount}</h3>
        <button class="btn-ghost btn-sm del" onclick="document.getElementById('qbox-${quizQuestionCount}').remove()">Supprimer</button>
      </div>
      <input type="text" class="input-q-text" placeholder="Pose ta question..." style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--hl); margin-bottom:12px;" required>
      <div style="display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; gap:8px; align-items:center;">
          <input type="radio" name="correct-${quizQuestionCount}" value="0" checked title="Bonne réponse">
          <input type="text" class="input-opt" placeholder="Réponse 1 (Bonne réponse par défaut)" style="flex:1; padding:8px; border-radius:8px; border:1px solid var(--hl);" required>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <input type="radio" name="correct-${quizQuestionCount}" value="1">
          <input type="text" class="input-opt" placeholder="Réponse 2" style="flex:1; padding:8px; border-radius:8px; border:1px solid var(--hl);" required>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <input type="radio" name="correct-${quizQuestionCount}" value="2">
          <input type="text" class="input-opt" placeholder="Réponse 3 (Optionnel)" style="flex:1; padding:8px; border-radius:8px; border:1px solid var(--hl);">
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <input type="radio" name="correct-${quizQuestionCount}" value="3">
          <input type="text" class="input-opt" placeholder="Réponse 4 (Optionnel)" style="flex:1; padding:8px; border-radius:8px; border:1px solid var(--hl);">
        </div>
      </div>
      <input type="text" class="input-just" placeholder="Explication (affichée lors de la correction) - Facultatif" style="width:100%; padding:8px; border-radius:8px; border:1px solid var(--hl); margin-top:12px;">
    </div>
  `;
  container.insertAdjacentHTML('beforeend', html);
};

window.handleCreateManualQuiz = async () => {
  const title = document.getElementById("quiz-create-title").value.trim();
  const matiere = document.getElementById("quiz-create-matiere").value;
  const desc = document.getElementById("quiz-create-desc").value.trim();
  
  if (!title || !matiere) { 
    showToast("Titre et matière requis."); 
    return; 
  }
  
  const qBoxes = document.querySelectorAll("#quiz-questions-container .quiz-question-box");
  if (qBoxes.length === 0) { 
    showToast("Ajoute au moins une question."); 
    return; 
  }

  const questions = [];
  let valid = true;

  qBoxes.forEach((box, index) => {
    const qTextInput = box.querySelector(".input-q-text");
    if (!qTextInput) return;
    
    const qText = qTextInput.value.trim();
    const optsInputs = box.querySelectorAll(".input-opt");
    const radios = box.querySelectorAll(`input[type="radio"]`);
    const just = box.querySelector(".input-just").value.trim();

    if (!qText) valid = false;

    const options = [];
    let correctIndex = 0;

    optsInputs.forEach((inp, idx) => {
      const val = inp.value.trim();
      if (val) {
        options.push(val);
        if (radios[idx].checked) correctIndex = options.length - 1;
      }
    });

    if (options.length < 2) valid = false;

    questions.push({
      question: qText,
      options: options,
      correctIndex: correctIndex,
      justification: just
    });
  });

  if (!valid || questions.length === 0) { 
    showToast("Vérifie que chaque question a un texte et au moins 2 réponses."); 
    return; 
  }

  const quiz = {
    title, matiere, description: desc,
    questions, isAI: false,
    likes: [], 
    authorId: currentUser.username, 
    authorDisplayName: currentUser.displayName || currentUser.username,
    authorAvatar: currentUser.avatar || "", 
    authorRole: currentUser.role || "élève",
    timestamp: Date.now()
  };

  try {
    await addDoc(collection(db, "quizzes"), quiz);
    document.getElementById("quiz-create-title").value = "";
    document.getElementById("quiz-create-desc").value = "";
    document.getElementById("quiz-questions-container").innerHTML = "";
    quizQuestionCount = 0;
    
    syncContrib();
    showToast("Quiz publié avec succès !");
    switchTab('quiz');
  } catch(e) { 
    showToast("Erreur lors de la publication."); 
  }
};

function loadQuizFeed() {
  if (window._quizUnsub) { window._quizUnsub(); window._quizUnsub = null; }
  if (window._aiQuizUnsub) { window._aiQuizUnsub(); window._aiQuizUnsub = null; }
  
  const container = document.getElementById("quiz-feed"); 
  if (!container) return;
  
  container.innerHTML = `<div style="display:flex;justify-content:center;grid-column:1/-1;padding:40px"><div class="spinner"></div></div>`;
  
  const renderCombined = () => {
    let combined = [...(window._liveQuizzesData || []), ...(window._liveAIQuizzesData || [])];
    
    const canSeeHS = currentUser && (currentUser.role === "admin" || currentUser.role === "HS" || (currentUser.subRoles && currentUser.subRoles.includes("admin")));
    if (!canSeeHS) {
      combined = combined.filter(q => q.authorRole !== "HS");
    }
    
    if (window._quizFilter.type === 'manuel') combined = combined.filter(q => !q.isAI);
    if (window._quizFilter.type === 'ia') combined = combined.filter(q => q.isAI);

    renderQuizFeedToContainer(combined, container, "Aucun quiz disponible", window._quizFilter.order);
  };

  const qQuizzes = window._quizFilter.subject === "all"
    ? query(collection(db, "quizzes"))
    : query(collection(db, "quizzes"), where("matiere", "==", window._quizFilter.subject));
    
  window._quizUnsub = onSnapshot(qQuizzes, snap => {
    window._liveQuizzesData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCombined();
  });

  const qAI = window._quizFilter.subject === "all"
    ? query(collection(db, "ai_quizzes"))
    : query(collection(db, "ai_quizzes"), where("matiere", "==", window._quizFilter.subject));
  
  window._aiQuizUnsub = onSnapshot(qAI, snap => {
    window._liveAIQuizzesData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCombined();
  });
}

function renderQuizFeedToContainer(quizzesArray, container, emptyMsg, sortOrder = 'recent') {
  container.innerHTML = "";
  if (quizzesArray.length === 0) {
    container.innerHTML = `<div class="empty-text">${emptyMsg || "Aucun quiz pour l'instant"}</div>`; 
    return;
  }

  if (sortOrder === 'likes') {
    quizzesArray.sort((a,b) => (b.likes || []).length - (a.likes || []).length);
  } else if (sortOrder === 'oldest') {
    quizzesArray.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  } else {
    quizzesArray.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }

  quizzesArray.forEach(q => {
    container.innerHTML += window.getQuizHTML(q);
  });
}

function loadAIQuizHistory() {
  if (!currentUser) return;
  const container = document.getElementById("settings-ai-quiz-history");
  if (!container) return;
  
  const qFeed = query(collection(db, "ai_quizzes"), where("authorId", "==", currentUser.username));
  
  onSnapshot(qFeed, snap => {
    if (snap.empty) {
      container.innerHTML = `<div class="empty-text">Aucun quiz IA généré.</div>`;
      return;
    }
    
    let html = "";
    snap.docs.forEach(d => {
      const q = d.data();
      const dateStr = q.timestamp ? new Date(q.timestamp).toLocaleDateString("fr-FR") : "";
      html += `
        <div style="background:var(--file-bg); padding:12px; border-radius:12px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-weight:600; color:var(--ink);">${q.title}</div>
            <div class="caption">${q.matiere} • ${(q.questions || []).length} questions • ${dateStr}</div>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn-pill-van btn-sm" onclick="checkAndStartQuiz('${d.id}', true)">Refaire</button>
            <button class="btn-danger btn-sm" onclick="deleteAIQuiz('${d.id}')">✕</button>
          </div>
        </div>`;
    });
    container.innerHTML = html;
  });
}

window.generateAIQuiz = async () => {
  let matiere = document.getElementById("quiz-ia-matiere").value;
  if (matiere === 'autre') {
    matiere = document.getElementById("quiz-ia-matiere-custom").value.trim();
  }
  
  const topic = document.getElementById("quiz-ia-topic").value.trim();
  const nbQuestions = Math.min(20, Math.max(1, parseInt(document.getElementById("quiz-ia-count").value) || 5));
  const desc = document.getElementById("quiz-ia-desc").value.trim();

  if (!topic || !matiere) { 
    showToast("Saisis un sujet principal et une matière."); 
    return; 
  }

  document.getElementById("quiz-ia-actions").style.display = "none";
  document.getElementById("quiz-ia-loading").style.display = "block";

  const systemPrompt = `Tu es un professeur expert dans la matière enseignée.
Ta mission est de créer un quiz éducatif de très haute qualité pour tester les connaissances des élèves.
Les questions doivent être variées, sans ambiguïté et adaptées au sujet donné. Les mauvaises réponses (distracteurs) doivent être plausibles.

RÈGLE ABSOLUE : Tu dois répondre UNIQUEMENT par un objet JSON valide, sans AUCUN texte avant ou après, et sans markdown.
Le JSON doit OBLIGATOIREMENT avoir cette structure exacte :
{
"questions": [
  {
    "question": "Pose la question de façon claire et précise ?",
    "options": ["Choix A", "Choix B", "Choix C", "Choix D"],
    "correctIndex": 0,
    "justification": "Explication pédagogique détaillée expliquant pourquoi cette réponse est la bonne et pourquoi les autres sont fausses."
  }
]
}`;

  const userPrompt = `Crée un quiz de ${nbQuestions} questions sur le sujet : "${topic}" en matière "${matiere}". Informations complémentaires : "${desc}".
Assure-toi que les questions couvrent bien le sujet et que l'attribut "correctIndex" (un entier entre 0 et 3) pointe bien vers la bonne réponse dans le tableau "options".
RENVOIE UNIQUEMENT LE JSON.`;

  try {
    const quizData = await callGroqAPI(systemPrompt, userPrompt);
    
    if (!quizData || !quizData.questions || quizData.questions.length === 0) {
      throw new Error("L'IA a renvoyé un contenu vide ou mal formaté.");
    }

    const newQuiz = {
      title: `[IA] : ${topic}`,
      matiere: matiere,
      description: desc,
      questions: quizData.questions,
      isAI: true,
      likes: [], 
      authorId: currentUser.username,
      authorDisplayName: currentUser.displayName || currentUser.username,
      authorAvatar: currentUser.avatar || "",
      authorRole: currentUser.role || "élève",
      timestamp: Date.now()
    };

    const docRef = await addDoc(collection(db, "ai_quizzes"), newQuiz);
    
    closeModal("m-ia-quiz");
    document.getElementById("quiz-ia-topic").value = "";
    document.getElementById("quiz-ia-desc").value = "";
    document.getElementById("quiz-ia-matiere-custom").value = "";
    document.getElementById("quiz-ia-matiere-custom").style.display = "none";
    document.getElementById("quiz-ia-matiere").value = Array.from(window.subjectsMap.keys())[0];
    
    showToast("Quiz généré avec succès !");
    syncContrib();
    checkAndStartQuiz(docRef.id, true);

  } catch(e) {
    console.error(e);
    showToast("Erreur lors de la génération. Réessaye.");
  } finally {
    document.getElementById("quiz-ia-actions").style.display = "flex";
    document.getElementById("quiz-ia-loading").style.display = "none";
  }
};

window.checkAndStartQuiz = async (quizId, isAI) => {
  const collectionName = isAI ? "ai_quizzes" : "quizzes";
  const ref = doc(db, collectionName, quizId);
  const snap = await getDoc(ref);
  
  if (!snap.exists()) { 
    showToast("Ce quiz n'existe plus."); 
    return; 
  }
  
  const qData = { id: snap.id, ...snap.data() };

  if (!isAI) {
    const attQ = query(collection(db, "quiz_attempts"), where("quizId", "==", quizId), where("userId", "==", currentUser.username));
    const attSnap = await getDocs(attQ);
    
    if (attSnap.size >= 5) {
      if (confirm("Tu as atteint la limite de 5 essais pour ce quiz.\nVeux-tu le recommencer via l'IA ? L'IA reformulera les questions et mélangera les réponses pour t'entraîner (ton score ne sera pas sauvegardé).")) {
         window._currentQuizData = qData;
         reformulateQuizWithAI();
      }
      return;
    }
  }

  window._currentQuizData = qData;
  startQuiz();
};

window.reformulateQuizWithAI = async () => {
  openModal('m-take-quiz');
  document.getElementById("take-quiz-title").innerText = window._currentQuizData.title + " (Reformulé)";
  document.getElementById("take-quiz-content").style.display = "none";
  document.getElementById("take-quiz-loading").style.display = "block";
  document.getElementById("btn-next-question").style.display = "none";

  const systemPrompt = `Tu es un professeur. Je vais te donner un quiz en JSON. Tu dois reformuler TOUTES les questions et TOUTES les options pour qu'elles soient différentes dans la forme, mais identiques sur le fond. Change l'ordre des options et mets à jour 'correctIndex' en conséquence.
  RÈGLE ABSOLUE : Réponds UNIQUEMENT par un objet JSON valide, sans texte avant/après, sans markdown. Structure identique :
  { "questions": [ { "question": "...", "options": ["..."], "correctIndex": 0, "justification": "..." } ] }`;

  const userPrompt = JSON.stringify(window._currentQuizData.questions);

  try {
    const newData = await callGroqAPI(systemPrompt, userPrompt);
    if (!newData || !newData.questions) throw new Error("Format Invalide");
    
    window._currentQuizData.questions = newData.questions;
    window._currentQuizData.isAI = true; 
    
    document.getElementById("take-quiz-loading").style.display = "none";
    document.getElementById("take-quiz-content").style.display = "block";
    document.getElementById("btn-next-question").style.display = "block";
    
    startQuiz(true); 
  } catch(e) {
    console.error(e);
    showToast("Erreur lors de la reformulation IA.");
    closeModal('m-take-quiz');
  }
};

window.startQuiz = (alreadyOpen = false) => {
  window._currentQuestionIndex = 0;
  window._quizUserAnswers = [];
  window._hasViewedAnswers = false;
  window._quizStartTime = Date.now();
  
  if (!alreadyOpen) openModal("m-take-quiz");
  
  document.getElementById("take-quiz-title").innerText = window._currentQuizData.title;
  document.getElementById("take-quiz-content").style.display = "block";
  document.getElementById("take-quiz-loading").style.display = "none";
  document.getElementById("btn-next-question").style.display = "block";
  
  renderCurrentQuestion();
};

window.renderCurrentQuestion = () => {
  const qData = window._currentQuizData.questions[window._currentQuestionIndex];
  document.getElementById("take-quiz-progress").innerText = `${window._currentQuestionIndex + 1} / ${window._currentQuizData.questions.length}`;
  document.getElementById("take-quiz-question").innerText = qData.question;
  
  const optsContainer = document.getElementById("take-quiz-options");
  optsContainer.innerHTML = "";
  
  qData.options.forEach((opt, idx) => {
    optsContainer.innerHTML += `<button class="quiz-option" style="color: var(--ink);" onclick="selectQuizOption(${idx}, this)">${opt}</button>`;
  });
  
  document.getElementById("btn-next-question").disabled = true;
  document.getElementById("btn-next-question").innerText = (window._currentQuestionIndex === window._currentQuizData.questions.length - 1) ? "Terminer" : "Suivant";
};

window.selectQuizOption = (idx, btnElement) => {
  document.querySelectorAll(".quiz-option").forEach(b => b.classList.remove("selected"));
  btnElement.classList.add("selected");
  window._quizUserAnswers[window._currentQuestionIndex] = idx;
  document.getElementById("btn-next-question").disabled = false;
};

window.nextQuizQuestion = () => {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  if (window._currentQuestionIndex < window._currentQuizData.questions.length - 1) {
    window._currentQuestionIndex++;
    renderCurrentQuestion();
  } else {
    submitQuiz();
  }
};

window.readQuestionAloud = () => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    if (!window._currentQuizData) return;
    const qData = window._currentQuizData.questions[window._currentQuestionIndex];
    const textToRead = `${qData.question}. Les réponses possibles sont : ${qData.options.join(", ou ")}.`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = "fr-FR";
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
    showToast("🔊 Lecture de la question (Google)...");
  } else {
    showToast("⚠️ La synthèse vocale n'est pas supportée par ce navigateur.");
  }
};

window.submitQuiz = async () => {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  closeModal('m-take-quiz');
  
  let score = 0;
  window._currentQuizData.questions.forEach((q, idx) => {
    if (window._quizUserAnswers[idx] === q.correctIndex) score++;
  });
  
  const timeTaken = Math.floor((Date.now() - window._quizStartTime) / 1000);
  
  document.getElementById("quiz-final-score").innerText = `${score} / ${window._currentQuizData.questions.length}`;
  
  const ratio = score / window._currentQuizData.questions.length;
  let msg = "Bien joué !";
  if (ratio === 1) msg = "Parfait ! Un sans faute 🎯";
  else if (ratio < 0.5) msg = "Tu peux faire mieux ! Révise encore un peu 📚";
  
  document.getElementById("quiz-result-msg").innerText = `${msg} (répondu en ${timeTaken}s)`;
  openModal('m-quiz-result');

  const colName = window._currentQuizData.isAI ? "ai_quizzes" : "quizzes";
  const currentCount = window._currentQuizData.attemptsCount || 0;
  try {
    await updateDoc(doc(db, colName, window._currentQuizData.id), { attemptsCount: currentCount + 1 });
  } catch (err) {
    console.error("Erreur lors de la mise à jour du compteur :", err);
  }

  if (!window._currentQuizData.isAI) {
    await addDoc(collection(db, "quiz_attempts"), {
      quizId: window._currentQuizData.id,
      userId: currentUser.username,
      userDisplayName: currentUser.displayName || currentUser.username,
      score: score,
      maxScore: window._currentQuizData.questions.length,
      timeTaken: timeTaken,
      timestamp: Date.now()
    });
  }
};

window.showQuizAnswers = () => {
  window._hasViewedAnswers = true;
  closeModal('m-quiz-result');
  
  const container = document.getElementById("quiz-answers-container");
  container.innerHTML = "";
  
  window._currentQuizData.questions.forEach((q, idx) => {
    const userAns = window._quizUserAnswers[idx];
    const isCorrect = userAns === q.correctIndex;
    
    let optsHtml = "";
    q.options.forEach((opt, optIdx) => {
      let cssClass = "quiz-option";
      if (optIdx === q.correctIndex) cssClass += " correct";
      else if (optIdx === userAns && !isCorrect) cssClass += " wrong";
      
      optsHtml += `<div class="${cssClass}" style="cursor:default; color:var(--ink);">${opt}</div>`;
    });
    
    container.innerHTML += `
      <div style="background:var(--card-bg); border:1px solid var(--hl); border-radius:12px; padding:16px;">
        <h4 style="margin-bottom:12px; display:flex; align-items:center; gap:8px;">
          ${isCorrect ? '✅' : '❌'} Question ${idx + 1}
        </h4>
        <div style="font-weight:500; margin-bottom:12px;">${q.question}</div>
        <div style="display:flex; flex-direction:column; gap:6px;">${optsHtml}</div>
        ${q.justification ? `<div style="margin-top:12px; padding:10px; background:var(--parchment); border-radius:8px; font-size:14px; color:var(--ink-m);">💡 <strong>Explication :</strong> ${q.justification}</div>` : ''}
      </div>
    `;
  });
  
  openModal('m-quiz-answers');
};

window.restartQuiz = async () => {
  closeModal('m-quiz-result');
  if (window._hasViewedAnswers && !window._currentQuizData.isAI) {
    reformulateQuizWithAI();
  } else {
    startQuiz();
  }
};

window.closeTakeQuizModal = async () => {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
};

window.abortQuiz = () => {
  if (confirm("Veux-tu vraiment quitter le quiz en cours ?")) {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    closeModal('m-take-quiz');
    window._currentQuizData = null;
  }
};

window.handleAddMatiere = async () => {
  const name = document.getElementById("mat-name").value.trim();
  const icon = document.getElementById("mat-icon").value.trim();
  
  if (!name || !icon) {
    showToast("Remplis le nom et l'icône.");
    return;
  }
  
  await addDoc(collection(db, "subjects"), { name, icon }); 
  closeModal("m-add-mat"); 
  document.getElementById("mat-name").value = ""; 
  document.getElementById("mat-icon").value = ""; 
  showToast("Matière ajoutée ✓");
};

window.editMatiere = (id, name, icon) => {
  document.getElementById("m-edit-mat-title").innerText = "Modifier la matière"; 
  document.getElementById("edit-mat-id").value = id; 
  document.getElementById("adm-m-name").value = name; 
  document.getElementById("adm-m-icon").value = icon; 
  openModal("m-edit-mat");
};

window.openMatiereModal = (isEdit, id = "", name = "", icon = "") => { 
  if (isEdit) editMatiere(id, name, icon); 
  else openModal("m-add-mat"); 
};

window.saveMatiereConfig = async () => {
  const id = document.getElementById("edit-mat-id").value;
  const name = document.getElementById("adm-m-name").value.trim();
  const icon = document.getElementById("adm-m-icon").value.trim();
  
  if (!name || !icon) return;
  
  if (id) {
    await updateDoc(doc(db, "subjects", id), { name, icon });
  } else {
    await addDoc(collection(db, "subjects"), { name, icon });
  }
  
  closeModal("m-edit-mat"); 
  showToast("Matière mise à jour ✓");
};

window.delMatiere = async (id) => {
  if (confirm("Supprimer cette matière ? Les ressources associée resteront en base.")) {
    await deleteDoc(doc(db, "subjects", id));
  }
};

function syncAdminDashboardStats() {
  if (!currentUser || (currentUser.role !== 'admin' && !(currentUser.subRoles && currentUser.subRoles.includes('admin')))) return;
  
  const elMem = document.getElementById("stat-admin-members");
  if (elMem) elMem.innerText = window.usersMap.size;

  onSnapshot(collection(db, "posts"), snap => {
    const elPosts = document.getElementById("stat-admin-posts");
    if (elPosts) elPosts.innerText = snap.size;
    
    let totalComments = 0;
    snap.forEach(d => {
      const c = d.data().comments || [];
      totalComments += c.length;
      c.forEach(rep => { if (rep.replies) totalComments += rep.replies.length; });
    });
    const elComm = document.getElementById("stat-admin-comments");
    if (elComm) elComm.innerText = totalComments;
  });

  onSnapshot(collection(db, "quizzes"), snap1 => {
    onSnapshot(collection(db, "ai_quizzes"), snap2 => {
      const elQ = document.getElementById("stat-admin-quizzes");
      if (elQ) elQ.innerText = snap1.size + snap2.size;
    });
  });

  onSnapshot(collection(db, "reports"), snap => {
    const tb = document.getElementById("admin-mod-tb");
    const dot = document.getElementById("admin-mod-dot");
    let pendingCount = 0;
    
    if (snap.empty) {
      if (tb) tb.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--ink-m);">Aucun signalement en attente.</td></tr>`;
      if (dot) dot.style.display = "none";
      return;
    }

    let rowsHtml = "";
    snap.docs.forEach(d => {
      const r = { id: d.id, ...d.data() };
      if (r.status === "pending") {
        pendingCount++;
        const dateStr = r.timestamp ? new Date(r.timestamp).toLocaleDateString("fr-FR", {day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit"}) : "—";
        rowsHtml += `
          <tr>
            <td><strong>[${esc(r.postId)}]</strong><br>${esc(r.postTitle || 'Document')} <span class="caption">(@${esc(r.postAuthor || '')})</span></td>
            <td><strong>@${esc(r.reporterId)}</strong></td>
            <td style="color:var(--danger); font-weight:500;">${esc(r.reason)}</td>
            <td class="caption">${dateStr}</td>
            <td>
              <div class="td-acts">
                <button class="btn-danger btn-sm" onclick="resolveReport('${d.id}', '${r.postId}', 'delete')">Supprimer post</button>
                <button class="btn-ghost btn-sm" onclick="resolveReport('${d.id}', '${r.postId}', 'ignore')">Ignorer</button>
              </div>
            </td>
          </tr>
        `;
      }
    });
    if (tb) tb.innerHTML = rowsHtml || `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--ink-m);">Aucun signalement en attente.</td></tr>`;
    if (dot) dot.style.display = pendingCount > 0 ? "inline-block" : "none";
  });
}

window.resolveReport = async (reportId, postId, action) => {
  try {
    await updateDoc(doc(db, "reports", reportId), { status: action === 'delete' ? 'deleted' : 'ignored' });
    if (action === 'delete' && postId) {
      try { await deleteDoc(doc(db, "posts", postId)); } catch(e){}
      showToast("Publication supprimée et signalement résolu ✓");
    } else {
      showToast("Signalement ignoré ✓");
    }
  } catch(e) {
    showToast("Erreur lors de l'opération.");
  }
};

function syncAdminUsers() {
  onSnapshot(collection(db, "users"), snap => {
    window._allAdminUsers = [];
    snap.forEach(d => {
      window._allAdminUsers.push({ docId: d.id, ...d.data() });
    });
    renderAdminUsersTable();
    const elMem = document.getElementById("stat-admin-members");
    if (elMem) elMem.innerText = window._allAdminUsers.length;
  });
}

window.renderAdminUsersTable = () => {
  const tb = document.getElementById("admin-users-tb");
  if (!tb) return;
  
  const searchVal = (document.getElementById("adm-filter-search")?.value || "").toLowerCase().trim();
  const roleVal = document.getElementById("adm-filter-role")?.value || "all";
  
  const filtered = window._allAdminUsers.filter(u => {
    const matchRole = roleVal === "all" || u.role === roleVal;
    const dName = (u.displayName || "").toLowerCase();
    const uName = (u.username || "").toLowerCase();
    const matchSearch = !searchVal || dName.includes(searchVal) || uName.includes(searchVal) || u.docId.toLowerCase().includes(searchVal);
    return matchRole && matchSearch;
  });

  if (filtered.length === 0) {
    tb.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--ink-m);">Aucun membre ne correspond aux critères.</td></tr>`;
    return;
  }

  tb.innerHTML = filtered.map(u => `
    <tr>
      <td><strong>${esc(u.username)}</strong></td>
      <td>${esc(u.displayName || "—")}</td>
      <td><span class="rpill">${esc(u.role || "élève")}</span></td>
      <td class="caption">${esc((u.subRoles || []).join(", ") || "—")}</td>
      <td>
        <div class="td-acts">
          <button class="btn-ghost btn-sm" onclick='openUserModal(true,"${u.docId}","${esc(u.username)}","${esc(u.role)}",${JSON.stringify(u.subRoles || [])})'>Modifier</button>
          <button class="btn-danger btn-sm" onclick="delUser('${u.docId}','${esc(u.username)}')">Suppr.</button>
        </div>
      </td>
    </tr>
  `).join("");
};

window.switchAdminTab = (tabName) => {
  document.querySelectorAll('[data-adm-tab]').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`[data-adm-tab="${tabName}"]`);
  if (activeBtn) activeBtn.classList.add('active');
  
  document.querySelectorAll('.adm-tab-content').forEach(c => c.style.display = 'none');
  const activeContent = document.getElementById(`adm-view-${tabName}`);
  if (activeContent) activeContent.style.display = 'block';
};

window._tempFakeFollowers = [];
window._tempFakeFollowersCount = 0;

const FAKE_FIRSTS = ["lucas", "camille", "chloe", "thomas", "lea", "hugo", "manon", "nathan", "emma", "mathis", "jade", "antoine", "julie", "alexis", "marie", "enzo", "sarah"];
const FAKE_LASTS = ["martin", "bernard", "dubois", "petit", "durand", "leroy", "moreau", "simon", "laurent", "lefevre", "michel", "garcia", "david", "bertrand", "roux"];

window.generateAndSetFakeFollowers = () => {
  const count = parseInt(document.getElementById("adm-u-fake-count").value, 10) || 0;
  if (count <= 0) {
    window.clearFakeFollowers();
    return;
  }

  const list = [];
  const displayCount = Math.min(count, 50);
  
  for (let i = 0; i < displayCount; i++) {
    const f = FAKE_FIRSTS[Math.floor(Math.random() * FAKE_FIRSTS.length)];
    const l = FAKE_LASTS[Math.floor(Math.random() * FAKE_LASTS.length)];
    const dname = `${f.charAt(0).toUpperCase() + f.slice(1)} ${l.charAt(0).toUpperCase() + l.slice(1)}`;
    list.push({
      username: `${f}.${l}${Math.random() > 0.7 ? Math.floor(Math.random() * 90) + 10 : ''}`,
      displayName: dname,
      role: "élève",
      avatar: "",
      isFake: true
    });
  }

  window._tempFakeFollowers = list;
  window._tempFakeFollowersCount = count;
  document.getElementById("adm-fake-preview").innerText = `${window.formatNumber(count)} abonnés simulés configurés.`;
  showToast(`${window.formatNumber(count)} faux abonnés générés ✓`);
};

window.clearFakeFollowers = () => {
  window._tempFakeFollowers = [];
  window._tempFakeFollowersCount = 0;
  document.getElementById("adm-u-fake-count").value = "";
  document.getElementById("adm-fake-preview").innerText = "Aucun faux abonné.";
  showToast("Faux abonnés retirés (pense à enregistrer) ✓");
};

window.openUserModal = (isEdit, docId = "", username = "", role = "élève", subRoles = []) => {
  document.getElementById("m-user-title").innerText = isEdit ? "Modifier le compte" : "Nouveau compte";
  document.getElementById("edit-user-id").value = docId; 
  document.getElementById("adm-u-id").value = username; 
  document.getElementById("adm-u-id").disabled = isEdit; 
  document.getElementById("adm-pwd-wrap").style.display = isEdit ? "none" : "flex"; 
  
  document.getElementById("adm-u-role").value = role; 
  document.getElementById("adm-u-admin").checked = subRoles.includes("admin"); 
  document.getElementById("adm-u-vol").checked = subRoles.includes("volontaire"); 
  
  let userObj = isEdit ? window.usersMap.get(username) : null;
  document.getElementById("adm-u-verified").checked = userObj ? !!userObj.isVerified : false;
  
  const fakes = userObj ? (userObj.fakeFollowers || []) : [];
  const fakeCount = userObj && userObj.fakeFollowersCount !== undefined ? userObj.fakeFollowersCount : fakes.length;
  window._tempFakeFollowers = [...fakes];
  window._tempFakeFollowersCount = fakeCount;
  
  document.getElementById("adm-u-fake-count").value = fakeCount || "";
  document.getElementById("adm-fake-preview").innerText = fakeCount ? `${window.formatNumber(fakeCount)} faux abonnés actifs.` : "Aucun faux abonné.";

  openModal("m-user");
};

window.saveUserConfig = async () => {
  const docId = document.getElementById("edit-user-id").value;
  const username = document.getElementById("adm-u-id").value.trim().toLowerCase();
  const role = document.getElementById("adm-u-role").value;
  const isVerified = document.getElementById("adm-u-verified").checked;

  if (!username) return;

  const subs = [];
  if (document.getElementById("adm-u-admin").checked) subs.push("admin"); 
  if (document.getElementById("adm-u-vol").checked) subs.push("volontaire");

  const updates = { 
    role, 
    subRoles: subs, 
    isVerified, 
    fakeFollowers: window._tempFakeFollowers,
    fakeFollowersCount: window._tempFakeFollowersCount || 0
  };

  if (docId) { 
    await updateDoc(doc(db, "users", docId), updates); 
    showToast("Compte mis à jour ✓"); 
  } else {
    const pwd = document.getElementById("adm-u-pwd").value.trim() || "stmg2026";
    const exist = await getDocs(query(collection(db, "users"), where("username", "==", username))); 
    
    if (!exist.empty) {
      showToast("Identifiant déjà pris.");
      return;
    }
    
    const autoName = displayNameFromId(username);
    await addDoc(collection(db, "users"), {
      username, displayName: autoName, password: pwd, avatar: "", bio: "", banner: "",
      instagram: "", linkedin: "", tiktok: "", followers: [], following: [], isTempPassword: true,
      allowMessages: true, emailNotifs: false, email: "", ...updates
    }); 
    
    showToast(`Compte de ${autoName} créé ✓`);
  }
  closeModal("m-user");
};

window.delUser = async (docId, uname) => {
  if (uname === "...") {
    showToast("Compte protégé.");
    return;
  }
  if (confirm(`Supprimer l'accès de ${uname} ?`)) {
    await deleteDoc(doc(db, "users", docId));
  }
};

function syncAdminMats() {
  onSnapshot(collection(db, "subjects"), snap => {
    const tb = document.getElementById("admin-mat-tb"); 
    tb.innerHTML = "";
    
    snap.forEach(d => {
      const m = d.data();
      tb.innerHTML += `
      <tr>
        <td style="font-size:22px">${m.icon}</td>
        <td><strong>${m.name}</strong></td>
        <td>
          <div class="td-acts">
            <button class="btn-ghost btn-sm" onclick="editMatiere('${d.id}','${esc(m.name)}','${m.icon}')">Modifier</button>
            <button class="btn-danger btn-sm" onclick="delMatiere('${d.id}')">Suppr.</button>
          </div>
        </td>
      </tr>`;
    });
  });
}

window.switchTab = (target) => { 
    window.location.hash = `#page-${target}`; 
};

window.toggleDrawer = () => {
  document.getElementById("mob-drawer").classList.toggle("open");
  document.getElementById("hamburger-btn").classList.toggle("open");
};

window.closeDrawer = () => {
  document.getElementById("mob-drawer").classList.remove("open");
  document.getElementById("hamburger-btn").classList.remove("open");
};

window.toggleDropdown = () => document.getElementById("profil-dropdown").classList.toggle("show");
window.closeDropdown = () => document.getElementById("profil-dropdown").classList.remove("show");

document.addEventListener("click", e => {
  const dd = document.getElementById("profil-dropdown");
  const av = document.getElementById("nav-avatar");
  if (dd && !dd.contains(e.target) && av && !av.contains(e.target)) {
    dd.classList.remove("show");
  }
});

window.openModal = id => {
  document.getElementById(id).classList.add("active");
  if (id === 'm-new-chat') renderContactSearch();
};

window.closeModal = id => document.getElementById(id).classList.remove("active");
window.closeOnOut = (e, id) => { if (e.target.id === id) closeModal(id); };

function esc(s) { 
  return (s || "").replace(/'/g, "\\'").replace(/"/g, "&quot;"); 
} 

window.esc = esc;
