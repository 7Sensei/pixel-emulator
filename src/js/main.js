/**
 * ============================================================================
 * Pixel Emulator - Main Router, Game Library & Save Manager Engine
 * ============================================================================
 * - Dual Engine: EmulatorJS (NES, GBA, SNES, GB) & FreeJ2ME-web (Java ME MIDlets)
 * - Game Library: Katalog game bawaan dari assets/games.json
 * - Save Data Manager: Export & Import save states (.state, .sav, .zip)
 */

// Konfigurasi Path Engine & Data
const ENGINE_CONFIG = {
  emulatorjsLocalData: 'engines/emulatorjs/data/',
  emulatorjsCdnData: 'https://cdn.emulatorjs.org/stable/data/',
  j2meCoreUrl: 'engines/freej2me-web/run.html',
  romsDir: 'roms',
  catalogueUrl: 'assets/games.json'
};

// Peta Dukungan Ekstensi ke Engine & Core
const EXTENSION_CONFIG = {
  // Java ME
  jar: { engine: 'freej2me', core: 'midp-2.0', name: 'Java ME (FreeJ2ME-web)', badgeClass: 'active-j2me' },
  jad: { engine: 'freej2me', core: 'midp-2.0', name: 'Java ME (FreeJ2ME-web)', badgeClass: 'active-j2me' },

  // Nintendo Classic & Handhelds
  nes: { engine: 'emulatorjs', core: 'nes', name: 'Nintendo Entertainment System', badgeClass: 'active-emulatorjs' },
  fds: { engine: 'emulatorjs', core: 'nes', name: 'Famicom Disk System', badgeClass: 'active-emulatorjs' },
  gba: { engine: 'emulatorjs', core: 'gba', name: 'Game Boy Advance', badgeClass: 'active-emulatorjs' },
  gb: { engine: 'emulatorjs', core: 'gb', name: 'Game Boy', badgeClass: 'active-emulatorjs' },
  gbc: { engine: 'emulatorjs', core: 'gb', name: 'Game Boy Color', badgeClass: 'active-emulatorjs' },
  sfc: { engine: 'emulatorjs', core: 'snes', name: 'Super Nintendo (SNES)', badgeClass: 'active-emulatorjs' },
  smc: { engine: 'emulatorjs', core: 'snes', name: 'Super Nintendo (SNES)', badgeClass: 'active-emulatorjs' },

  // Sega
  gen: { engine: 'emulatorjs', core: 'segaMD', name: 'Sega Mega Drive / Genesis', badgeClass: 'active-emulatorjs' },
  smd: { engine: 'emulatorjs', core: 'segaMD', name: 'Sega Mega Drive', badgeClass: 'active-emulatorjs' },
  md: { engine: 'emulatorjs', core: 'segaMD', name: 'Sega Mega Drive', badgeClass: 'active-emulatorjs' },
  bin: { engine: 'emulatorjs', core: 'segaMD', name: 'Sega Genesis / Raw ROM', badgeClass: 'active-emulatorjs' }
};

// Preset Resolusi Ukuran Layar J2ME
const J2ME_RESOLUTIONS = [
  { id: 'auto', label: 'AUTO (DETEKSI)', shortLabel: 'RESO: AUTO', width: null, height: null },
  { id: '360x640', label: '360×640 (WIDE TOUCH)', shortLabel: '360×640', width: 360, height: 640 },
  { id: '240x320', label: '240×320 (PORTRAIT)', shortLabel: '240×320', width: 240, height: 320 },
  { id: '320x240', label: '320×240 (LANDSCAPE)', shortLabel: '320×240', width: 320, height: 240 },
  { id: '240x400', label: '240×400 (TALL TOUCH)', shortLabel: '240×400', width: 240, height: 400 },
  { id: '400x240', label: '400×240 (WIDE LAND)', shortLabel: '400×240', width: 400, height: 240 },
  { id: '480x800', label: '480×800 (WVGA)', shortLabel: '480×800', width: 480, height: 800 },
  { id: '176x220', label: '176×220 (MIDP-1/2)', shortLabel: '176×220', width: 176, height: 220 },
  { id: '128x160', label: '128×160 (RETRO)', shortLabel: '128×160', width: 128, height: 160 }
];

// State Global Aplikasi
const state = {
  activeEngine: null, // 'freej2me' | 'emulatorjs' | null
  activeGameFile: null,
  activeGameName: 'NONE',
  activeBlobUrl: null,
  sfxEnabled: true,
  crtEnabled: true,
  j2meResIndex: 0,
  j2meRotateActive: false,
  gamesLibrary: [],
  selectedCategory: 'all',
  searchQuery: ''
};

function getCurrentJ2MEOptions() {
  const currentRes = J2ME_RESOLUTIONS[state.j2meResIndex] || J2ME_RESOLUTIONS[0];
  return {
    width: currentRes.width,
    height: currentRes.height,
    rotate: state.j2meRotateActive ? 'on' : 'off'
  };
}

// Web Audio API Retro Chiptune Synthesizer
let audioCtx = null;
function playChiptune(type = 'click') {
  if (!state.sfxEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'coin') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'start') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(261.63, now); // C4
      osc.frequency.setValueAtTime(329.63, now + 0.06); // E4
      osc.frequency.setValueAtTime(392.00, now + 0.12); // G4
      osc.frequency.setValueAtTime(523.25, now + 0.18); // C5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else {
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
    }
  } catch (e) {
    // Autoplay fallback
  }
}

