/**
 * ============================================================================
 * Pixel Emulator - Engines Setup & Binary Downloader Script
 * ============================================================================
 * Mengunduh file core dan runtime binary untuk EmulatorJS dan FreeJ2ME-web
 * ke dalam folder engines/ proyek lokal.
 *
 * Jalankan dengan: node scripts/setup-engines.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const ENGINES_DIR = path.join(rootDir, 'engines');
const EMUJS_DIR = path.join(ENGINES_DIR, 'emulatorjs');
const EMUJS_DATA_DIR = path.join(EMUJS_DIR, 'data');
const EMUJS_CORES_DIR = path.join(EMUJS_DATA_DIR, 'cores');
const FREEJ2ME_DIR = path.join(ENGINES_DIR, 'freej2me');
const FREEJ2ME_WEB_DIR = path.join(FREEJ2ME_DIR, 'web');

// Tautan CDN & Release EmulatorJS
const EMUJS_CDN_BASE = 'https://cdn.emulatorjs.org/stable/data';
const EMUJS_LATEST_BASE = 'https://cdn.emulatorjs.org/latest/data';

async function downloadFile(url, destPath) {
  console.log(`  -> Mengunduh: ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Gagal mengunduh ${url} (Status: ${res.status})`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
  await fs.promises.writeFile(destPath, buffer);
  console.log(`     Tersimpan di: ${path.relative(rootDir, destPath)} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

async function setupEmulatorJS() {
  console.log('\n========================================');
  console.log('1. Menyiapkan EmulatorJS');
  console.log('========================================');

  await fs.promises.mkdir(EMUJS_CORES_DIR, { recursive: true });

  // Unduh loader & bundle assets utama
  const filesToDownload = [
    { url: `${EMUJS_CDN_BASE}/loader.js`, dest: path.join(EMUJS_DATA_DIR, 'loader.js') },
    { url: `${EMUJS_LATEST_BASE}/emulator.min.js`, dest: path.join(EMUJS_DATA_DIR, 'emulator.min.js') },
    { url: `${EMUJS_LATEST_BASE}/emulator.min.css`, dest: path.join(EMUJS_DATA_DIR, 'emulator.min.css') },
    { url: `${EMUJS_LATEST_BASE}/version.json`, dest: path.join(EMUJS_DATA_DIR, 'version.json') }
  ];

  for (const item of filesToDownload) {
    try {
      await downloadFile(item.url, item.dest);
    } catch (err) {
      console.warn(`  ⚠️ Peringatan: ${err.message}`);
    }
  }

  // Unduh core paket NES (fceumm) & GBA (mgba) dari npm release resmi EmulatorJS
  console.log('\n  Mengunduh paket core binary WASM resmi...');
  const cores = [
    { name: 'fceumm', pkg: '@emulatorjs/core-fceumm', ver: '4.2.3' },
    { name: 'mgba', pkg: '@emulatorjs/core-mgba', ver: '4.2.3' },
    { name: 'snes9x', pkg: '@emulatorjs/core-snes9x', ver: '4.2.3' },
    { name: 'gambatte', pkg: '@emulatorjs/core-gambatte', ver: '4.2.3' }
  ];

  for (const core of cores) {
    const tarballUrl = `https://registry.npmjs.org/${core.pkg}/-/core-${core.name}-${core.ver}.tgz`;
    const tempTgz = path.join(EMUJS_CORES_DIR, `${core.name}.tgz`);
    try {
      await downloadFile(tarballUrl, tempTgz);
      // Ekstrak file WASM & data menggunakan tar bawaan OS
      execSync(`tar -xzf "${tempTgz}" -C "${EMUJS_CORES_DIR}"`, { stdio: 'ignore' });
      
      // Pindahkan isi package/* ke cores/
      const pkgFolder = path.join(EMUJS_CORES_DIR, 'package');
      if (fs.existsSync(pkgFolder)) {
        const pkgFiles = await fs.promises.readdir(pkgFolder);
        for (const f of pkgFiles) {
          const src = path.join(pkgFolder, f);
          const dest = path.join(EMUJS_CORES_DIR, f);
          if (fs.existsSync(dest)) await fs.promises.rm(dest, { recursive: true, force: true });
          await fs.promises.rename(src, dest);
        }
        await fs.promises.rm(pkgFolder, { recursive: true, force: true });
      }
      await fs.promises.rm(tempTgz, { force: true });
      console.log(`     Ekstraksi core ${core.name} selesai.`);
    } catch (err) {
      console.warn(`  ⚠️ Gagal ekstrak core ${core.name} (${err.message}). Sistem akan fallback ke CDN saat runtime.`);
    }
  }
}

async function setupFreeJ2ME() {
  console.log('\n========================================');
  console.log('2. Menyiapkan FreeJ2ME-web');
  console.log('========================================');

  const mainIndexPath = path.join(FREEJ2ME_WEB_DIR, 'index.html');
  const mainJarPath = path.join(FREEJ2ME_WEB_DIR, 'freej2me-web.jar');

  if (fs.existsSync(mainIndexPath) && fs.existsSync(mainJarPath)) {
    console.log('  ✓ File runtime FreeJ2ME-web sudah terpasang lengkap di engines/freej2me/web/');
    return;
  }

  console.log('  Meng-clone repositori zb3/freej2me-web...');
  const tempCloneDir = path.join(FREEJ2ME_DIR, 'temp_clone');
  try {
    execSync(`git clone --depth 1 https://github.com/zb3/freej2me-web.git "${tempCloneDir}"`, { stdio: 'inherit' });
    const sourceWeb = path.join(tempCloneDir, 'web');
    if (fs.existsSync(sourceWeb)) {
      await fs.promises.cp(sourceWeb, FREEJ2ME_WEB_DIR, { recursive: true });
      console.log('  ✓ Web runtime FreeJ2ME berhasil disalin ke engines/freej2me/web/');
    }
  } catch (err) {
    console.error('  ⚠️ Gagal clone freej2me-web:', err.message);
  } finally {
    if (fs.existsSync(tempCloneDir)) {
      await fs.promises.rm(tempCloneDir, { recursive: true, force: true });
    }
  }
}

async function run() {
  console.log('Memulai penyiapan engine binary untuk Pixel Emulator...');
  await setupEmulatorJS();
  await setupFreeJ2ME();
  console.log('\n========================================');
  console.log('✨ Penyiapan Engine Selesai!');
  console.log('Jalankan `npx serve .` untuk mulai bermain.');
  console.log('========================================\n');
}

run().catch(console.error);
