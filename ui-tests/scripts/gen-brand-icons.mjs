// Gera os ícones PNG do app (PWA/iOS) a partir do símbolo vetorial, com fundo OPACO.
// Rodar de ui-tests/:  node scripts/gen-brand-icons.mjs
import path from 'node:path';
import { chromium } from '@playwright/test';

const PUB = path.resolve(import.meta.dirname, '../../frontend/oficinasync-web/public');
const SYMBOL =
  '<circle cx="32" cy="38" r="20" fill="none" stroke="#A3E635" stroke-width="8" stroke-dasharray="7.5 5.066" stroke-dashoffset="3.74"/>' +
  '<circle cx="32" cy="38" r="9" fill="#A3E635"/>' +
  '<path d="M26 6h12v8l-3 4v14h-6V18l-3-4z" fill="#A3E635"/>';

// scale = fração do quadrado ocupada pelo símbolo; o maskable precisa caber nos 80% centrais.
const ICONS = [
  { file: 'icon-192.png', size: 192, scale: 0.78 },
  { file: 'icon-512.png', size: 512, scale: 0.78 },
  { file: 'icon-maskable-512.png', size: 512, scale: 0.6 },
  { file: 'apple-touch-icon.png', size: 180, scale: 0.72 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const { file, size, scale } of ICONS) {
  // o desenho ocupa y 6..62 (centro 34) e x 8..56 (centro 32) no viewBox 64
  const tx = 32 - scale * 32;
  const ty = 32 - scale * 34;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}"><rect width="64" height="64" fill="#0A0A0A"/><g transform="translate(${tx} ${ty}) scale(${scale})">${SYMBOL}</g></svg>`;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:#0A0A0A">${svg}</body></html>`);
  await page.locator('svg').screenshot({ path: path.join(PUB, file) });
  console.log('gerado', file);
}
await browser.close();
