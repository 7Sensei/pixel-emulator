/**
 * ============================================================================
 * Pixel Emulator - Main Router & Integration Engine
 * ============================================================================
 * Menangani pemilihan game, deteksi ekstensi file, dan routing ke container:
 * - .jar / .jad -> Container FreeJ2ME-web
 * - .nes, .gba, .gb, .sfc, dll -> Container EmulatorJS
 */

// Konfigurasi Path Engine Lokal
const ENGINE_PATHS = {
  emulatorjs: 'engines/emulatorjs',
  freej2me: 'engines/freej2me',
  romsDir: 'roms'
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
  gb:  { engine: 'emulatorjs', core: 'gb',  name: 'Game Boy', badgeClass: 'active-emulatorjs' },
  gbc: { engine: 'emulatorjs', core: 'gb',  name: 'Game Boy Color', badgeClass: 'active-emulatorjs' },
  sfc: { engine: 'emulatorjs', core: 'snes', name: 'Super Nintendo (SNES)', badgeClass: 'active-emulatorjs' },
  smc: { engine: 'emulatorjs', core: 'snes', name: 'Super Nintendo (SNES)', badgeClass: 'active-emulatorjs' },

  // Sega
  gen: { engine: 'emulatorjs', core: 'segaMD', name: 'Sega Mega Drive / Genesis', badgeClass: 'active-emulatorjs' },
  smd: { engine: 'emulatorjs', core: 'segaMD', name: 'Sega Mega Drive', badgeClass: 'active-emulatorjs' },
  md:  { engine: 'emulatorjs', core: 'segaMD', name: 'Sega Mega Drive', badgeClass: 'active-emulatorjs' }
};

// State Aplikasi
const state = {
  activeEngine: null, // 'freej2me' | 'emulatorjs' | null
  activeGame: null,   // { name, extension, url, fileObject }
  activeBlobUrl: null
};

// DOM Elements
const DOM = {
  fileInput: document.getElementById('game-file-input'),
  dropzone: document.getElementById('dropzone'),
  presetSelect: document.getElementById('preset-select'),
  btnLoadPreset: document.getElementById('btn-load-preset'),
  btnFullscreen: document.getElementById('btn-fullscreen'),
  btnReset: document.getElementById('btn-reset'),
  screenFrame: document.getElementById('screen-frame'),
  
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
  activityLog: document.getElementById('activity-log')
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
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
}

// ============================================================================
// File & Extension Helpers
// ============================================================================
function getExtension(filename) {
  if (!filename || typeof filename !== 'string') return '';
  const parts = filename.split('.');
  if (parts.length <= 1) return '';
  return parts.pop().toLowerCase().trim();
}

function updateMetadata(filename, ext, config) {
  DOM.metaFilename.textContent = filename || '-';
  DOM.metaExtension.textContent = ext ? `.${ext.toUpperCase()}` : '-';
  DOM.metaEngine.textContent = config ? config.name : '-';
  DOM.metaCore.textContent = config ? config.core.toUpperCase() : '-';
}

function updateHeaderStatus(text, badgeClass = null) {
  DOM.headerStatusText.textContent = text;
  DOM.headerStatusDot.className = 'status-dot';
  if (badgeClass) {
    DOM.headerStatusDot.classList.add(badgeClass);
  }
}

// ============================================================================
// Core Router: Memilih Container Berdasarkan Ekstensi
// ============================================================================
function routeGame(gameData) {
  const { name, url, fileObject } = gameData;
  const ext = getExtension(name);
  const config = EXTENSION_CONFIG[ext];

  logMessage('ROUTER', `Memeriksa ekstensi file: "${name}" (.${ext})`, 'router');

  if (!config) {
    logMessage('ERROR', `Format file .${ext} belum didukung sistem.`, 'error');
    alert(`Format file ".${ext}" belum didukung.\nSilakan pilih file .jar untuk J2ME, atau .nes/.gba/.gb/.sfc untuk EmulatorJS.`);
    return;
  }

  // Bersihkan game sebelumnya
  cleanupActiveEngine();

  // Simpan data state
  state.activeGame = gameData;
  state.activeEngine = config.engine;
  updateMetadata(name, ext, config);

  // Sembunyikan idle screen
  DOM.idleScreen.classList.add('hidden');

  if (config.engine === 'freej2me') {
    logMessage('ROUTER', `Ekstensi .${ext} terdeteksi -> Mengarahkan ke Container FreeJ2ME-web`, 'info');
    updateHeaderStatus(`FreeJ2ME Web Active (${name})`, config.badgeClass);
    activateFreeJ2MEContainer(name, url, fileObject);
  } else if (config.engine === 'emulatorjs') {
    logMessage('ROUTER', `Ekstensi .${ext} terdeteksi -> Mengarahkan ke Container EmulatorJS [Core: ${config.core}]`, 'info');
    updateHeaderStatus(`EmulatorJS Active [${config.core.toUpperCase()}] (${name})`, config.badgeClass);
    activateEmulatorJSContainer(name, url, fileObject, config.core);
  }
}

