import { LibMedia } from "../libmedia/libmedia.js";
import { LibMidi, createUnlockingAudioContext } from "../libmidi/libmidi.js";
import { codeMap, KeyRepeatManager } from "./key.js";
import { EventQueue } from "./eventqueue.js";
import { initKbdListeners, setKbdHandler, kbdWidth, kbdHeight } from "./screenKbd.js";

// we need to import natives here, don't use System.loadLibrary
// since CheerpJ fails to load them in firefox and we can't set breakpoints
import canvasFontNatives from "../libjs/libcanvasfont.js";
import canvasGraphicsNatives from "../libjs/libcanvasgraphics.js";
import gles2Natives from "../libjs/libgles2.js";
import jsReferenceNatives from "../libjs/libjsreference.js";
import mediaBridgeNatives from "../libjs/libmediabridge.js";
import midiBridgeNatives from "../libjs/libmidibridge.js";

const evtQueue = new EventQueue();
const sp = new URLSearchParams(location.search);

const cheerpjWebRoot = '/app'+location.pathname.replace(/\/[^/]*$/,'');

let isMobile = sp.get('mobile');

let display = null;
let screenCtx = null;

let fractionScale = sp.get('fractionScale') || (localStorage && localStorage.getItem("pl.zb3.freej2me.fractionScale") === "true");
let scaleSet = false;
let currentZoom = 1;
let isLaunching = false;

let lib = null;
let FreeJ2ME = null;
let cheerpjReady = false;
let pendingJar = null;

async function launchJarBuffer(buffer, name) {
    if (isLaunching) {
        console.warn('[FreeJ2ME] Game is already launching, ignoring duplicate call');
        return;
    }
    isLaunching = true;

    try {
        const loadingEl = document.getElementById("loading");
        if (loadingEl) {
            loadingEl.hidden = false;
            loadingEl.textContent = `Menyiapkan ${name || 'game.jar'}...`;
        }

        const File = await lib.java.io.File;
        const launcherUtil = await lib.pl.zb3.freej2me.launcher.LauncherUtil;

        const cleanName = (name || 'game.jar').replace(/[^a-zA-Z0-9._-]/g, '_');
        const jarFile = await new File("/files/_tmp/" + cleanName);
        await launcherUtil.copyJar(new Int8Array(buffer), jarFile);
        const jarPath = await jarFile.getPath();

        console.log('[FreeJ2ME] Menjalankan JAR:', jarPath);

        if (loadingEl) {
            loadingEl.textContent = "Menjalankan Java MIDlet...";
        }

        await FreeJ2ME.main(['jar', jarPath]);
    } catch (err) {
        console.error('[FreeJ2ME] Gagal menjalankan JAR:', err);
        const loadingEl = document.getElementById("loading");
        if (loadingEl) {
            loadingEl.hidden = false;
            loadingEl.textContent = 'Gagal menjalankan game: ' + (err.message || err);
        }
    }
}

window.addEventListener('message', async (e) => {
    if (!e.data) return;
    const { type, buffer, name } = e.data;
    if (type === 'LOAD_JAR' || type === 'PIXEL_EMU_LOAD_JAR') {
        if (!buffer || buffer.byteLength === 0) return;
        if (cheerpjReady) {
            await launchJarBuffer(buffer, name || 'game.jar');
        } else {
            pendingJar = { buffer, name: name || 'game.jar' };
        }
    }
});

const keyRepeatManager = new KeyRepeatManager();

window.evtQueue = evtQueue;

function autoscale() {
    if (!scaleSet || !screenCtx || !screenCtx.canvas) return;

    let screenWidth = window.innerWidth;
    let screenHeight = window.innerHeight;

    if (isMobile) {
        document.getElementById('left-keys').style.display = '';
        document.getElementById('right-keys').style.display = '';

        if (screenWidth > screenHeight) {
            document.body.classList.add('kbd-landscape');
            document.body.classList.remove('kbd-portrait');
            screenWidth = Math.max(10, screenWidth - 2 * kbdWidth);
        } else {
            document.body.classList.add('kbd-portrait');
            document.body.classList.remove('kbd-landscape');
            screenHeight = Math.max(10, screenHeight - kbdHeight);
        }
    }

    const cw = screenCtx.canvas.width;
    const ch = screenCtx.canvas.height;
    if (!cw || !ch) return;

    // Hitung skala terbaik agar pas memenuhi area layar secara adaptif (portrait atau landscape)
    // tanpa melar atau terpotong
    let scale = Math.min(
        screenWidth / cw,
        screenHeight / ch
    );

    if (scale <= 0) scale = 1;

    currentZoom = scale;
    display.style.width = Math.round(cw * scale) + 'px';
    display.style.height = Math.round(ch * scale) + 'px';
    display.style.maxWidth = '100%';
    display.style.maxHeight = '100%';
    display.style.objectFit = 'contain';
}

