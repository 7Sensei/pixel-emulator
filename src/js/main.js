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
  freej2meWebUrl: 'https://zb3.github.io/freej2me-web/web/',
  freej2meCdnFallback: 'https://zb3.github.io/freej2me-web/web/',
  romsDir: 'roms',
  catalogueUrl: 'assets/games.json'
};

// Peta Dukungan Ekstensi ke Engine & Core
const EXTENSION_CONFIG = {
  // Java ME
  jar: { engine: 'freej2me', core: 'midp-2.0', name: 'Java ME (FreeJ2ME)', badgeClass: 'active-freej2me' },
  jad: { engine: 'freej2me', core: 'midp-2.0', name: 'Java ME (FreeJ2ME)', badgeClass: 'active-freej2me' },

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

// State Global Aplikasi
const state = {
  activeEngine: null, // 'freej2me' | 'emulatorjs' | null
  activeGameFile: null,
  activeGameName: 'NONE',
  activeBlobUrl: null,
  sfxEnabled: true,
  crtEnabled: true,
  gamesLibrary: [],
  selectedCategory: 'all',
  searchQuery: ''
};

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
function cleanupActiveEngine() {
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
  let pathToData = ENGINE_CONFIG.emulatorjsLocalData;
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
// 2. Container FreeJ2ME-web (Java ME MIDlets)
// ============================================================================
async function activateFreeJ2MEContainer(gameFile) {
  logMessage('FREEJ2ME', `Memulai aktivasi container FreeJ2ME-web...`, 'info');
  playChiptune('start');

  cleanupActiveEngine();

  let gameName = '';
  if (gameFile instanceof File || gameFile instanceof Blob) {
    gameName = gameFile.name || 'game.jar';
  } else if (typeof gameFile === 'string') {
    gameName = gameFile.split('/').pop();
  }

  state.activeEngine = 'freej2me';
  state.activeGameFile = gameFile;
  state.activeGameName = gameName;

  DOM.idleScreen.classList.add('hidden');
  DOM.emulatorjsContainer.classList.remove('active');
  DOM.freej2meContainer.classList.add('active');

  // Langsung gunakan URL CDN (freej2meWebUrl sudah mengarah ke CDN)
  const playerUrl = ENGINE_CONFIG.freej2meWebUrl;
  logMessage('FREEJ2ME', `Memuat FreeJ2ME Web dari: ${playerUrl}`, 'info');

  const iframe = document.createElement('iframe');
  iframe.id = 'freej2me-iframe';
  iframe.src = playerUrl;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.setAttribute('allow', 'autoplay; fullscreen');
  iframe.setAttribute('title', 'FreeJ2ME Web Player');

  DOM.freej2meViewport.innerHTML = '';
  DOM.freej2meViewport.appendChild(iframe);

  DOM.saveStatusText.textContent = 'AKTIF [J2ME RMS]';
  DOM.saveStatusText.className = 'save-status-text';

  logMessage('FREEJ2ME', `Container iFrame terpasang. Menyiapkan CheerpJ...`, 'info');

  iframe.onload = async () => {
    logMessage('FREEJ2ME', `iFrame FreeJ2ME siap.`, 'info');

    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      const targetInput = iframeDoc.getElementById('game-file-input');

      if (!targetInput) {
        logMessage('FREEJ2ME', `Player FreeJ2ME siap di kanvas.`, 'info');
        return;
      }

      if (gameFile instanceof File) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(gameFile);
        targetInput.files = dataTransfer.files;
        targetInput.dispatchEvent(new Event('change', { bubbles: true }));
        logMessage('FREEJ2ME', `File JAR "${gameName}" langsung disuntikkan ke launcher FreeJ2ME.`, 'info');
      } else if (typeof gameFile === 'string') {
        try {
          const fetchRes = await fetch(gameFile);
          if (fetchRes.ok) {
            const blob = await fetchRes.blob();
            const fileObj = new File([blob], gameName, { type: 'application/java-archive' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(fileObj);
            targetInput.files = dataTransfer.files;
            targetInput.dispatchEvent(new Event('change', { bubbles: true }));
            logMessage('FREEJ2ME', `Preset "${gameName}" berhasil diproses ke kanvas FreeJ2ME.`, 'info');
          } else {
            logMessage('FREEJ2ME', `Preset file "${gameName}" belum ada di folder roms/. Drag-and-drop manual didukung.`, 'warn');
          }
        } catch {
          logMessage('FREEJ2ME', `Silakan unggah file JAR secara manual di kanvas player.`, 'info');
        }
      }
    } catch {
      logMessage('FREEJ2ME', `Player aktif di viewport.`, 'info');
    }
  };
}

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

  if (config.engine === 'freej2me') {
    updateHeaderStatus(`J2ME ACTIVE // ${filename}`, config.badgeClass);
    activateFreeJ2MEContainer(gameFile);
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

  // 2. Ekspor Save Data FreeJ2ME
  else if (state.activeEngine === 'freej2me') {
    try {
      const iframe = document.getElementById('freej2me-iframe');
      const iframeDoc = iframe?.contentDocument || iframe?.contentWindow?.document;
      const exportBtn = iframeDoc?.getElementById('export-data-btn');

      if (exportBtn) {
        exportBtn.click();
        playChiptune('coin');
        DOM.saveStatusText.textContent = 'EKSPOR OK (ZIP)';
        logMessage('SAVE', 'Save data & RMS FreeJ2ME (.zip) berhasil diekspor melalui launcher.', 'info');
      } else {
        logMessage('WARN', 'Gunakan menu "Export Data" di dalam kanvas launcher FreeJ2ME.', 'warn');
        alert('Silakan tekan tombol "Export Data" pada panel launcher FreeJ2ME di layar.');
      }
    } catch (err) {
      logMessage('ERROR', `Gagal ekspor FreeJ2ME: ${err.message}`, 'error');
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

  // 2. Impor ke FreeJ2ME-web
  else if (state.activeEngine === 'freej2me') {
    try {
      const iframe = document.getElementById('freej2me-iframe');
      const iframeDoc = iframe?.contentDocument || iframe?.contentWindow?.document;
      const importInput = iframeDoc?.getElementById('import-data-file');

      if (importInput) {
        const dt = new DataTransfer();
        dt.items.add(file);
        importInput.files = dt.files;
        importInput.dispatchEvent(new Event('change', { bubbles: true }));
        playChiptune('start');
        DOM.saveStatusText.textContent = 'IMPOR J2ME OK';
        logMessage('SAVE', `Save file .zip "${file.name}" berhasil diimpor ke FreeJ2ME!`, 'info');
        alert(`Data FreeJ2ME "${file.name}" berhasil diimpor!`);
      } else {
        alert('Gunakan opsi "Import Data" di dalam kanvas launcher FreeJ2ME.');
      }
    } catch (err) {
      logMessage('ERROR', `Gagal impor FreeJ2ME: ${err.message}`, 'error');
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
    const badgeClass = game.engine === 'freej2me' ? 'j2me' : 'ejs';
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
  DOM.gamesGrid.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('click', (e) => {
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
// File input
DOM.fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    handleFileInput(e.target.files[0]);
  }
});

// Dropzone drag & drop
DOM.dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  DOM.dropzone.classList.add('dragover');
});

DOM.dropzone.addEventListener('dragleave', () => {
  DOM.dropzone.classList.remove('dragover');
});

DOM.dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  DOM.dropzone.classList.remove('dragover');
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    handleFileInput(e.dataTransfer.files[0]);
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

// Inisialisasi awal saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
  logMessage('SYSTEM', 'PIXEL EMULATOR STATION v1.3 BOOT COMPLETE.', 'info');
  logMessage('SYSTEM', 'Game Library & Save Data Manager siap.', 'info');
  loadGameLibrary();
});