// Helper Unduh File Blob
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// DOM Elements Cache
const DOM = {
  fileInput: document.getElementById('game-file-input'),
  dropzone: document.getElementById('dropzone'),
  btnFullscreen: document.getElementById('btn-fullscreen'),
  btnJ2meResolution: document.getElementById('btn-j2me-resolution'),
  resolutionBtnText: document.getElementById('resolution-btn-text'),
  btnJ2meRotate: document.getElementById('btn-j2me-rotate'),
  rotateBtnText: document.getElementById('rotate-btn-text'),
  btnReset: document.getElementById('btn-reset'),
  btnToggleCrt: document.getElementById('btn-toggle-crt'),
  btnToggleSfx: document.getElementById('btn-toggle-sfx'),
  btnClearLog: document.getElementById('btn-clear-log'),
  sfxIcon: document.getElementById('sfx-icon'),
  screenFrame: document.getElementById('screen-frame'),
  brandLogo: document.getElementById('brand-logo'),
  coinBadge: document.getElementById('coin-badge'),

  // Status & Info Elements
  headerStatusDot: document.getElementById('header-status-dot'),
  headerStatusText: document.getElementById('header-status-text'),
  metaFilename: document.getElementById('meta-filename'),
  metaExtension: document.getElementById('meta-extension'),
  metaEngine: document.getElementById('meta-engine'),
  metaCore: document.getElementById('meta-core'),

  // Viewports & Containers
  idleScreen: document.getElementById('idle-screen'),
  freej2meContainer: document.getElementById('freej2me-container'),
  freej2meViewport: document.getElementById('freej2me-viewport'),
  emulatorjsContainer: document.getElementById('emulatorjs-container'),
  emulatorjsViewport: document.getElementById('emulatorjs-viewport'),
  activityLog: document.getElementById('activity-log'),

  // Save Data Manager Elements
  btnExportSave: document.getElementById('btn-export-save'),
  btnImportSave: document.getElementById('btn-import-save'),
  saveFileInput: document.getElementById('save-file-input'),
  saveStatusText: document.getElementById('save-status-text'),

  // Game Library Elements
  gamesGrid: document.getElementById('games-grid'),
  librarySearch: document.getElementById('library-search'),
  categoryFilters: document.getElementById('category-filters'),

  // Mobile Tabs
  mobileTabs: document.querySelectorAll('.mobile-tab-btn'),
  controlsSidebar: document.getElementById('controls-sidebar'),
  screenStage: document.getElementById('screen-stage'),
  telemetryBar: document.getElementById('telemetry-bar'),
  libraryAnchor: document.getElementById('library-anchor')
};

// ============================================================================
// Activity Logger
// ============================================================================
function logMessage(tag, message, type = 'info') {
  const time = new Date().toLocaleTimeString('id-ID', { hour12: false });
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `
    <span class="log-time">[${time}]</span>
    <span class="log-tag ${type}">${tag}:</span>
    <span class="log-msg">${escapeHtml(message)}</span>
  `;
  DOM.activityLog.prepend(entry);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
}

function getExtension(filename) {
  if (!filename || typeof filename !== 'string') return '';
  const parts = filename.split('.');
  if (parts.length <= 1) return '';
  return parts.pop().toLowerCase().trim();
}

function updateMetadata(filename, ext, config) {
  DOM.metaFilename.textContent = filename || 'NONE';
  DOM.metaExtension.textContent = ext ? `.${ext.toUpperCase()}` : '--';
  DOM.metaEngine.textContent = config ? config.name : 'STANDBY';
  DOM.metaCore.textContent = config ? config.core.toUpperCase() : 'IDLE';
}

function updateHeaderStatus(text, badgeClass = null) {
  DOM.headerStatusText.textContent = text;
  DOM.headerStatusDot.className = 'status-dot';
  if (badgeClass) {
    DOM.headerStatusDot.classList.add(badgeClass);
  }
}

// ============================================================================
// Cleanup & Reset Function
// ============================================================================
function cleanupActiveEngine(keepJ2meMode = false) {
  if (state.activeBlobUrl) {
    URL.revokeObjectURL(state.activeBlobUrl);
    state.activeBlobUrl = null;
  }

  if (window.EJS_emulator && typeof window.EJS_emulator.destroy === 'function') {
    try {
      window.EJS_emulator.destroy();
    } catch (e) {
      console.warn('EJS destroy warning:', e);
    }
  }

  const oldScript = document.getElementById('ejs-loader-script');
  if (oldScript) oldScript.remove();

  delete window.EJS_player;
  delete window.EJS_core;
  delete window.EJS_gameUrl;
  delete window.EJS_gameName;
  delete window.EJS_pathtodata;
  delete window.EJS_emulator;

  DOM.freej2meViewport.innerHTML = '';
  DOM.emulatorjsViewport.innerHTML = '';
  DOM.freej2meContainer.classList.remove('active');
  DOM.emulatorjsContainer.classList.remove('active');

  state.activeEngine = null;
  state.activeGameFile = null;
  state.activeGameName = 'NONE';

  if (!keepJ2meMode) {
    state.j2meResIndex = 0;
    state.j2meRotateActive = false;
    if (DOM.resolutionBtnText) DOM.resolutionBtnText.textContent = 'RESO: AUTO';
    if (DOM.rotateBtnText) DOM.rotateBtnText.textContent = 'ROTASI: OFF';
    if (DOM.btnJ2meRotate) DOM.btnJ2meRotate.classList.remove('active');
  }

  DOM.saveStatusText.textContent = 'SIAP // MENUNGGU GAME';
  DOM.saveStatusText.className = 'save-status-text';
}

function resetToIdle() {
  playChiptune('click');
  cleanupActiveEngine();
  DOM.idleScreen.classList.remove('hidden');
  updateMetadata(null, null, null);
  updateHeaderStatus('STANDBY // READY', null);
  logMessage('SYSTEM', 'Emulator di-reset ke kondisi standby.', 'warn');
}

