/**
 * ============================================================================
 * Pixel Emulator - Main Router & Integration Engine
 * ============================================================================
 * Menangani pemilihan game, deteksi format file, dan routing ke container:
 * - .jar / .jad -> Container FreeJ2ME-web
 * - .nes, .gba, .gb, .sfc, dll -> Container EmulatorJS
 */

// Konfigurasi Path Engine
const ENGINE_CONFIG = {
  // Path data lokal (dapat fallback ke CDN resmi)
  emulatorjsLocalData: 'engines/emulatorjs/data/',
  emulatorjsCdnData: 'https://cdn.emulatorjs.org/stable/data/',
  freej2meWebUrl: 'engines/freej2me/web/index.html',
  freej2meCdnFallback: 'https://zb3.github.io/freej2me-web/web/',
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
  md:  { engine: 'emulatorjs', core: 'segaMD', name: 'Sega Mega Drive', badgeClass: 'active-emulatorjs' },
  bin: { engine: 'emulatorjs', core: 'segaMD', name: 'Sega Genesis / Raw ROM', badgeClass: 'active-emulatorjs' }
};

// State Global Aplikasi
const state = {
  activeEngine: null, // 'freej2me' | 'emulatorjs' | null
  activeGameFile: null,
  activeBlobUrl: null
};

// DOM Elements Cache
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
// Cleanup & Reset Function
// ============================================================================
function cleanupActiveEngine() {
  // Hapus object URL lama agar tidak membocorkan memori
  if (state.activeBlobUrl) {
    URL.revokeObjectURL(state.activeBlobUrl);
    state.activeBlobUrl = null;
  }

  // Hentikan instance EmulatorJS jika sedang aktif
  if (window.EJS_emulator && typeof window.EJS_emulator.destroy === 'function') {
    try {
      window.EJS_emulator.destroy();
    } catch (e) {
      console.warn('EJS destroy warning:', e);
    }
  }

  // Hapus script loader EmulatorJS yang lama
  const oldScript = document.getElementById('ejs-loader-script');
  if (oldScript) oldScript.remove();

  // Bersihkan objek global EmulatorJS
  delete window.EJS_player;
  delete window.EJS_core;
  delete window.EJS_gameUrl;
  delete window.EJS_gameName;
  delete window.EJS_pathtodata;
  delete window.EJS_emulator;

  // Bersihkan konten viewport DOM
  DOM.freej2meViewport.innerHTML = '';
  DOM.emulatorjsViewport.innerHTML = '';
  DOM.freej2meContainer.classList.remove('active');
  DOM.emulatorjsContainer.classList.remove('active');

  state.activeEngine = null;
  state.activeGameFile = null;
}

function resetToIdle() {
  cleanupActiveEngine();
  DOM.idleScreen.classList.remove('hidden');
  updateMetadata(null, null, null);
  updateHeaderStatus('Standby - Siap Memuat', null);
  logMessage('SYSTEM', 'Emulator di-reset ke kondisi awal.', 'warn');
}

// ============================================================================
// 1. Implementasi Container EmulatorJS
// ============================================================================
/**
 * Menginisialisasi dan merender ROM konsol menggunakan engine EmulatorJS.
 * Mendefinisikan objek konfigurasi global EJS_player, EJS_pathtodata, EJS_gameUrl.
 *
 * @param {File|Blob|string} gameFile - File objek dari input atau path string ROM.
 * @param {string} coreName - Nama sistem core EmulatorJS ('nes', 'gba', 'gb', 'snes', dll).
 */
