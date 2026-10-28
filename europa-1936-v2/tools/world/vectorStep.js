// Krok 5: jednotný štítkový rastr (pevnina, moře, jezera, prázdno) → oblouky hranic → okruhy oblastí.
import { components } from './raster.js';
import { traceArcs, finishArcs, buildRings, ringPoints, ringArea } from './trace.js';

// štítky: 0 = prázdno (pevnina mimo hru), 1..L = pevninské provincie, L+1..L+S = moře, L+S+1.. = jezera
export function buildLabels(W, log) {
  const { grid, land, provOf, seaOf, ownerIdx, stateOf } = W;
  const { W: GW, H: GH } = grid;
  const N = GW * GH;
  const L = W.nLand;
  const S = W.seas.length - 1;

  // 1) nepřiřazené mořské pixely: dilatací sousedních mořských štítků, zbytek (izolované tůně) dolijeme do sousední pevniny
  let miss = 0;
  for (let i = 0; i < N; i++) if (land[i] === 0 && !seaOf[i]) miss++;
  if (miss) {
    let changed = true, rounds = 0;
    const nb = [-1, 1, -GW, GW];
    while (changed && rounds++ < 40) {
      changed = false;
      for (let i = 0; i < N; i++) {
        if (land[i] !== 0 || seaOf[i]) continue;
        for (const o of nb) {
          const j = i + o;
          if (j < 0 || j >= N) continue;
          if (land[j] === 0 && seaOf[j]) { seaOf[i] = seaOf[j]; changed = true; break; }
        }
      }
    }
    let rest = 0;
    for (let k = 0; k < 3; k++) {
      for (let i = 0; i < N; i++) {
        if (land[i] !== 0 || seaOf[i]) continue;
        for (const o of nb) {
          const j = i + o;
          if (j < 0 || j >= N) continue;
          if (land[j] === 1 && provOf[j]) { land[i] = 1; provOf[i] = provOf[j]; stateOf[i] = stateOf[j]; ownerIdx[i] = ownerIdx[j]; break; }
        }
      }
    }
    for (let i = 0; i < N; i++) if (land[i] === 0 && !seaOf[i]) rest++;
    log(`mořské pixely bez oblasti: ${miss} → po úklidu ${rest}`);
    // poslední záchrana: libovolný štítek ze sousedů (např. u okraje mapy)
    if (rest) for (let i = 0; i < N; i++) if (land[i] === 0 && !seaOf[i]) seaOf[i] = 1;
  }

  // 2) jezera = komponenty land==2
  const lakeKey = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (land[i] === 2) lakeKey[i] = 1;
  const { comp, list } = components(GW, GH, lakeKey);

  const lab = new Uint16Array(N);
  const kinds = new Array(L + S + list.length + 1).fill('void');
  for (let l = 1; l <= L; l++) kinds[l] = 'land';
  for (let s = 1; s <= S; s++) kinds[L + s] = 'sea';
  for (let k = 0; k < list.length; k++) kinds[L + S + 1 + k] = 'lake';
  for (let i = 0; i < N; i++) {
    if (land[i] === 1) lab[i] = provOf[i] ? provOf[i] : 0;           // prázdno = 0
    else if (land[i] === 0) lab[i] = L + seaOf[i];
    else lab[i] = L + S + 1 + comp[i];
  }
  W.lab = lab; W.kinds = kinds; W.nSea = S; W.nLake = list.length;
  log(`štítků: ${kinds.length} (provincie ${L}, moře ${S}, jezera ${list.length})`);
}

export function buildVectors(W, log) {
  const { grid, lab, kinds, provs, states } = W;
  const { W: GW, H: GH } = grid;
  const L = W.nLand;
  const { arcs, W1 } = traceArcs(lab, GW, GH, log);
  finishArcs(arcs, W1, { eps: Number(process.env.EPS || 0.3), passes: Number(process.env.PASSES || 2) });
  let pts = 0;
  for (const a of arcs) pts += a.pts.length;
  log(`bodů v obloucích: ${pts}`);

  // třída oblouku
  const ownerOfLabel = (l) => (l >= 1 && l <= L ? W.ownerTags[W.provOwner[l]] : null);
  const CLS = { frame: 0, prov: 1, state: 2, country: 3, coast: 4, lake: 5, sea: 6, voidEdge: 7 };
  for (const a of arcs) {
    const kl = a.l < 0 ? 'frame' : kinds[a.l], kr = a.r < 0 ? 'frame' : kinds[a.r];
    let c;
    if (kl === 'frame' || kr === 'frame') c = CLS.frame;
    else if (kl === 'land' && kr === 'land') {
      const pa = provs[a.l], pb = provs[a.r];
      if (W.provOwner[a.l] !== W.provOwner[a.r]) c = CLS.country;
      else if (pa.state !== pb.state) c = CLS.state;
      else c = CLS.prov;
    } else if ((kl === 'land' && kr === 'sea') || (kl === 'sea' && kr === 'land')) c = CLS.coast;
    else if ((kl === 'land' && kr === 'lake') || (kl === 'lake' && kr === 'land')) c = CLS.lake;
    else if (kl === 'sea' && kr === 'sea') c = CLS.sea;
    else if ((kl === 'void' && kr === 'land') || (kl === 'land' && kr === 'void')) c = CLS.voidEdge;
    else if ((kl === 'void' && kr === 'sea') || (kl === 'sea' && kr === 'void')) c = CLS.coast;
    else c = CLS.voidEdge;
    a.cls = c;
  }
  const rings = buildRings(arcs);

  // kontrola: plocha okruhů vs. počet pixelů
  const cnt = new Int32Array(kinds.length);
  for (let i = 0; i < lab.length; i++) cnt[lab[i]]++;
  let bad = 0, worst = 0;
  const out = [];
  for (const [lbl, rs] of rings) {
    let area = 0;
    for (const r of rs) area += ringArea(ringPoints(arcs, r));
    area = Math.abs(area);
    const px = cnt[lbl];
    const rel = Math.abs(area - px) / Math.max(1, px);
    if (px > 30 && rel > 0.06) { bad++; out.push(`${lbl}(${kinds[lbl]}) okruhů ${rs.length}: plocha ${area.toFixed(0)} vs ${px}`); }
    worst = Math.max(worst, px > 30 ? rel : 0);
  }
  log(`kontrola ploch: ${bad} oblastí s odchylkou > 6 % (nejhorší ${(worst * 100).toFixed(1)} %)`);
  if (out.length) log('  např. ' + out.slice(0, 6).join('; '));
  W.arcs = arcs; W.rings = rings; W.CLS = CLS;
}