// ============================================================================
// 1. Container EmulatorJS (Konsol Klasik)
// ============================================================================
async function activateEmulatorJSContainer(gameFile, coreName) {
  logMessage('EMU-JS', `Memulai aktivasi container EmulatorJS [Core: ${coreName}]...`, 'info');
  playChiptune('start');

  cleanupActiveEngine();

  // === 1. Siapkan URL sumber ROM ===
  let gameUrl = '';
  let gameName = '';

  if (gameFile instanceof File || gameFile instanceof Blob) {
    // KRITIS: Bungkus File object menjadi Blob URL agar bisa di-fetch oleh engine
    gameUrl = URL.createObjectURL(gameFile);
    state.activeBlobUrl = gameUrl;
    gameName = gameFile.name || `game.${coreName}`;
    logMessage('EMU-JS', `Blob URL dibuat: ${gameUrl.substring(0, 60)}...`, 'info');
  } else if (typeof gameFile === 'string') {
    gameUrl = gameFile;
    gameName = gameFile.split('/').pop();
  }

  if (!gameUrl) {
    logMessage('ERROR', 'Gagal mendapatkan URL ROM. File tidak valid.', 'error');
    return;
  }

  state.activeEngine = 'emulatorjs';
  state.activeGameFile = gameFile;
  state.activeGameName = gameName;

  // === 2. Tampilkan container & inject target div ===
  DOM.idleScreen.classList.add('hidden');
  DOM.freej2meContainer.classList.remove('active');
  DOM.emulatorjsContainer.classList.add('active');

  // Bersihkan dan buat elemen target dengan display eksplisit
  DOM.emulatorjsViewport.innerHTML = '';
  const ejsTarget = document.createElement('div');
  ejsTarget.id = 'ejs-game-target';
  ejsTarget.style.cssText = 'width:100%;height:100%;position:relative;display:block;background:#000;';
  DOM.emulatorjsViewport.appendChild(ejsTarget);

  // === 3. Tentukan path data — gunakan lokal jika tersedia, fallback ke CDN ===
  // let pathToData = ENGINE_CONFIG.emulatorjsLocalData;
  let pathToData = ENGINE_CONFIG.emulatorjsCdnData;
  try {
    const checkRes = await fetch(`${pathToData}loader.js`, { method: 'HEAD' });
    if (!checkRes.ok) throw new Error('not found');
    logMessage('EMU-JS', `Loader lokal ditemukan di: ${pathToData}`, 'info');
  } catch {
    pathToData = ENGINE_CONFIG.emulatorjsCdnData;
    logMessage('EMU-JS', `Menggunakan CDN: ${pathToData}`, 'info');
  }

  // === 4. Set semua variabel global EmulatorJS SEBELUM script diinject ===
  window.EJS_player = '#ejs-game-target';
  window.EJS_core = coreName;
  window.EJS_gameUrl = gameUrl;          // <-- Blob URL, bukan nama file string
  window.EJS_gameName = gameName;
  window.EJS_pathtodata = pathToData;
  window.EJS_startOnLoaded = true;
  window.EJS_color = '#00f5d4';
  window.EJS_alignStartButton = 'center';

  DOM.saveStatusText.textContent = `AKTIF [${coreName.toUpperCase()}]`;
  DOM.saveStatusText.className = 'save-status-text';

  logMessage('EMU-JS', `Config: player="${window.EJS_player}", core="${coreName}", url="${gameUrl.substring(0, 50)}..."`, 'info');

  // === 5. KRITIS: Tunggu browser flush layout/paint sebelum inject script ===
  // Double-RAF memastikan elemen #ejs-game-target sudah ter-render di DOM
  // sebelum loader.js menjalankan querySelector-nya.
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  // Verifikasi elemen benar-benar ada di DOM
  const targetEl = document.getElementById('ejs-game-target');
  if (!targetEl) {
    logMessage('ERROR', 'Elemen #ejs-game-target tidak ditemukan di DOM. Abort.', 'error');
    return;
  }

  logMessage('EMU-JS', `Target DOM siap. Menginjeksi loader script dari: ${pathToData}`, 'info');

  // === 6. Inject script loader.js ===
  const script = document.createElement('script');
  script.id = 'ejs-loader-script';
  script.src = `${pathToData}loader.js`;

  script.onload = () => {
    logMessage('EMU-JS', `Loader.js berhasil dimuat. Canvas emulator sedang dirender...`, 'info');
  };

  script.onerror = () => {
    logMessage('ERROR', `Gagal memuat loader.js dari: ${script.src}`, 'error');
    alert(`Gagal memuat EmulatorJS engine.\nCoba periksa koneksi internet Anda atau letakkan engine di folder engines/emulatorjs/data/`);
  };

  document.body.appendChild(script);
}

// ============================================================================
// 2. Container J2ME-Web-Core (Java ME MIDlets)
// ============================================================================
async function activateJ2MEContainer(gameFile, customOptions = null) {
  logMessage('J2ME', `Memulai container FreeJ2ME (CheerpJ WebAssembly)...`, 'info');
  playChiptune('start');

  const isConfigChange = Boolean(customOptions);
  cleanupActiveEngine(isConfigChange);

  let gameName = '';
  if (gameFile instanceof File || gameFile instanceof Blob) {
    gameName = gameFile.name || 'game.jar';
  } else if (typeof gameFile === 'string') {
    gameName = gameFile.split('/').pop();
  }

  state.activeEngine = 'freej2me';
  state.activeGameFile = gameFile;
  state.activeGameName = gameName;

  // Sinkronkan label tombol UI
  const currentRes = J2ME_RESOLUTIONS[state.j2meResIndex] || J2ME_RESOLUTIONS[0];
  if (DOM.resolutionBtnText) {
    DOM.resolutionBtnText.textContent = currentRes.shortLabel;
  }
  if (DOM.rotateBtnText) {
    DOM.rotateBtnText.textContent = state.j2meRotateActive ? 'ROTASI: 90°' : 'ROTASI: OFF';
  }
  if (DOM.btnJ2meRotate) {
    DOM.btnJ2meRotate.classList.toggle('active', state.j2meRotateActive);
  }

  DOM.idleScreen.classList.add('hidden');
  DOM.emulatorjsContainer.classList.remove('active');
  DOM.freej2meContainer.classList.add('active');

  // Buat iframe FreeJ2ME-web, menyatu sempurna dengan monitor arcade
  const iframe = document.createElement('iframe');
  iframe.id = 'j2me-player';
  iframe.src = ENGINE_CONFIG.j2meCoreUrl;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.backgroundColor = '#000';
  iframe.style.overflow = 'hidden';
  iframe.setAttribute('allow', 'fullscreen; autoplay; cross-origin-isolated');
  iframe.setAttribute('title', 'FreeJ2ME Web Emulator');

  DOM.freej2meViewport.innerHTML = '';
  DOM.freej2meViewport.appendChild(iframe);

  DOM.saveStatusText.textContent = 'MEMUAT JVM J2ME...';
  DOM.saveStatusText.className = 'save-status-text';

  // Baca file JAR terlebih dahulu
  let buffer = null;
  try {
    if (gameFile instanceof File || gameFile instanceof Blob) {
      buffer = await gameFile.arrayBuffer();
    } else if (typeof gameFile === 'string') {
      const res = await fetch(gameFile);
      if (res.ok) buffer = await res.arrayBuffer();
    }
  } catch (e) {
    logMessage('ERROR', `Gagal membaca JAR: ${e.message}`, 'error');
    return;
  }

  if (!buffer) {
    logMessage('WARN', 'Tidak ada data file JAR untuk dimuat.', 'warn');
    return;
  }

  const optionsToSend = customOptions || getCurrentJ2MEOptions();
  logMessage('J2ME', `JAR "${gameName}" (${(buffer.byteLength/1024).toFixed(1)} KB) siap. Layar: ${currentRes.shortLabel}, Rotasi: ${state.j2meRotateActive ? '90°' : 'OFF'}`, 'info');

  let jarSent = false;
  const sendJar = () => {
    if (jarSent) return;
    try {
      if (iframe.contentWindow) {
        jarSent = true;
        iframe.contentWindow.postMessage(
          { type: 'LOAD_JAR', buffer: buffer.slice(0), name: gameName, options: optionsToSend },
          '*'
        );
        DOM.saveStatusText.textContent = 'JAVA RUNNING';
      }
    } catch (err) {
      jarSent = false;
      console.warn('postMessage JAR error:', err);
    }
  };

  // Dengarkan sinyal kesiapan dari iframe
  const readyHandler = (e) => {
    if (e.data && e.data.type === 'FREEJ2ME_READY') {
      logMessage('J2ME', `FreeJ2ME siap. Mengirim payload JAR "${gameName}"...`, 'info');
      sendJar();
    }
  };
  window.addEventListener('message', readyHandler, { once: true });

  // Fallback jika sinyal ready terlewat
  iframe.onload = () => {
    DOM.saveStatusText.textContent = 'MEMUAT JVM J2ME...';
    setTimeout(() => { if (!jarSent) sendJar(); }, 1200);
  };

  iframe.onerror = () => {
    logMessage('ERROR', 'Gagal memuat halaman FreeJ2ME-web runner.', 'error');
  };
}