// ============================================================================
// 1. FreeJ2ME-web Engine Loader
// ============================================================================
function activateFreeJ2MEContainer(filename, gameUrl, fileObject) {
  // Aktifkan container DOM
  DOM.emulatorjsContainer.classList.remove('active');
  DOM.freej2meContainer.classList.add('active');
  DOM.freej2meViewport.innerHTML = '';

  logMessage('FREEJ2ME', `Menyiapkan kanvas Java ME untuk: ${filename}`, 'info');

  // Periksa apakah engine build sudah tersedia di server lokal
  const scriptPath = `${ENGINE_PATHS.freej2me}/freej2me-web.js`;

  // Render wrapper kanvas J2ME
  DOM.freej2meViewport.innerHTML = `
    <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
      <canvas id="freej2me-canvas" width="240" height="320" style="background: #111; border: 2px solid #fee440; border-radius: 8px; box-shadow: 0 0 20px rgba(254, 228, 64, 0.3); max-height: 90%;"></canvas>
      <div id="freej2me-overlay-msg" style="position: absolute; bottom: 20px; color: #fee440; font-family: var(--font-mono); font-size: 0.8rem; background: rgba(0,0,0,0.7); padding: 4px 12px; border-radius: 4px;">
        Container FreeJ2ME Siap &bull; File: ${escapeHtml(filename)}
      </div>
    </div>
  `;

  // Injeksi script atau tampilkan panduan build jika file belum diletakkan
  checkAndLoadScript(scriptPath, () => {
    logMessage('FREEJ2ME', `Engine FreeJ2ME-web terdeteksi. Memulai MIDlet loader...`, 'info');
    if (window.FreeJ2ME && typeof window.FreeJ2ME.start === 'function') {
      window.FreeJ2ME.start({
        canvas: document.getElementById('freej2me-canvas'),
        jarUrl: gameUrl
      });
    }
  }, () => {
    // Fallback jika file build belum dimasukkan ke engines/freej2me/
    showEngineNotice(
      DOM.freej2meViewport,
      'FreeJ2ME-web Engine Build Belum Terpasang',
      `File game <strong>${escapeHtml(filename)}</strong> berhasil diarahkan ke container FreeJ2ME. Letakkan hasil build repositori <em>freej2me-web</em> ke dalam folder:`,
      `${ENGINE_PATHS.freej2me}/ (contoh: freej2me-web.js, freej2me-web.wasm)`
    );
  });
}

// ============================================================================
// 2. EmulatorJS Engine Loader
// ============================================================================
function activateEmulatorJSContainer(filename, gameUrl, fileObject, coreName) {
  // Aktifkan container DOM
  DOM.freej2meContainer.classList.remove('active');
  DOM.emulatorjsContainer.classList.add('active');
  DOM.emulatorjsViewport.innerHTML = '';

  logMessage('EMU-JS', `Menyiapkan instance EmulatorJS [Core: ${coreName}] untuk: ${filename}`, 'info');

  const loaderScriptPath = `${ENGINE_PATHS.emulatorjs}/data/loader.js`;

  // Buat target div game
  const gameDiv = document.createElement('div');
  gameDiv.id = 'game-instance';
  gameDiv.style.width = '100%';
  gameDiv.style.height = '100%';
  DOM.emulatorjsViewport.appendChild(gameDiv);

  // Setup konfigurasi global EmulatorJS (EJS_*)
  window.EJS_player = '#game-instance';
  window.EJS_core = coreName;
  window.EJS_gameUrl = gameUrl;
  window.EJS_pathtodata = `${ENGINE_PATHS.emulatorjs}/data/`;
  window.EJS_startOnLoaded = true;

  checkAndLoadScript(loaderScriptPath, () => {
    logMessage('EMU-JS', `Script loader EmulatorJS berhasil dimuat. Menginisialisasi ROM...`, 'info');
  }, () => {
    // Fallback jika file core belum dimasukkan ke engines/emulatorjs/
    showEngineNotice(
      DOM.emulatorjsViewport,
      'EmulatorJS Core Belum Terpasang',
      `File ROM <strong>${escapeHtml(filename)}</strong> berhasil diarahkan ke container EmulatorJS (Core: <code>${coreName}</code>). Letakkan file build repositori <em>EmulatorJS</em> ke dalam folder:`,
      `${ENGINE_PATHS.emulatorjs}/ (contoh: data/loader.js, cores/${coreName}.wasm)`
    );
  });
}

