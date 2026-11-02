import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const coversDir = path.resolve(__dirname, '../assets/images/covers');

await fs.promises.mkdir(coversDir, { recursive: true });

const covers = [
  {
    file: 'mario-bros.svg',
    title: 'SUPER MARIO BROS.',
    system: 'NES ARCADE',
    bg1: '#b31217',
    bg2: '#e52521',
    accent: '#fee440',
    iconText: '🍄',
    badge: 'NES CLASSIC'
  },
  {
    file: 'pokemon-emerald.svg',
    title: 'POKÉMON EMERALD',
    system: 'GAME BOY ADVANCE',
    bg1: '#097969',
    bg2: '#00a86b',
    accent: '#00f5d4',
    iconText: '🐉',
    badge: 'GBA EDITION'
  },
  {
    file: 'zelda-minish.svg',
    title: 'ZELDA: MINISH CAP',
    system: 'GAME BOY ADVANCE',
    bg1: '#1b4d3e',
    bg2: '#2e8b57',
    accent: '#ffd60a',
    iconText: '🗡️',
    badge: 'NINTENDO'
  },
  {
    file: 'chrono-trigger.svg',
    title: 'CHRONO TRIGGER',
    system: 'SUPER NINTENDO',
    bg1: '#2b1055',
    bg2: '#591a75',
    accent: '#00f5d4',
    iconText: '⏳',
    badge: 'SNES 16-BIT'
  },
  {
    file: 'tetris-dx.svg',
    title: 'TETRIS DX',
    system: 'GAME BOY COLOR',
    bg1: '#0a3674',
    bg2: '#0077b6',
    accent: '#ff007f',
    iconText: '🧩',
    badge: 'GBC COLOR'
  },
  {
    file: 'sonic-advance.svg',
    title: 'SONIC ADVANCE',
    system: 'GAME BOY ADVANCE',
    bg1: '#03045e',
    bg2: '#0077b6',
    accent: '#ffd60a',
    iconText: '🦔',
    badge: 'SEGA GBA'
  },
  {
    file: 'bounce-tales.svg',
    title: 'BOUNCE TALES',
    system: 'NOKIA JAVA ME',
    bg1: '#c1121f',
    bg2: '#780000',
    accent: '#ffb703',
    iconText: '🔴',
    badge: 'J2ME MIDP 2.0'
  },
  {
    file: 'diamond-rush.svg',
    title: 'DIAMOND RUSH',
    system: 'GAMELOFT JAVA',
    bg1: '#003049',
    bg2: '#1d3557',
    accent: '#00f5d4',
    iconText: '💎',
    badge: 'J2ME CLASSIC'
  }
];

for (const c of covers) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="100%" height="100%">
  <defs>
    <linearGradient id="grad-${c.file.replace('.svg', '')}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c.bg1}"/>
      <stop offset="100%" stop-color="${c.bg2}"/>
    </linearGradient>
    <pattern id="pixel-grid" width="16" height="16" patternUnits="userSpaceOnUse">
      <path d="M 16 0 L 0 0 0 16" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
    </pattern>
  </defs>
  
  <!-- Background -->
  <rect width="320" height="200" rx="10" fill="url(#grad-${c.file.replace('.svg', '')})"/>
  <rect width="320" height="200" rx="10" fill="url(#pixel-grid)"/>

  <!-- Top Badge Banner -->
  <rect x="0" y="0" width="320" height="28" fill="rgba(0,0,0,0.4)"/>
  <text x="12" y="19" font-family="'Silkscreen', monospace, sans-serif" font-size="10" font-weight="bold" fill="${c.accent}" letter-spacing="1">${c.badge}</text>
  <text x="308" y="19" text-anchor="end" font-family="'Silkscreen', monospace, sans-serif" font-size="9" fill="#fff" opacity="0.8">${c.system}</text>

  <!-- Big Central Icon & Glow -->
  <circle cx="160" cy="98" r="42" fill="rgba(0,0,0,0.3)" stroke="${c.accent}" stroke-width="2" stroke-dasharray="6 3"/>
  <text x="160" y="112" text-anchor="middle" font-size="38">${c.iconText}</text>

  <!-- Bottom Title Plate -->
  <rect x="12" y="152" width="296" height="36" rx="6" fill="rgba(0,0,0,0.75)" stroke="rgba(255,255,255,0.15)"/>
  <text x="160" y="174" text-anchor="middle" font-family="'Press Start 2P', monospace, cursive" font-size="11" font-weight="bold" fill="#fff" letter-spacing="0.5">${c.title}</text>
</svg>`;

  await fs.promises.writeFile(path.join(coversDir, c.file), svg, 'utf-8');
  console.log(`Generated cover: ${c.file}`);
}