// Backward-compatibility alias
const activateFreeJ2MEContainer = activateJ2MEContainer;

// ============================================================================
// Main Router
// ============================================================================
function routeGame(gameFile, filenameOverride = null, metaContext = null) {
  const filename = filenameOverride || (gameFile instanceof File ? gameFile.name : String(gameFile));
  const ext = getExtension(filename);
  const config = EXTENSION_CONFIG[ext];

  logMessage('ROUTER', `Menganalisis file: "${filename}" (.${ext})`, 'router');

  if (!config) {
    logMessage('ERROR', `Format file .${ext} belum didukung sistem.`, 'error');
    alert(`Format file ".${ext}" belum didukung.\nSilakan pilih file .jar untuk J2ME, atau .nes/.gba/.gb/.sfc untuk EmulatorJS.`);
    return;
  }

  updateMetadata(metaContext ? metaContext.title : filename, ext, config);

  if (config.engine === 'j2me-core' || config.engine === 'freej2me') {
    updateHeaderStatus(`J2ME ACTIVE // ${filename}`, config.badgeClass);
    activateJ2MEContainer(gameFile);
  } else if (config.engine === 'emulatorjs') {
    updateHeaderStatus(`EMU-JS [${config.core.toUpperCase()}] // ${filename}`, config.badgeClass);
    activateEmulatorJSContainer(gameFile, config.core);
  }

  // Smooth scroll ke monitor layar arcade
  DOM.screenFrame.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Pada mobile: otomatis alihkan pandangan ke tab Monitor
  if (window.innerWidth <= 860) {
    switchMobileTab('screen-stage');
  }
}

function handleFileInput(file) {
  if (!file) return;
  playChiptune('coin');
  logMessage('SYSTEM', `File dipilih dari input: "${file.name}" (${(file.size / 1024).toFixed(1)} KB)`, 'info');
  routeGame(file);
}

// ============================================================================
// 3. Manajemen Save Data (Export / Import)
// ============================================================================
/**
 * Mengekspor save state aktif ke file unduhan lokal di perangkat pengguna.
 */
async function exportSaveData() {
  playChiptune('click');

  if (!state.activeEngine) {
    alert('Tidak ada game aktif yang dapat diekspor. Silakan muat dan mainkan game terlebih dahulu.');
    logMessage('SAVE', 'Gagal ekspor: Belum ada game aktif.', 'warn');
    return;
  }

  logMessage('SAVE', `Mengekspor save data untuk engine: ${state.activeEngine.toUpperCase()}...`, 'info');

  const baseName = (state.activeGameName || 'game').replace(/\.[^/.]+$/, '');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  // 1. Ekspor Save Data EmulatorJS
  if (state.activeEngine === 'emulatorjs') {
    try {
      const emu = window.EJS_emulator;
      const gm = emu?.gameManager;

      if (!gm) {
        throw new Error('EmulatorJS gameManager belum siap. Pastikan game sudah berjalan.');
      }

      let data = null;
      let extension = 'state';

      // Coba ambil snapshot state instan
      if (typeof gm.getState === 'function') {
        data = await gm.getState();
        extension = 'state';
      } else if (typeof gm.getSaveFile === 'function') {
        data = await gm.getSaveFile();
        extension = 'sav';
      }

      if (!data || data.length === 0) {
        throw new Error('Data save masih kosong. Mainkan beberapa detik hingga game menyimpan state.');
      }

      const blob = new Blob([data], { type: 'application/octet-stream' });
      const filename = `${baseName}_${timestamp}.${extension}`;
      downloadBlob(blob, filename);

      playChiptune('coin');
      DOM.saveStatusText.textContent = `EKSPOR OK (${extension.toUpperCase()})`;
      logMessage('SAVE', `Save state berhasil diekspor: ${filename} (${(data.length / 1024).toFixed(1)} KB)`, 'info');
    } catch (err) {
      logMessage('ERROR', `Gagal ekspor save EmulatorJS: ${err.message}`, 'error');
      alert(`Gagal mengekspor save: ${err.message}`);
    }
  }

  // 2. Ekspor Save Data J2ME
  else if (state.activeEngine === 'j2me-core' || state.activeEngine === 'freej2me') {
    try {
      const iframe = document.getElementById('j2me-player') || document.getElementById('freej2me-iframe');
      const iframeDoc = iframe?.contentDocument || iframe?.contentWindow?.document;
      const exportBtn = iframeDoc?.getElementById('export-data-btn');

      if (exportBtn) {
        exportBtn.click();
        playChiptune('coin');
        DOM.saveStatusText.textContent = 'EKSPOR OK (ZIP)';
        logMessage('SAVE', 'Save data J2ME (.zip) berhasil diekspor.', 'info');
      } else {
        logMessage('WARN', 'Gunakan menu opsi/save pada player J2ME di layar.', 'warn');
        alert('Fitur save/export dapat diakses melalui antarmuka player J2ME di layar.');
      }
    } catch (err) {
      logMessage('ERROR', `Gagal ekspor J2ME: ${err.message}`, 'error');
    }
  }
}