// ============================================================================
// Helper: Deteksi Script dan Tampilkan Notice
// ============================================================================
function checkAndLoadScript(src, onSuccess, onFail) {
  // Tes apakah script dapat di-fetch secara lokal
  fetch(src, { method: 'HEAD' })
    .then(res => {
      if (res.ok) {
        const s = document.createElement('script');
        s.src = src;
        s.onload = onSuccess;
        s.onerror = onFail;
        document.body.appendChild(s);
      } else {
        onFail();
      }
    })
    .catch(() => {
      onFail();
    });
}

function showEngineNotice(container, title, description, path) {
  const noticeBox = document.createElement('div');
  noticeBox.className = 'core-notice-box';
  noticeBox.innerHTML = `
    <div class="core-notice-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      ${escapeHtml(title)}
    </div>
    <div class="core-notice-body">
      ${description}
      <div class="core-notice-path">${escapeHtml(path)}</div>
    </div>
    <div style="font-size: 0.75rem; color: #8c9bb5;">
      <em>Logika routing router bekerja dengan sempurna. Tampilan ini otomatis digantikan oleh emulator sesaat setelah file engine diletakkan.</em>
    </div>
  `;
  container.appendChild(noticeBox);
}

// ============================================================================
// Reset & Cleanup
// ============================================================================
function cleanupActiveEngine() {
  if (state.activeBlobUrl) {
    URL.revokeObjectURL(state.activeBlobUrl);
    state.activeBlobUrl = null;
  }

  // Bersihkan viewports
  DOM.freej2meViewport.innerHTML = '';
  DOM.emulatorjsViewport.innerHTML = '';
  DOM.freej2meContainer.classList.remove('active');
  DOM.emulatorjsContainer.classList.remove('active');

  // Bersihkan variabel global EmulatorJS
  delete window.EJS_player;
  delete window.EJS_core;
  delete window.EJS_gameUrl;

  state.activeEngine = null;
  state.activeGame = null;
}

function resetToIdle() {
  cleanupActiveEngine();
  DOM.idleScreen.classList.remove('hidden');
  updateMetadata(null, null, null);
  updateHeaderStatus('Standby - Siap Memuat', null);
  logMessage('SYSTEM', 'Emulator di-reset ke kondisi standby.', 'warn');
}

// ============================================================================
// Event Listeners: File Upload, Presets & Controls
// ============================================================================
function handleFileSelect(file) {
  if (!file) return;

  logMessage('SYSTEM', `File lokal dipilih: "${file.name}" (${(file.size / 1024).toFixed(1)} KB)`, 'info');

  // Buat Object URL sementara untuk file lokal
  const objectUrl = URL.createObjectURL(file);
  state.activeBlobUrl = objectUrl;

  routeGame({
    name: file.name,
    url: objectUrl,
    fileObject: file
  });
}

// Input file biasa
DOM.fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    handleFileSelect(e.target.files[0]);
  }
});

// Drag & Drop
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
    handleFileSelect(e.dataTransfer.files[0]);
  }
});

// Preset Game Selector
DOM.btnLoadPreset.addEventListener('click', () => {
  const selected = DOM.presetSelect.value;
  if (!selected) {
    alert('Pilih salah satu demo game dari dropdown terlebih dahulu.');
    return;
  }

  logMessage('SYSTEM', `Preset game dipilih: "${selected}"`, 'info');
  routeGame({
    name: selected,
    url: `${ENGINE_PATHS.romsDir}/${selected}`,
    fileObject: null
  });
});

// Tombol Reset
DOM.btnReset.addEventListener('click', resetToIdle);

// Tombol Fullscreen
DOM.btnFullscreen.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    DOM.screenFrame.requestFullscreen().catch(err => {
      logMessage('ERROR', `Gagal masuk fullscreen: ${err.message}`, 'error');
    });
  } else {
    document.exitFullscreen();
  }
});

// Inisialisasi awal
document.addEventListener('DOMContentLoaded', () => {
  logMessage('SYSTEM', 'Pixel Emulator diinisialisasi. Dual-engine router siap.', 'info');
  logMessage('SYSTEM', 'Container FreeJ2ME: #freej2me-container | Container EmulatorJS: #emulatorjs-container', 'info');
});
