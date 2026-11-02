# Pixel Emulator 🕹️

Sebuah web platform emulator multi-engine retro gaming yang mengintegrasikan:
1. **EmulatorJS** untuk ROM konsol klasik (NES, GBA, GB, GBC, SNES, Sega, dll.)
2. **FreeJ2ME-web** untuk Java ME MIDlets (.jar)

## 📁 Struktur Direktori

```text
pixel-emulator/
├── .gitignore               # Konfigurasi pengabaian file ROM besar & temporary
├── README.md                # Dokumentasi proyek
├── index.html               # Halaman UI emulator utama
├── engines/                 # File core / build 3rd-party engines
│   ├── emulatorjs/          # Build file & cores EmulatorJS
│   └── freej2me/            # Build file & WASM FreeJ2ME Web
├── scripts/
│   └── setup-engines.mjs    # Skrip otomatis pengunduh binary/core kedua engine
├── roms/                    # Direktori ROM lokal (diabaikan oleh Git)
├── src/
│   ├── css/
│   │   └── style.css        # Gaya retro-modern & layout antarmuka
│   └── js/
│       └── main.js          # Router loader deteksi ekstensi ROM/JAR
└── assets/
    ├── audio/               # Efek suara chiptune / UI audio
    └── images/              # Logo, ikon, background, & overlay
```

## 📦 Mengunduh Binary Core & Engine

Jalankan skrip otomatis untuk mengunduh core WASM EmulatorJS dan runtime FreeJ2ME-web ke dalam folder `engines/`:

```bash
node scripts/setup-engines.mjs
```

## 🚀 Menjalankan Secara Lokal

Gunakan local HTTP server (karena WASM dan Web Worker memerlukan protokol `http://` atau `https://`):

```bash
# Menggunakan Python
python -m http.server 8000

# Atau menggunakan Node npx serve / http-server
npx serve .
```

Buka peramban di `http://localhost:8000`.