/**
 * Mengimpor file save state yang diunggah pengguna kembali ke emulator.
 */
async function importSaveData(file) {
  if (!file) return;

  playChiptune('coin');
  logMessage('SAVE', `Mengimpor save file: "${file.name}" (${(file.size / 1024).toFixed(1)} KB)...`, 'info');

  if (!state.activeEngine) {
    alert('Jalankan game yang sesuai terlebih dahulu sebelum mengimpor save data.');
    logMessage('SAVE', 'Gagal impor: Jalankan game terlebih dahulu.', 'warn');
    return;
  }

  // 1. Impor ke EmulatorJS
  if (state.activeEngine === 'emulatorjs') {
    try {
      const emu = window.EJS_emulator;
      const gm = emu?.gameManager;

      if (!gm) {
        throw new Error('EmulatorJS belum aktif. Muat game terlebih dahulu.');
      }

      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const ext = getExtension(file.name);

      if (ext === 'state' && typeof gm.loadState === 'function') {
        await gm.loadState(bytes);
        DOM.saveStatusText.textContent = 'IMPOR STATE OK';
        logMessage('SAVE', `Save state "${file.name}" berhasil dimuat ke memori game!`, 'info');
      } else if (typeof gm.loadSaveFile === 'function') {
        await gm.loadSaveFile(bytes);
        DOM.saveStatusText.textContent = 'IMPOR SAV OK';
        logMessage('SAVE', `File battery RAM "${file.name}" berhasil dimuat!`, 'info');
      } else if (typeof gm.loadState === 'function') {
        await gm.loadState(bytes);
        DOM.saveStatusText.textContent = 'IMPOR OK';
        logMessage('SAVE', `Data save "${file.name}" berhasil dimuat!`, 'info');
      }

      playChiptune('start');
      alert(`Save data "${file.name}" berhasil dimuat ke emulator!`);
    } catch (err) {
      logMessage('ERROR', `Gagal memuat save: ${err.message}`, 'error');
      alert(`Gagal memuat file save: ${err.message}`);
    }
  }

  // 2. Impor ke J2ME-Web-Core
  else if (state.activeEngine === 'j2me-core' || state.activeEngine === 'freej2me') {
    try {
      const iframe = document.getElementById('j2me-player') || document.getElementById('freej2me-iframe');
      const iframeDoc = iframe?.contentDocument || iframe?.contentWindow?.document;
      const importInput = iframeDoc?.getElementById('import-data-file') || iframeDoc?.getElementById('fileInput');

      if (importInput) {
        const dt = new DataTransfer();
        dt.items.add(file);
        importInput.files = dt.files;
        importInput.dispatchEvent(new Event('change', { bubbles: true }));
        playChiptune('start');
        DOM.saveStatusText.textContent = 'IMPOR J2ME OK';
        logMessage('SAVE', `Save file "${file.name}" berhasil diimpor ke J2ME!`, 'info');
        alert(`Data J2ME "${file.name}" berhasil diimpor!`);
      } else {
        alert('Gunakan opsi impor file di dalam player J2ME.');
      }
    } catch (err) {
      logMessage('ERROR', `Gagal impor J2ME: ${err.message}`, 'error');
    }
  }
}

// ============================================================================
// 4. Katalog Game Bawaan (Game Library)
// ============================================================================
/**
 * Memuat daftar game dari assets/games.json dan merender ke grid.
 */
