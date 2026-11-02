# EmulatorJS Engine Core

Tempatkan file build dan core dari repositori EmulatorJS di folder ini:
- `emulator.js`
- `data/` (termasuk `loader.js`, `emu-main.js`, dsb.)
- `cores/` (file `.wasm` dan `.js` untuk core NES, GBA, SNES, dll.)

Struktur umum EmulatorJS:
```
engines/emulatorjs/
├── data/
│   ├── loader.js
│   ├── minify.json
│   └── ...
├── cores/
│   ├── fceumm.wasm
│   ├── mgba.wasm
│   └── ...
└── README.md
```
