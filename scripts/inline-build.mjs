// Turns the Vite build in dist/ into one self-contained HTML file, dist/afterburner.html,
// with the game's script and styles inlined. Handy for sharing a playable build.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
let html = readFileSync(join(dist, 'index.html'), 'utf8');
html = html.replace(/<script type="module" crossorigin src="\.\/([^"]+)"><\/script>/, (_, p) =>
  `<script type="module">${readFileSync(join(dist, p), 'utf8').replace(/<\/script/g, '<\\/script')}</script>`);
html = html.replace(/<link rel="stylesheet" crossorigin href="\.\/([^"]+)">/, (_, p) =>
  `<style>${readFileSync(join(dist, p), 'utf8')}</style>`);
if (/src="\.\/assets|href="\.\/assets/.test(html)) throw new Error('an asset was not inlined');
writeFileSync(join(dist, 'afterburner.html'), html);
console.log(`dist/afterburner.html ${(html.length / 1024).toFixed(0)} KB`);