async function loadGameLibrary() {
  try {
    const res = await fetch(ENGINE_CONFIG.catalogueUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const games = await res.json();
    state.gamesLibrary = games;
    renderGameLibrary();
    logMessage('CATALOG', `Berhasil memuat ${games.length} game ke katalog bawaan.`, 'info');
  } catch (err) {
    logMessage('WARN', `Gagal membaca ${ENGINE_CONFIG.catalogueUrl}: ${err.message}`, 'warn');
    DOM.gamesGrid.innerHTML = `
      <div class="games-loading-spinner" style="color: var(--neon-pink);">
        ⚠️ Gagal memuat file ${ENGINE_CONFIG.catalogueUrl}
      </div>
    `;
  }
}

/**
 * Merender kartu-kartu game sesuai filter kategori dan pencarian teks.
 */
function renderGameLibrary() {
  const { gamesLibrary, selectedCategory, searchQuery } = state;
  const query = searchQuery.toLowerCase().trim();

  const filtered = gamesLibrary.filter(game => {
    // Filter Kategori
    const matchCategory =
      selectedCategory === 'all' ||
      game.badge.toUpperCase() === selectedCategory.toUpperCase();

    // Filter Pencarian
    const matchQuery =
      !query ||
      game.title.toLowerCase().includes(query) ||
      game.system.toLowerCase().includes(query) ||
      (game.genre && game.genre.toLowerCase().includes(query)) ||
      (game.developer && game.developer.toLowerCase().includes(query));

    return matchCategory && matchQuery;
  });

  if (filtered.length === 0) {
    DOM.gamesGrid.innerHTML = `
      <div class="games-loading-spinner" style="color: var(--text-muted);">
        Tidak ditemukan game yang sesuai dengan kriteria filter "${selectedCategory}" / "${escapeHtml(searchQuery)}".
      </div>
    `;
    return;
  }

  DOM.gamesGrid.innerHTML = filtered.map(game => {
    const badgeClass = (game.engine === 'freej2me' || game.engine === 'j2me-core') ? 'j2me' : 'ejs';
    return `
      <article class="game-card" data-id="${escapeHtml(game.id)}" tabindex="0" role="button" aria-label="Mainkan ${escapeHtml(game.title)}">
        <div class="game-card-cover-wrap">
          <img src="${escapeHtml(game.cover)}" alt="${escapeHtml(game.title)}" class="game-card-cover" loading="lazy">
          <span class="game-card-badge ${badgeClass}">${escapeHtml(game.badge)}</span>
        </div>
        <div class="game-card-content">
          <div class="game-card-meta">
            <span>${escapeHtml(game.developer || '')}</span>
            <span>★ ${escapeHtml(String(game.year || ''))}</span>
          </div>
          <h3 class="game-card-title">${escapeHtml(game.title)}</h3>
          <p class="game-card-desc">${escapeHtml(game.description || game.system)}</p>
          <button class="btn-card-play" data-id="${escapeHtml(game.id)}">
            <span>▶</span> MAINKAN SEKARANG
          </button>
        </div>
      </article>
    `;
  }).join('');

  // Event listener pada setiap kartu game
  DOM.gamesGrid.querySelectorAll('.game-card').forEach((card, idx) => {
    card.addEventListener('click', (e) => {
      gamepadFocusIndex = idx;
      DOM.gamesGrid.querySelectorAll('.game-card').forEach(c => c.classList.remove('gamepad-focus'));
      card.classList.add('gamepad-focus');

      const id = card.dataset.id;
      const game = state.gamesLibrary.find(g => g.id === id);
      if (game) {
        playChiptune('coin');
        logMessage('CATALOG', `Game dipilih dari katalog: "${game.title}" (${game.system})`, 'info');
        routeGame(game.romPath, game.romPath.split('/').pop(), game);
      }
    });

    // Aksesibilitas keyboard Enter
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });

  // Pulihkan sorotan fokus gamepad jika ada kartu yang aktif
  if (gamepadFocusIndex >= 0) {
    const cards = DOM.gamesGrid.querySelectorAll('.game-card');
    if (cards.length > 0) {
      if (gamepadFocusIndex >= cards.length) gamepadFocusIndex = cards.length - 1;
      cards[gamepadFocusIndex].classList.add('gamepad-focus');
    } else {
      gamepadFocusIndex = -1;
    }
  }
}

// ============================================================================
// Mobile Viewport Tabs Switcher
// ============================================================================
function switchMobileTab(targetId) {
  DOM.mobileTabs.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.target === targetId);
  });

  if (targetId === 'screen-stage') {
    DOM.controlsSidebar.classList.add('mobile-hidden');
    DOM.screenStage.classList.remove('mobile-hidden');
    DOM.telemetryBar.classList.add('mobile-hidden');
  } else if (targetId === 'controls-sidebar') {
    DOM.controlsSidebar.classList.remove('mobile-hidden');
    DOM.screenStage.classList.add('mobile-hidden');
    DOM.telemetryBar.classList.add('mobile-hidden');
  } else if (targetId === 'telemetry-bar') {
    DOM.controlsSidebar.classList.add('mobile-hidden');
    DOM.screenStage.classList.add('mobile-hidden');
    DOM.telemetryBar.classList.remove('mobile-hidden');
  } else if (targetId === 'library-anchor') {
    DOM.libraryAnchor.scrollIntoView({ behavior: 'smooth' });
  }
}

// ============================================================================
// Event Listeners: Input, Controls, Save Manager, Library
// ============================================================================
// File input (klik tombol / dropzone)
DOM.fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    handleFileInput(e.target.files[0]);
    e.target.value = ''; // Reset agar file yang sama bisa dipilih ulang jika diperlukan
  }
});

// Dropzone Drag & Drop (Cartridge Slot)
['dragenter', 'dragover'].forEach(eventName => {
  DOM.dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    DOM.dropzone.classList.add('dragover');
  });
});

['dragleave', 'dragend'].forEach(eventName => {
  DOM.dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    DOM.dropzone.classList.remove('dragover');
  });
});

DOM.dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
  DOM.dropzone.classList.remove('dragover');

  let file = null;
  if (e.dataTransfer) {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      file = e.dataTransfer.files[0];
    } else if (e.dataTransfer.items) {
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        if (e.dataTransfer.items[i].kind === 'file') {
          file = e.dataTransfer.items[i].getAsFile();
          if (file) break;
        }
      }
    }
  }

  if (file) {
    logMessage('SYSTEM', `File diterima via Drag & Drop Cartridge: "${file.name}"`, 'info');
    handleFileInput(file);
  }
});

// Helper untuk menonaktifkan pointer-events pada iframe saat drag berlangsung
// Mencegah Firefox/Chrome memicu Security Error atau navigasi file:/// saat cursor melintas di atas iframe
function setIframesPointerEvents(enabled) {
  document.querySelectorAll('iframe').forEach(frame => {
    frame.style.pointerEvents = enabled ? 'auto' : 'none';
  });
}

// Global Drag & Drop Guards pada Window
window.addEventListener('dragenter', (e) => {
  e.preventDefault();
  setIframesPointerEvents(false);
});

window.addEventListener('dragover', (e) => {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
});

window.addEventListener('dragleave', (e) => {
  // Pulihkan pointer-events jika drag benar-benar meninggalkan layar browser
  if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
    setIframesPointerEvents(true);
  }
});

window.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
  setIframesPointerEvents(true);

  // Jika drop dilepaskan di area stage umum (bukan dropzone), tetap luncurkan game
  if (!e.target.closest('#dropzone')) {
    let file = null;
    if (e.dataTransfer) {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        file = e.dataTransfer.files[0];
      } else if (e.dataTransfer.items) {
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          if (e.dataTransfer.items[i].kind === 'file') {
            file = e.dataTransfer.items[i].getAsFile();
            if (file) break;
          }
        }
      }
    }
    if (file) {
      logMessage('SYSTEM', `File diterima via Drag & Drop Layar: "${file.name}"`, 'info');
      handleFileInput(file);
    }
  }
});