function getCanvasCoords(clientX, clientY) {
    if (!display || !screenCtx || !screenCtx.canvas) return { x: 0, y: 0 };
    const rect = display.getBoundingClientRect();
    const cw = screenCtx.canvas.width;
    const ch = screenCtx.canvas.height;
    if (!rect.width || !rect.height) return { x: 0, y: 0 };
    const x = Math.max(0, Math.min(cw - 1, Math.round((clientX - rect.left) * (cw / rect.width))));
    const y = Math.max(0, Math.min(ch - 1, Math.round((clientY - rect.top) * (ch / rect.height))));
    return { x, y };
}

function setListeners() {
    let mouseDown = false;
    let noMouse = false;

    setKbdHandler((isDown, key) => {
        const symbol = key.startsWith('Digit') ? key.substring(5) : '\x00';
        keyRepeatManager.post(isDown, key, {symbol, ctrlKey: false, shiftKey: false});
    });

    function handleKeyEvent(e) {
        const isDown = e.type === 'keydown';

        if (codeMap[e.code]) {
            keyRepeatManager.post(isDown, e.code, {
                symbol: e.key.length == 1 ? e.key.charCodeAt(0) : '\x00',
                ctrlKey: e.ctrlKey,
                shiftKey: e.shiftKey
            })
        }
        e.preventDefault();
    }

    display.addEventListener('keydown', handleKeyEvent);
    display.addEventListener('keyup', handleKeyEvent);
    window.addEventListener('keydown', handleKeyEvent);
    window.addEventListener('keyup', handleKeyEvent);

    keyRepeatManager.register((kind, key, args) => {
        if (kind === 'click') {
            if (key === 'Maximize') {
                fractionScale = !fractionScale;
                localStorage && localStorage.setItem("pl.zb3.freej2me.fractionScale", fractionScale);
                autoscale();
            }
        } else if (codeMap[key]) {
            console.log('queuin event');
            evtQueue.queueEvent({
                kind: kind === 'up' ? 'keyup' : 'keydown',
                args: [codeMap[key], args.symbol, args.ctrlKey, args.shiftKey]
            });
        }
    });

    display.addEventListener('mousedown', async e => {
        display.focus();
        if (noMouse) return;

        const { x, y } = getCanvasCoords(e.clientX, e.clientY);
        evtQueue.queueEvent({
            kind: 'pointerpressed',
            x, y
        });

        mouseDown = true;
        e.preventDefault();
    });

    display.addEventListener('mousemove', async e => {
        if (noMouse) return;
        if (!mouseDown) return;

        const { x, y } = getCanvasCoords(e.clientX, e.clientY);
        evtQueue.queueEvent({
            kind: 'pointerdragged',
            x, y
        });

        e.preventDefault();
    });

    document.addEventListener('mouseup', async e => {
        if (noMouse) return;
        if (!mouseDown) return;

        mouseDown = false;

        const { x, y } = getCanvasCoords(e.clientX, e.clientY);
        evtQueue.queueEvent({
            kind: 'pointerreleased',
            x, y
        });

        e.preventDefault();
    });


    display.addEventListener('touchstart', async e => {
        display.focus();
        noMouse = true;

        const touch = e.changedTouches[0];
        const { x, y } = getCanvasCoords(touch.clientX, touch.clientY);
        evtQueue.queueEvent({
            kind: 'pointerpressed',
            x, y
        });

        e.preventDefault();
    }, {passive: false});

    display.addEventListener('touchmove', async e => {
        noMouse = true;

        const touch = e.changedTouches[0];
        const { x, y } = getCanvasCoords(touch.clientX, touch.clientY);
        evtQueue.queueEvent({
            kind: 'pointerdragged',
            x, y
        });

        e.preventDefault();
    }, {passive: false});

    display.addEventListener('touchend', async e => {
        noMouse = true;

        const touch = e.changedTouches[0];
        const { x, y } = getCanvasCoords(touch.clientX, touch.clientY);
        evtQueue.queueEvent({
            kind: 'pointerreleased',
            x, y
        });

        e.preventDefault();
    });

    document.addEventListener('mousedown', e => {
        console.log('refocus');
        setTimeout(() => display.focus(), 20);
        ;
    });

    display.addEventListener('blur', e => {
        console.log('refocus');
        // it doesn't work without any timeout
        setTimeout(() => display.focus(), 10);
        ;
    });

    window.addEventListener('resize', autoscale);

    initKbdListeners();
}

function setFaviconFromBuffer(arrayBuffer) {
    const blob = new Blob([arrayBuffer], { type: 'image/png' });

    const reader = new FileReader();
    reader.onload = function() {
        const dataURL = reader.result;

        let link = document.querySelector("link[rel*='icon']");
        if (!link) {
            link = document.createElement('link');
            link.setAttribute('rel', 'icon');
            document.head.appendChild(link);
        }
        link.setAttribute('href', dataURL);
    };
    reader.readAsDataURL(blob);
}

