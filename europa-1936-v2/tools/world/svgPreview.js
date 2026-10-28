// Náhled vektorové podoby světa přes resvg (SVG → PNG). CROP v px rastru (x,y,w,h), SCALE = pixelů obrázku na px rastru.
import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { ringPoints } from './trace.js';
import { TERRAIN } from './terrainStep.js';

const TERRAIN_COLOR = { plains: '#c3d28f', forest: '#5b8a52', hills: '#b3a26e', mountains: '#8c7f78', marsh: '#6fa59a', desert: '#e6d49a', urban: '#9b9ba3' };

function hsl(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return `#${[f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`;
}

export function svgPreview(W, dir, log, mode = process.env.SVGMODE || 'owner') {
  const { grid, arcs, rings, kinds, provs, CLS } = W;
  const crop = process.env.CROP ? process.env.CROP.split(',').map(Number) : [0, 0, grid.W, grid.H];
  const [cx, cy, cw, ch] = crop;
  const scale = Number(process.env.SCALE || 1);
  const f = (v) => v.toFixed(1);
  const pathOf = (lbl) => {
    let d = '';
    for (const r of rings.get(lbl) || []) {
      const P = ringPoints(arcs, r);
      if (P.length < 3) continue;
      d += 'M' + P.map((p) => `${f(p[0] - cx)} ${f(p[1] - cy)}`).join('L') + 'Z';
    }
    return d;
  };
  const colorOf = (lbl) => {
    const k = kinds[lbl];
    if (k === 'sea') return '#17365a';
    if (k === 'lake') return '#4a7ba6';
    if (k === 'void') return '#404040';
    const p = provs[lbl];
    if (mode === 'terrain') {
      if (W.provUrban && W.provUrban[lbl]) return TERRAIN_COLOR.urban;
      return TERRAIN_COLOR[TERRAIN[W.provTerrain[lbl]]];
    }
    if (mode === 'owner') {
      const o = W.provOwner[lbl];
      return hsl((o * 47) % 360, 0.45, 0.55);
    }
    if (mode === 'state') return hsl((p.state * 137.5) % 360, 0.5, 0.55);
    return hsl((lbl * 137.5) % 360, 0.5, 0.55);
  };
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cw * scale}" height="${ch * scale}" viewBox="0 0 ${cw} ${ch}"><rect width="${cw}" height="${ch}" fill="#17365a"/>`;
  for (const lbl of rings.keys()) {
    if (kinds[lbl] === 'sea' && mode !== 'sea') { /* moře kreslíme pozadím */ }
    const d = pathOf(lbl);
    if (!d) continue;
    svg += `<path d="${d}" fill="${mode === 'sea' && kinds[lbl] === 'sea' ? hsl((lbl * 137.5) % 360, 0.5, 0.4) : colorOf(lbl)}" fill-rule="evenodd" stroke="none"/>`;
  }
  const strokeFor = { [CLS.prov]: ['#00000055', 0.5], [CLS.state]: ['#000000aa', 1], [CLS.country]: ['#000000', 1.8], [CLS.coast]: ['#0b1d33', 1], [CLS.lake]: ['#27507a', 0.8], [CLS.sea]: ['#ffffff33', 0.6], [CLS.voidEdge]: ['#222', 1] };
  const groups = {};
  for (const a of arcs) {
    if (a.cls === CLS.frame) continue;
    const st = strokeFor[a.cls];
    if (!st) continue;
    (groups[a.cls] ||= []).push('M' + a.pts.map((p) => `${f(p[0] - cx)} ${f(p[1] - cy)}`).join('L'));
  }
  for (const c of [CLS.sea, CLS.prov, CLS.state, CLS.coast, CLS.lake, CLS.country, CLS.voidEdge]) {
    if (!groups[c]) continue;
    const [col, w] = strokeFor[c];
    svg += `<path d="${groups[c].join('')}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
  }
  if (mode === 'terrain' || process.env.SHOW_VP) {
    // železnice
    if (W.rails) {
      const byLvl = {};
      for (const [a, b, lv] of W.rails) { (byLvl[lv] ||= []).push(`M${f(W.info.bestI[a] % grid.W - cx)} ${f(((W.info.bestI[a] / grid.W) | 0) - cy)}L${f(W.info.bestI[b] % grid.W - cx)} ${f(((W.info.bestI[b] / grid.W) | 0) - cy)}`); }
      for (const lv of Object.keys(byLvl)) svg += `<path d="${byLvl[lv].join('')}" fill="none" stroke="#3a1d1d" stroke-opacity="0.85" stroke-width="${0.5 + lv * 0.35}" stroke-linecap="round"/>`;
    }
    for (let p = 1; p <= W.nLand; p++) {
      const c = W.provCities[p][0];
      if (!c) continue;
      const v = W.provVP[p];
      if (!v) continue;
      const x = c.x - cx, y = c.y - cy;
      if (x < -5 || y < -5 || x > cw + 5 || y > ch + 5) continue;
      svg += `<circle cx="${f(x)}" cy="${f(y)}" r="${(1.2 + Math.sqrt(v) * 0.55).toFixed(2)}" fill="#ffd54a" stroke="#000" stroke-width="0.5"/>`;
    }
    if (W.ports) for (const [p, sea] of W.ports) {
      const c = W.provCities[p][0] || { x: W.info.bestI[p] % grid.W, y: (W.info.bestI[p] / grid.W) | 0 };
      svg += `<rect x="${f(c.x - cx - 1.6)}" y="${f(c.y - cy - 1.6)}" width="3.2" height="3.2" fill="#2a6fd6" stroke="#fff" stroke-width="0.4"/>`;
    }
  }
  svg += '</svg>';
  const file = path.join(dir, `svg-${mode}${process.env.CROP ? '-crop' : ''}.png`);
  const png = new Resvg(svg, { fitTo: { mode: 'original' } }).render().asPng();
  fs.writeFileSync(file, png);
  log(`SVG náhled ${file} (${cw * scale}×${ch * scale})`);
}