// Save Manager: Export
DOM.btnExportSave.addEventListener('click', exportSaveData);

// Save Manager: Import
DOM.btnImportSave.addEventListener('click', () => {
  playChiptune('click');
  DOM.saveFileInput.click();
});

DOM.saveFileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    importSaveData(e.target.files[0]);
    DOM.saveFileInput.value = null; // reset input
  }
});

// Library Search Input
DOM.librarySearch.addEventListener('input', (e) => {
  state.searchQuery = e.target.value;
  renderGameLibrary();
});

// Library Category Filter Buttons
DOM.categoryFilters.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  playChiptune('click');
  DOM.categoryFilters.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.selectedCategory = btn.dataset.filter;
  renderGameLibrary();
});

// Reset
DOM.btnReset.addEventListener('click', resetToIdle);

// Fullscreen
DOM.btnFullscreen.addEventListener('click', () => {
  playChiptune('click');
  if (!document.fullscreenElement) {
    DOM.screenFrame.requestFullscreen().catch(err => {
      logMessage('ERROR', `Gagal masuk fullscreen: ${err.message}`, 'error');
    });
  } else {
    document.exitFullscreen();
  }
});

// 1. J2ME Resolution / Screen Size Selector
if (DOM.btnJ2meResolution) {
  DOM.btnJ2meResolution.addEventListener('click', () => {
    playChiptune('click');
    if (state.activeEngine !== 'freej2me' || !state.activeGameFile) {
      alert('Pilih dan jalankan game J2ME terlebih dahulu untuk mengatur resolusi layar.');
      return;
    }

    state.j2meResIndex = (state.j2meResIndex + 1) % J2ME_RESOLUTIONS.length;
    const currentRes = J2ME_RESOLUTIONS[state.j2meResIndex];
    if (DOM.resolutionBtnText) {
      DOM.resolutionBtnText.textContent = currentRes.shortLabel;
    }
    logMessage('J2ME', `Mengubah resolusi layar ke: ${currentRes.label} (Rotasi: ${state.j2meRotateActive ? '90°' : 'OFF'})`, 'info');

    activateJ2MEContainer(state.activeGameFile, getCurrentJ2MEOptions());
  });
}

// 2. J2ME 90° Screen Rotation Toggle
if (DOM.btnJ2meRotate) {
  DOM.btnJ2meRotate.addEventListener('click', () => {
    playChiptune('click');
    if (state.activeEngine !== 'freej2me' || !state.activeGameFile) {
      alert('Pilih dan jalankan game J2ME terlebih dahulu untuk memutar layar.');
      return;
    }

    state.j2meRotateActive = !state.j2meRotateActive;
    if (DOM.rotateBtnText) {
      DOM.rotateBtnText.textContent = state.j2meRotateActive ? 'ROTASI: 90°' : 'ROTASI: OFF';
    }
    if (DOM.btnJ2meRotate) {
      DOM.btnJ2meRotate.classList.toggle('active', state.j2meRotateActive);
    }
    const currentRes = J2ME_RESOLUTIONS[state.j2meResIndex] || J2ME_RESOLUTIONS[0];
    logMessage('J2ME', `Rotasi 90°: ${state.j2meRotateActive ? 'AKTIF' : 'NONAKTIF'} (Ukuran: ${currentRes.shortLabel})`, 'info');

    activateJ2MEContainer(state.activeGameFile, getCurrentJ2MEOptions());
  });
}

// CRT Scanlines Toggle
DOM.btnToggleCrt.addEventListener('click', () => {
  playChiptune('click');
  state.crtEnabled = !state.crtEnabled;
  document.body.classList.toggle('crt-enabled', state.crtEnabled);
  DOM.btnToggleCrt.classList.toggle('active', state.crtEnabled);
  logMessage('CRT', `Efek scanline CRT: ${state.crtEnabled ? 'AKTIF' : 'NONAKTIF'}`, 'info');
});

// SFX Toggle
DOM.btnToggleSfx.addEventListener('click', () => {
  state.sfxEnabled = !state.sfxEnabled;
  DOM.btnToggleSfx.classList.toggle('active', state.sfxEnabled);
  DOM.sfxIcon.textContent = state.sfxEnabled ? '🔊' : '🔇';
  if (state.sfxEnabled) playChiptune('coin');
  logMessage('AUDIO', `Efek suara arcade: ${state.sfxEnabled ? 'AKTIF' : 'NONAKTIF'}`, 'info');
});

// Clear Log
DOM.btnClearLog.addEventListener('click', () => {
  playChiptune('click');
  DOM.activityLog.innerHTML = '';
});

// Easter egg chiptune on logo or coin badge
DOM.brandLogo.addEventListener('click', () => playChiptune('coin'));
DOM.coinBadge.addEventListener('click', () => playChiptune('coin'));

// Mobile Tab Buttons
DOM.mobileTabs.forEach(btn => {
  btn.addEventListener('click', () => {
    playChiptune('click');
    switchMobileTab(btn.dataset.target);
  });
});

// ============================================================================
// Web Gamepad API Subsystem (Navigasi Katalog Gamepad PS3 / Standar)
// ============================================================================
let gamepadFocusIndex = -1;
let lastGamepadNavTimestamp = 0;
let prevGamepadButtonCross = false;
let isGamepadNavHeld = false;
let connectedGamepadsCount = 0;

const GAMEPAD_DEADZONE = 0.5;
const GAMEPAD_NAV_COOLDOWN_MS = 200; // Cooldown 200ms untuk mencegah pergeseran terlalu cepat saat stik/d-pad ditahan

/**
 * Menghitung jumlah kolom kartu pada grid secara dinamis berdasarkan posisi elemen.
 */
function getGridColumnCount(cards) {
  if (!cards || cards.length <= 1) return 1;
  const firstTop = cards[0].offsetTop;
  let cols = 0;
  for (let i = 0; i < cards.length; i++) {
    if (Math.abs(cards[i].offsetTop - firstTop) < 15) {
      cols++;
    } else {
      break;
    }
  }
  return Math.max(1, cols);
}