async function activateEmulatorJSContainer(gameFile, coreName) {
  logMessage('EMU-JS', `Memulai aktivasi container EmulatorJS [Core: ${coreName}]...`, 'info');

  // Bersihkan engine yang sedang berjalan sebelumnya
  cleanupActiveEngine();

  // Tentukan nama file dan URL game
  let gameUrl = '';
  let gameName = '';

  if (gameFile instanceof File || gameFile instanceof Blob) {
    gameUrl = URL.createObjectURL(gameFile);
    state.activeBlobUrl = gameUrl;
    gameName = gameFile.name || `game.${coreName}`;
  } else if (typeof gameFile === 'string') {
    gameUrl = gameFile;
    gameName = gameFile.split('/').pop();
  }

  state.activeEngine = 'emulatorjs';
  state.activeGameFile = gameFile;

  // Siapkan tampilan viewport
  DOM.idleScreen.classList.add('hidden');
  DOM.freej2meContainer.classList.remove('active');
  DOM.emulatorjsContainer.classList.add('active');

  // Buat elemen target div untuk canvas EmulatorJS
  DOM.emulatorjsViewport.innerHTML = `
    <div id="ejs-game-target" style="width: 100%; height: 100%; position: relative;"></div>
  `;

  // Cek apakah loader lokal di engines/emulatorjs/data/ tersedia
  let pathToData = ENGINE_CONFIG.emulatorjsLocalData;
  try {
    const checkRes = await fetch(`${pathToData}loader.js`, { method: 'HEAD' });
    if (!checkRes.ok) {
      logMessage('EMU-JS', 'Loader lokal tidak ditemukan, menggunakan CDN resmi (https://cdn.emulatorjs.org)...', 'warn');
      pathToData = ENGINE_CONFIG.emulatorjsCdnData;
    } else {
      logMessage('EMU-JS', `Menggunakan asset core lokal di: ${pathToData}`, 'info');
    }
  } catch {
    logMessage('EMU-JS', 'Memakai fallback CDN resmi EmulatorJS...', 'info');
    pathToData = ENGINE_CONFIG.emulatorjsCdnData;
  }

  // Definisikan variabel konfigurasi global EmulatorJS (EJS_*)
  window.EJS_player = '#ejs-game-target';
  window.EJS_core = coreName;
  window.EJS_gameUrl = gameUrl;
  window.EJS_gameName = gameName;
  window.EJS_pathtodata = pathToData;
  window.EJS_startOnLoaded = true;
  window.EJS_color = '#00f5d4';
  window.EJS_alignStartButton = 'center';

  logMessage('EMU-JS', `EJS_player = "${window.EJS_player}", Core = "${coreName}", ROM = "${gameName}"`, 'info');

  // Muat skrip loader.js untuk menginisialisasi canvas dan WebAssembly
  const script = document.createElement('script');
  script.id = 'ejs-loader-script';
  script.src = `${pathToData}loader.js`;

  script.onload = () => {
    logMessage('EMU-JS', `Script loader berhasil dimuat. Render canvas ROM sedang dimulai...`, 'info');
  };

  script.onerror = () => {
    logMessage('ERROR', `Gagal memuat loader script dari: ${script.src}`, 'error');
  };

  document.body.appendChild(script);
}

// ============================================================================
// 2. Implementasi Container FreeJ2ME-web
// ============================================================================
/**
 * Menginisialisasi dan merender game Java ME (.jar) menggunakan FreeJ2ME-web.
 * Menghubungkan file ke launcher kanvas CheerpJ / FreeJ2ME.
 *
 * @param {File|Blob|string} gameFile - File objek .jar atau path string.
 */
