// Náhled hotového světa (src/data/world.json) bez generátoru: načte JSON stejně jako hra a nakreslí ho přes resvg.
// Použití: node tools/previewWorld.js [owner|terrain] [x,y,w,h] [měřítko]    → tools/preview/world-<režim>.png
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { buildWorld, decodeArcs, ringToPoints } from '../src/engine/worldCore.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/world.json'), 'utf8'));
const W = buildWorld(raw);
const arcs = decodeArcs(raw);
const mode = process.argv[2] || 'owner';
const crop = process.argv[3] ? process.argv[3].split(',').map(Number) : [0, 0, raw.frame.w, raw.frame.h];
const scale = Number(process.argv[4] || 0.5);
const [cx, cy, cw, ch] = crop;
const TERRAIN_COLOR = ['#c3d28f', '#5b8a52', '#b3a26e', '#8c7f78', '#6fa59a', '#e6d49a', '#9b9ba3'];
const f = (v) => v.toFixed(1);
const pathOf = (l) => raw.rings[l].map((ring) => { const P = ringToPoints(arcs, ring); let d = 'M'; for (let i = 0; i < P.length; i += 2) d += `${i ? 'L' : ''}${f(P[i] - cx)} ${f(P[i + 1] - cy)}`; return d + 'Z'; }).join('');
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cw * scale}" height="${ch * scale}" viewBox="0 0 ${cw} ${ch}"><rect width="${cw}" height="${ch}" fill="#3a3a3a"/>`;
for (let l = 1; l < W.nLabel; l++) {
  const k = W.kind(l);
  const fill = k === 'sea' ? '#17365a' : k === 'lake' ? '#4a7ba6' : mode === 'terrain' ? TERRAIN_COLOR[W.terrain[l]] : W.owners[W.provOwner0[l]].color;
  svg += `<path d="${pathOf(l)}" fill="${fill}" fill-rule="evenodd"/>`;
}
const stroke = { 1: ['#00000044', 0.5], 2: ['#000000aa', 1], 3: ['#000', 1.8], 4: ['#0b1d33', 1] };
const groups = {};
arcs.forEach((a) => {
  let c = a.cls;
  if (!stroke[c]) return;
  let d = 'M'; for (let i = 0; i < a.pts.length; i += 2) d += `${i ? 'L' : ''}${f(a.pts[i] - cx)} ${f(a.pts[i + 1] - cy)}`;
  (groups[c] ||= []).push(d);
});
for (const c of [1, 2, 4, 3]) if (groups[c]) svg += `<path d="${groups[c].join('')}" fill="none" stroke="${stroke[c][0]}" stroke-width="${stroke[c][1]}" stroke-linejoin="round"/>`;
svg += '</svg>';
const out = path.join(ROOT, 'tools/preview', `world-${mode}.png`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, new Resvg(svg, { fitTo: { mode: 'original' } }).render().asPng());
console.log(`náhled ${out}`);
