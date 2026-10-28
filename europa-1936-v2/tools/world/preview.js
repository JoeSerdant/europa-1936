// Náhledy kroků generátoru (PNG přímo z rastrů). Použití: STOP=3 CROP=900,500,500,400 node tools/generateWorld.js
import path from 'node:path';
import { writePNG, downscaleRGB } from './png.js';

function hsl(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}
const palette = (n) => Array.from({ length: n }, (_, i) => hsl((i * 137.508) % 360, 0.5 + ((i * 7) % 5) * 0.07, 0.42 + ((i * 11) % 5) * 0.06));

// kind: 'owners' | 'states' | 'provinces' | 'sea'
export function renderPreview(W, kind, dir, log) {
  const { grid, land, ownerIdx, stateOf, provOf, seaOf, river } = W;
  const GW = grid.W, GH = grid.H;
  const crop = process.env.CROP ? process.env.CROP.split(',').map(Number) : null;
  const [cx, cy, cw, ch] = crop || [0, 0, GW, GH];
  const scale = Number(process.env.SCALE || (crop ? 2 : 0.5));
  const pals = {};
  const color = (i) => {
    if (land[i] === 2) return [70, 120, 160];
    if (land[i] === 1) {
      if (kind === 'sea') return ownerIdx[i] === 255 ? [50, 50, 50] : [120, 110, 90];
      if (ownerIdx[i] === 255) return [66, 66, 66];
      if (kind === 'owners') return (pals.o ||= palette(40))[ownerIdx[i]];
      if (kind === 'states') return stateOf[i] ? (pals.s ||= palette(W.states.length))[stateOf[i]] : [255, 0, 255];
      return provOf[i] ? (pals.p ||= palette(W.provs.length))[provOf[i]] : [255, 0, 255];
    }
    if (kind === 'sea' && seaOf && seaOf[i]) return (pals.z ||= palette(W.seas.length + 2))[seaOf[i]];
    return [24, 52, 84];
  };
  const out = new Uint8Array(cw * ch * 3);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const gx = cx + x, gy = cy + y;
      if (gx >= GW || gy >= GH) continue;
      const i = gy * GW + gx;
      let c = color(i);
      if (gx < GW - 1 && gy < GH - 1) {
        const sb = stateOf[i] !== stateOf[i + 1] || stateOf[i] !== stateOf[i + GW];
        const pb = provOf && (provOf[i] !== provOf[i + 1] || provOf[i] !== provOf[i + GW]);
        const ob = ownerIdx[i] !== ownerIdx[i + 1] || ownerIdx[i] !== ownerIdx[i + GW];
        if (land[i] === 1) {
          if (ob) c = [0, 0, 0];
          else if (kind !== 'owners' && sb) c = [20, 20, 20];
          else if ((kind === 'provinces') && pb) c = [c[0] * 0.55, c[1] * 0.55, c[2] * 0.55];
          if (kind === 'provinces' && river && river[i]) c = [40, 90, 220];
        }
        if (kind === 'sea' && seaOf && land[i] === 0 && seaOf[i] !== seaOf[i + 1]) c = [255, 255, 255];
      }
      const o = (y * cw + x) * 3;
      out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2];
    }
  }
  let w = cw, h = ch, data = out;
  if (scale < 1) { const k = Math.round(1 / scale); const d = downscaleRGB(out, cw, ch, k); w = d.w; h = d.h; data = d.data; }
  else if (scale > 1) {
    const k = Math.round(scale);
    w = cw * k; h = ch * k; data = new Uint8Array(w * h * 3);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const s = (((y / k) | 0) * cw + ((x / k) | 0)) * 3, o = (y * w + x) * 3;
      data[o] = out[s]; data[o + 1] = out[s + 1]; data[o + 2] = out[s + 2];
    }
  }
  const file = path.join(dir, `${kind}${crop ? '-crop' : ''}.png`);
  writePNG(file, w, h, data);
  log(`náhled ${file} (${w}×${h})`);
}