/**
 * Memperbarui sorotan fokus pada kartu game di katalog.
 */
function updateGamepadFocus(newIndex, cards) {
  if (!cards || cards.length === 0) return;
  newIndex = Math.max(0, Math.min(cards.length - 1, newIndex));

  cards.forEach(c => c.classList.remove('gamepad-focus'));
  gamepadFocusIndex = newIndex;

  const targetCard = cards[gamepadFocusIndex];
  if (targetCard) {
    targetCard.classList.add('gamepad-focus');
    targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    playChiptune('click');
  }
}

/**
 * Sistem polling gamepad: membaca input analog stik kiri dan D-pad dengan deadzone & cooldown.
 */
function pollGamepad() {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = null;

  for (let i = 0; i < gamepads.length; i++) {
    if (gamepads[i] && gamepads[i].connected) {
      gp = gamepads[i];
      break;
    }
  }

  // Polling navigasi katalog hanya berjalan saat tidak ada game yang sedang aktif di emulator
  if (gp && !state.activeEngine) {
    const cards = Array.from(DOM.gamesGrid.querySelectorAll('.game-card'));
    if (cards.length > 0) {
      const b = gp.buttons;
      const axes = gp.axes;

      // 1. Dukungan Analog Kiri (Axes 0 = X, Axes 1 = Y) dengan Deadzone 0.5
      const axisX = (axes && axes[0] !== undefined) ? axes[0] : 0;
      const axisY = (axes && axes[1] !== undefined) ? axes[1] : 0;

      const analogLeft = axisX < -GAMEPAD_DEADZONE;
      const analogRight = axisX > GAMEPAD_DEADZONE;
      const analogUp = axisY < -GAMEPAD_DEADZONE;
      const analogDown = axisY > GAMEPAD_DEADZONE;

      // 2. Dukungan D-Pad (12=Atas, 13=Bawah, 14=Kiri, 15=Kanan)
      const dpadUp = Boolean(b[12] && (b[12].pressed || b[12].value > 0.5));
      const dpadDown = Boolean(b[13] && (b[13].pressed || b[13].value > 0.5));
      const dpadLeft = Boolean(b[14] && (b[14].pressed || b[14].value > 0.5));
      const dpadRight = Boolean(b[15] && (b[15].pressed || b[15].value > 0.5));

      // Gabungkan pembacaan D-Pad dan Analog
      const moveLeft = dpadLeft || analogLeft;
      const moveRight = dpadRight || analogRight;
      const moveUp = dpadUp || analogUp;
      const moveDown = dpadDown || analogDown;

      // Tombol A (Xbox) / Cross (PlayStation / BthPS3) - Button index 0
      const btnCross = Boolean(b[0] && (b[0].pressed || b[0].value > 0.5));

      const anyMove = moveLeft || moveRight || moveUp || moveDown;
      const now = performance.now();

      // 3. Mekanisme Cooldown (200ms) saat stik / D-Pad ditahan
      if (anyMove) {
        if (!isGamepadNavHeld || (now - lastGamepadNavTimestamp >= GAMEPAD_NAV_COOLDOWN_MS)) {
          isGamepadNavHeld = true;
          lastGamepadNavTimestamp = now;

          if (gamepadFocusIndex < 0 || gamepadFocusIndex >= cards.length) {
            updateGamepadFocus(0, cards);
          } else {
            const cols = getGridColumnCount(cards);
            let nextIndex = gamepadFocusIndex;

            // Navigasi Grid 2D:
            // Kiri / Kanan menggeser indeks sebanyak -1 / +1
            if (moveLeft) {
              nextIndex = Math.max(0, gamepadFocusIndex - 1);
            } else if (moveRight) {
              nextIndex = Math.min(cards.length - 1, gamepadFocusIndex + 1);
            }
            // Atas / Bawah melompat sebanyak jumlah kolom dinamis
            else if (moveUp) {
              nextIndex = Math.max(0, gamepadFocusIndex - cols);
            } else if (moveDown) {
              if (gamepadFocusIndex + cols < cards.length) {
                nextIndex = gamepadFocusIndex + cols;
              } else {
                nextIndex = cards.length - 1;
              }
            }

            if (nextIndex !== gamepadFocusIndex) {
              updateGamepadFocus(nextIndex, cards);
            }
          }
        }
      } else {
        // Reset status tahan agar input berikutnya langsung instan
        isGamepadNavHeld = false;
      }

      // Tekan tombol Cross / A untuk memuat game yang sedang disorot
      if (btnCross && !prevGamepadButtonCross) {
        if (gamepadFocusIndex >= 0 && gamepadFocusIndex < cards.length) {
          const targetCard = cards[gamepadFocusIndex];
          targetCard.click();
        }
      }
      prevGamepadButtonCross = btnCross;
    }
  }

  requestAnimationFrame(pollGamepad);
}

function initGamepadSupport() {
  window.addEventListener('gamepadconnected', (e) => {
    connectedGamepadsCount++;
    logMessage('GAMEPAD', `Gamepad terhubung: ${e.gamepad.id} (Port #${e.gamepad.index})`, 'info');
    playChiptune('coin');
  });

  window.addEventListener('gamepaddisconnected', (e) => {
    connectedGamepadsCount = Math.max(0, connectedGamepadsCount - 1);
    logMessage('GAMEPAD', `Gamepad terputus: ${e.gamepad.id}`, 'warn');
    if (connectedGamepadsCount === 0) {
      document.querySelectorAll('.gamepad-focus').forEach(el => el.classList.remove('gamepad-focus'));
      gamepadFocusIndex = -1;
    }
  });

  requestAnimationFrame(pollGamepad);
}

// Inisialisasi awal saat halaman dimuat
function initApp() {
  logMessage('SYSTEM', 'PIXEL EMULATOR STATION v1.3 BOOT COMPLETE.', 'info');
  logMessage('SYSTEM', 'Game Library, Save Data Manager & Web Gamepad API siap.', 'info');
  loadGameLibrary();
  initGamepadSupport();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