async function activateFreeJ2MEContainer(gameFile) {
  logMessage('FREEJ2ME', `Memulai aktivasi container FreeJ2ME-web...`, 'info');

  // Bersihkan engine sebelumnya
  cleanupActiveEngine();

  let gameName = '';
  if (gameFile instanceof File || gameFile instanceof Blob) {
    gameName = gameFile.name || 'game.jar';
  } else if (typeof gameFile === 'string') {
    gameName = gameFile.split('/').pop();
  }

  state.activeEngine = 'freej2me';
  state.activeGameFile = gameFile;

  // Siapkan tampilan viewport
  DOM.idleScreen.classList.add('hidden');
  DOM.emulatorjsContainer.classList.remove('active');
  DOM.freej2meContainer.classList.add('active');

  // Cek apakah build web lokal di engines/freej2me/web/index.html tersedia
  let playerUrl = ENGINE_CONFIG.freej2meWebUrl;
  try {
    const res = await fetch(playerUrl, { method: 'HEAD' });
    if (!res.ok) {
      logMessage('FREEJ2ME', 'Player lokal tidak ditemukan, menggunakan fallback hosted web player...', 'warn');
      playerUrl = ENGINE_CONFIG.freej2meCdnFallback;
    } else {
      logMessage('FREEJ2ME', `Menggunakan runtime lokal FreeJ2ME di: ${playerUrl}`, 'info');
    }
  } catch {
    playerUrl = ENGINE_CONFIG.freej2meCdnFallback;
  }

  // Buat iFrame terisolasi untuk CheerpJ runtime
  const iframe = document.createElement('iframe');
  iframe.id = 'freej2me-iframe';
  iframe.src = playerUrl;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '12px';
  iframe.setAttribute('allow', 'autoplay; fullscreen');
  iframe.setAttribute('title', 'FreeJ2ME Web Player');

  DOM.freej2meViewport.innerHTML = '';
  DOM.freej2meViewport.appendChild(iframe);

  logMessage('FREEJ2ME', `Container iFrame terpasang. Menunggu inisialisasi CheerpJ...`, 'info');

  // Ketika iFrame siap, suntikkan file .jar yang dipilih langsung ke input form launcher FreeJ2ME
  iframe.onload = async () => {
    logMessage('FREEJ2ME', `iFrame FreeJ2ME berhasil dimuat.`, 'info');

    try {
      // Karena disajikan dari local server yang sama (same origin), kita dapat mengakses dokumen iframe
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      const targetInput = iframeDoc.getElementById('game-file-input');

      if (!targetInput) {
        logMessage('FREEJ2ME', `Player FreeJ2ME siap. Silakan operasikan kontrol pada kanvas.`, 'info');
        return;
      }

      // 1. Jika pengguna mengunggah objek File asli (.jar)
      if (gameFile instanceof File) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(gameFile);
        targetInput.files = dataTransfer.files;
        targetInput.dispatchEvent(new Event('change', { bubbles: true }));
        logMessage('FREEJ2ME', `File JAR "${gameName}" langsung disuntikkan ke launcher FreeJ2ME.`, 'info');
      } 
      // 2. Jika memilih preset string URL, unduh blob-nya lalu suntikkan
      else if (typeof gameFile === 'string') {
        try {
          const fetchRes = await fetch(gameFile);
          if (fetchRes.ok) {
            const blob = await fetchRes.blob();
            const fileObj = new File([blob], gameName, { type: 'application/java-archive' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(fileObj);
            targetInput.files = dataTransfer.files;
            targetInput.dispatchEvent(new Event('change', { bubbles: true }));
            logMessage('FREEJ2ME', `Preset "${gameName}" berhasil diunduh dan diproses ke kanvas FreeJ2ME.`, 'info');
          } else {
            logMessage('FREEJ2ME', `File preset lokal "${gameName}" belum ada di folder roms/. Launcher siap untuk drag-and-drop manual.`, 'warn');
          }
        } catch (fetchErr) {
          logMessage('FREEJ2ME', `Launcher siap di iFrame. Silakan masukkan file JAR secara manual.`, 'info');
        }
      }
    } catch (crossErr) {
      // Terjadi jika iframe berasal dari origin berbeda (misal fallback ke URL luar)
      logMessage('FREEJ2ME', `Player FreeJ2ME aktif di viewport. Anda dapat langsung mengunggah file di dalam kanvas player.`, 'info');
    }
  };
}

// ============================================================================
// Main Router
// ============================================================================
function routeGame(gameFile, filenameOverride = null) {
  const filename = filenameOverride || (gameFile instanceof File ? gameFile.name : String(gameFile));
  const ext = getExtension(filename);
  const config = EXTENSION_CONFIG[ext];

  logMessage('ROUTER', `Menganalisis file: "${filename}" (ekstensi .${ext})`, 'router');

  if (!config) {
    logMessage('ERROR', `Format file .${ext} belum didukung oleh sistem.`, 'error');
    alert(`Format file ".${ext}" belum didukung.\nSilakan pilih file .jar untuk J2ME, atau .nes/.gba/.gb/.sfc untuk EmulatorJS.`);
    return;
  }

  // Perbarui UI Metadata & Status
  updateMetadata(filename, ext, config);

  if (config.engine === 'freej2me') {
    updateHeaderStatus(`FreeJ2ME Active: ${filename}`, config.badgeClass);
    activateFreeJ2MEContainer(gameFile);
  } else if (config.engine === 'emulatorjs') {
    updateHeaderStatus(`EmulatorJS Active [${config.core.toUpperCase()}]: ${filename}`, config.badgeClass);
    activateEmulatorJSContainer(gameFile, config.core);
  }
}

// ============================================================================
// Event Listeners: Input Form, Presets, Controls
// ============================================================================
function handleFileInput(file) {
  if (!file) return;
  logMessage('SYSTEM', `File dipilih dari input: "${file.name}" (${(file.size / 1024).toFixed(1)} KB)`, 'info');
  routeGame(file);
}

// Input file biasa
DOM.fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    handleFileInput(e.target.files[0]);
  }
});

// Drag and drop ke area dropzone
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

// Pemilihan preset demo
DOM.btnLoadPreset.addEventListener('click', () => {
  const selected = DOM.presetSelect.value;
  if (!selected) {
    alert('Pilih salah satu demo game dari daftar terlebih dahulu.');
    return;
  }

  const romPath = `${ENGINE_CONFIG.romsDir}/${selected}`;
  logMessage('SYSTEM', `Menjalankan preset: "${selected}"`, 'info');
  routeGame(romPath, selected);
});

// Tombol Reset
DOM.btnReset.addEventListener('click', resetToIdle);

// Tombol Fullscreen
DOM.btnFullscreen.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    DOM.screenFrame.requestFullscreen().catch(err => {
      logMessage('ERROR', `Gagal masuk layar penuh: ${err.message}`, 'error');
    });
  } else {
    document.exitFullscreen();
  }
});

// Inisialisasi awal saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
  logMessage('SYSTEM', 'Pixel Emulator siap. Dual-Engine router aktif.', 'info');
  logMessage('SYSTEM', 'Container FreeJ2ME: #freej2me-container | Container EmulatorJS: #emulatorjs-container', 'info');
});
