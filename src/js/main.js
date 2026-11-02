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
  activeBlobUrl: null,
  sfxEnabled: true,
  crtEnabled: true
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
    // Autoplay policy fallback
  }
}

// DOM Elements Cache
const DOM = {
  fileInput: document.getElementById('game-file-input'),
  dropzone: document.getElementById('dropzone'),
  presetSelect: document.getElementById('preset-select'),
  btnLoadPreset: document.getElementById('btn-load-preset'),
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
  
  // Mobile Tabs
  mobileTabs: document.querySelectorAll('.mobile-tab-btn'),
  controlsSidebar: document.getElementById('controls-sidebar'),
  screenStage: document.getElementById('screen-stage'),
  telemetryBar: document.getElementById('telemetry-bar')
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
}

function resetToIdle() {
  playChiptune('click');
  cleanupActiveEngine();
  DOM.idleScreen.classList.remove('hidden');
  updateMetadata(null, null, null);
  updateHeaderStatus('STANDBY // READY', null);
  logMessage('SYSTEM', 'Emulator di-reset ke kondisi awal.', 'warn');
}

// ============================================================================
// 1. Implementasi Container EmulatorJS
// ============================================================================
async function activateEmulatorJSContainer(gameFile, coreName) {
  logMessage('EMU-JS', `Memulai aktivasi container EmulatorJS [Core: ${coreName}]...`, 'info');
  playChiptune('start');

  cleanupActiveEngine();

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

  DOM.idleScreen.classList.add('hidden');
  DOM.freej2meContainer.classList.remove('active');
  DOM.emulatorjsContainer.classList.add('active');

  DOM.emulatorjsViewport.innerHTML = `
    <div id="ejs-game-target" style="width: 100%; height: 100%; position: relative;"></div>
  `;

  // Cek loader lokal di engines/emulatorjs/data/
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

  // Definisikan objek konfigurasi global EmulatorJS
  window.EJS_player = '#ejs-game-target';
  window.EJS_core = coreName;
  window.EJS_gameUrl = gameUrl;
  window.EJS_gameName = gameName;
  window.EJS_pathtodata = pathToData;
  window.EJS_startOnLoaded = true;
  window.EJS_color = '#00f5d4';
  window.EJS_alignStartButton = 'center';

  logMessage('EMU-JS', `EJS_player = "${window.EJS_player}", Core = "${coreName}", ROM = "${gameName}"`, 'info');

  const script = document.createElement('script');
  script.id = 'ejs-loader-script';
  script.src = `${pathToData}loader.js`;

  script.onload = () => {
    logMessage('EMU-JS', `Script loader berhasil dimuat. Render canvas ROM dimulai.`, 'info');
  };

  script.onerror = () => {
    logMessage('ERROR', `Gagal memuat loader script dari: ${script.src}`, 'error');
  };

  document.body.appendChild(script);
}

// ============================================================================
// 2. Implementasi Container FreeJ2ME-web
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

  DOM.idleScreen.classList.add('hidden');
  DOM.emulatorjsContainer.classList.remove('active');
  DOM.freej2meContainer.classList.add('active');

  let playerUrl = ENGINE_CONFIG.freej2meWebUrl;
  try {
    const res = await fetch(playerUrl, { method: 'HEAD' });
    if (!res.ok) {
      logMessage('FREEJ2ME', 'Player lokal tidak ditemukan, menggunakan fallback CDN...', 'warn');
      playerUrl = ENGINE_CONFIG.freej2meCdnFallback;
    } else {
      logMessage('FREEJ2ME', `Menggunakan runtime lokal FreeJ2ME di: ${playerUrl}`, 'info');
    }
  } catch {
    playerUrl = ENGINE_CONFIG.freej2meCdnFallback;
  }

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

  logMessage('FREEJ2ME', `Container iFrame terpasang. Menunggu inisialisasi CheerpJ...`, 'info');

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
            logMessage('FREEJ2ME', `Preset file "${gameName}" belum ada di folder roms/.`, 'warn');
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
function routeGame(gameFile, filenameOverride = null) {
  const filename = filenameOverride || (gameFile instanceof File ? gameFile.name : String(gameFile));
  const ext = getExtension(filename);
  const config = EXTENSION_CONFIG[ext];

  logMessage('ROUTER', `Menganalisis file: "${filename}" (.${ext})`, 'router');

  if (!config) {
    logMessage('ERROR', `Format file .${ext} belum didukung sistem.`, 'error');
    alert(`Format file ".${ext}" belum didukung.\nSilakan pilih file .jar untuk J2ME, atau .nes/.gba/.gb/.sfc untuk EmulatorJS.`);
    return;
  }

  updateMetadata(filename, ext, config);

  if (config.engine === 'freej2me') {
    updateHeaderStatus(`J2ME ACTIVE // ${filename}`, config.badgeClass);
    activateFreeJ2MEContainer(gameFile);
  } else if (config.engine === 'emulatorjs') {
    updateHeaderStatus(`EMU-JS [${config.core.toUpperCase()}] // ${filename}`, config.badgeClass);
    activateEmulatorJSContainer(gameFile, config.core);
  }

  // Pada mobile: otomatis alihkan pandangan ke layar Monitor
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
  }
}

// ============================================================================
// Event Listeners: Input, Controls, Visual Tools
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

// Presets
DOM.btnLoadPreset.addEventListener('click', () => {
  playChiptune('click');
  const selected = DOM.presetSelect.value;
  if (!selected) {
    alert('Pilih salah satu demo game dari dropdown.');
    return;
  }
  const romPath = `${ENGINE_CONFIG.romsDir}/${selected}`;
  routeGame(romPath, selected);
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
  logMessage('SYSTEM', 'PIXEL EMULATOR STATION v1.2 BOOT COMPLETE.', 'info');
  logMessage('SYSTEM', 'Core WASM: fceumm (NES), mgba (GBA), snes9x (SNES), gambatte (GB).', 'info');
  logMessage('SYSTEM', 'Runtime Java ME: FreeJ2ME-web CheerpJ terpasang lokal.', 'info');
});