async function ensureAppInstalled(lib, appId) {
    const appFile = await cjFileBlob(appId + "/app.jar");

    if (!appFile) {
        const launcherUtil = await lib.pl.zb3.freej2me.launcher.LauncherUtil;

        await launcherUtil.installFromBundle(cheerpjWebRoot + "/apps/", appId);
    }
}

async function init() {
    document.getElementById("loading").textContent = "Loading CheerpJ...";

    display = document.getElementById('display');
    screenCtx = display.getContext('2d');

    setListeners();

    window.libmidi = new LibMidi(createUnlockingAudioContext());
    await window.libmidi.init();
    window.libmidi.midiPlayer.addEventListener('end-of-media', e => {
        window.evtQueue.queueEvent({kind: 'player-eom', player: e.target});
    })
    window.libmedia = new LibMedia();

    await cheerpjInit({
        enableDebug: false,
        natives: {
            ...canvasFontNatives,
            ...canvasGraphicsNatives,
            ...gles2Natives,
            ...jsReferenceNatives,
            ...mediaBridgeNatives,
            ...midiBridgeNatives,
            async Java_pl_zb3_freej2me_bridge_shell_Shell_setTitle(lib, title) {
                document.title = title;
            },
            async Java_pl_zb3_freej2me_bridge_shell_Shell_setIcon(lib, iconBytes) {
                if (iconBytes) {
                    setFaviconFromBuffer(iconBytes.buffer);
                }
            },
            async Java_pl_zb3_freej2me_bridge_shell_Shell_getScreenCtx(lib) {
                return screenCtx;
            },
            async Java_pl_zb3_freej2me_bridge_shell_Shell_setCanvasSize(lib, width, height) {
                if (!scaleSet) {
                    document.getElementById('loading').hidden = true;
                    display.style.display = '';
                    scaleSet = true;
                    display.focus();
                }
                screenCtx.canvas.width = width;
                screenCtx.canvas.height = height;
                autoscale();
            },
            async Java_pl_zb3_freej2me_bridge_shell_Shell_waitForAndDispatchEvents(lib, listener) {
                const KeyEvent = await lib.pl.zb3.freej2me.bridge.shell.KeyEvent;
                const PointerEvent = await lib.pl.zb3.freej2me.bridge.shell.PointerEvent;

                const evt = await evtQueue.waitForEvent();
                if (evt.kind == 'keydown') {
                    await listener.keyPressed(await new KeyEvent(...evt.args));
                } else if (evt.kind == 'keyup') {
                    await listener.keyReleased(await new KeyEvent(...evt.args));
                } else if (evt.kind == 'pointerpressed') {
                    await listener.pointerPressed(await new PointerEvent(evt.x, evt.y));
                } else if (evt.kind == 'pointerdragged') {
                    await listener.pointerDragged(await new PointerEvent(evt.x, evt.y));
                } else if (evt.kind == 'pointerreleased') {
                    await listener.pointerReleased(await new PointerEvent(evt.x, evt.y));
                } else if (evt.kind == 'player-eom') {
                    await listener.playerEOM(evt.player);
                } else if (evt.kind == 'player-video-frame') {
                    await listener.playerVideoFrame(evt.player);
                }
            },
            async Java_pl_zb3_freej2me_bridge_shell_Shell_restart(lib) {
                location.reload();
            },
            async Java_pl_zb3_freej2me_bridge_shell_Shell_exit(lib) {
                location.href = './';
            },
            async Java_pl_zb3_freej2me_bridge_shell_Shell_sthop(lib) {
                debugger;
            },
            async Java_pl_zb3_freej2me_bridge_shell_Shell_say(lib, sth) {
                console.log('[say]', sth);
            },
            async Java_pl_zb3_freej2me_bridge_shell_Shell_sayObject(lib, label, obj) {
                debugger;
                console.log('[sayobject]', label, obj);
            }
        }
    });

    document.getElementById("loading").textContent = "Memulai FreeJ2ME Core...";

    lib = await cheerpjRunLibrary(cheerpjWebRoot+"/freej2me-web.jar");
    FreeJ2ME = await lib.org.recompile.freej2me.FreeJ2ME;
    cheerpjReady = true;

    if (pendingJar) {
        const { buffer, name } = pendingJar;
        pendingJar = null;
        await launchJarBuffer(buffer, name);
    } else if (sp.get('app')) {
        const app = sp.get('app');
        await ensureAppInstalled(lib, app);
        await FreeJ2ME.main(['app', app]);
    } else if (sp.get('jar')) {
        await FreeJ2ME.main(['jar', cheerpjWebRoot+"/jar/" + sp.get('jar')]);
    } else {
        document.getElementById("loading").textContent = "☕ FREEJ2ME JVM SIAP // MASUKKAN .JAR";
        try {
            window.parent.postMessage({ type: 'FREEJ2ME_READY' }, '*');
        } catch (e) {}
    }


}

init();