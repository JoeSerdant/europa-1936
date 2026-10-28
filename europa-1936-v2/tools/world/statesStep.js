// Krok 2: státy (provincie 1. řádu) – geodetický růst ze semínek uvnitř území vlastníka.
import { STATE_SEEDS } from './data/states.js';
import { growRegions, components, noiseCost } from './raster.js';
import { OWNERS } from './config.js';

const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

// najde nejbližší pixel patřící skupině g (spirálou do poloměru R)
export function snapToGroup(W, H, group, g, px, py, R = 40) {
  const x0 = Math.round(px), y0 = Math.round(py);
  let best = -1, bd = Infinity;
  for (let dy = -R; dy <= R; dy++) {
    const y = y0 + dy;
    if (y < 0 || y >= H) continue;
    for (let dx = -R; dx <= R; dx++) {
      const x = x0 + dx;
      if (x < 0 || x >= W) continue;
      if (group[y * W + x] !== g) continue;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = y * W + x; }
    }
  }
  return best < 0 ? null : { idx: best, dist: Math.sqrt(bd) };
}

export function buildStates(W, log) {
  const { grid, land, ownerIdx, ownerTags } = W;
  const { W: GW, H: GH } = grid;
  const N = GW * GH;
  const group = new Uint16Array(N);
  for (let i = 0; i < N; i++) if (land[i] === 1 && ownerIdx[i] > 0 && ownerIdx[i] < 255) group[i] = ownerIdx[i];

  // plynulý šum, který zvlní hranice
  const cost = noiseCost(GW, GH, { scale: Number(process.env.SCALE_S || 45), seed: 11, lo: Number(process.env.LO_S || 0.45), hi: Number(process.env.HI_S || 2.2), contrast: Number(process.env.CON_S || 3), oct: 3 });

  const states = [{ id: '', owner: '', name: '' }]; // index 0 nepoužit
  const seeds = [];
  const mult = new Float32Array(2048).fill(1);
  const used = new Set();
  for (const tag of Object.keys(STATE_SEEDS)) {
    const own = ownerTags.indexOf(tag);
    if (own < 1) throw new Error(`neznámý vlastník ${tag}`);
    for (const [name, lon, lat, opts = {}] of STATE_SEEDS[tag]) {
      const [px, py] = grid.toPx(lon, lat);
      const snap = snapToGroup(GW, GH, group, own, px, py, 60);
      const label = states.length;
      if (!snap) { console.warn(`!! stát ${tag}/${name}: semínko mimo území (${lon}, ${lat})`); states.push({ id: '', owner: tag, name, missing: true }); continue; }
      const km = snap.dist * grid.res;
      if (km > 30) console.warn(`   stát ${tag}/${name}: semínko posunuto o ${km.toFixed(0)} km`);
      let id = `${tag.toLowerCase()}_${strip(name)}`;
      while (used.has(id)) id += '_';
      used.add(id);
      states.push({ id, owner: tag, name, opts, seedIdx: snap.idx, w: opts.w ?? 1, sp: opts.sp ?? 1 });
      seeds.push({ idx: snap.idx, label });
      mult[label] = 1 / (opts.w ?? 1);
    }
  }
  log(`semínek států: ${seeds.length}`);
  if (states.length > 1500) throw new Error('moc států');

  const { lab } = growRegions(GW, GH, group, seeds, cost, Infinity, mult);

  // nepřiřazená pevnina (ostrovy bez semínka) → nejbližší stát téhož vlastníka
  const miss = new Uint8Array(N);
  let nMiss = 0;
  for (let i = 0; i < N; i++) if (group[i] && !lab[i]) { miss[i] = 1; nMiss++; }
  if (nMiss) {
    const { comp, list } = components(GW, GH, miss);
    const seedPts = seeds.map((s) => ({ label: s.label, x: s.idx % GW, y: (s.idx / GW) | 0, owner: ownerTags.indexOf(states[s.label].owner) }));
    const bad = [];
    for (const c of list) {
      const own = group[c.first];
      let bestL = 0, bd = Infinity;
      for (const s of seedPts) {
        if (s.owner !== own) continue;
        const d = (s.x - c.cx) ** 2 + (s.y - c.cy) ** 2;
        if (d < bd) { bd = d; bestL = s.label; }
      }
      c.state = bestL;
      if (c.size * grid.res * grid.res > 900) bad.push(`${ownerTags[own]}→${states[bestL]?.name} (${Math.round(c.size * grid.res * grid.res)} km² u ${grid.toLonLat(c.cx, c.cy).map((v) => v.toFixed(1))})`);
    }
    for (let i = 0; i < N; i++) if (miss[i]) lab[i] = list[comp[i]].state;
    log(`bez semínka: ${list.length} ostrovů (${nMiss} px)${bad.length ? ' větší: ' + bad.join('; ') : ''}`);
  }

  // plochy
  const area = new Float64Array(states.length);
  for (let y = 0; y < GH; y++) {
    const k = grid.kmPerPx(GW / 2, y);
    for (let x = 0; x < GW; x++) {
      const l = lab[y * GW + x];
      if (l) area[l] += 1;
    }
  }
  for (let l = 1; l < states.length; l++) { states[l].px = area[l]; states[l].areaKm2 = Math.round(area[l] * grid.res * grid.res); }
  W.states = states;
  W.stateOf = lab;
  W.stateGroup = group;
}
