// Úklid: příliš drobné provincie (pevninské i mořské) se sloučí se sousedem, ať na mapě nevznikají nekliknutelné flíčky.
// Pevninská provincie se spojuje se sousedem téhož státu (jinak téhož vlastníka), mořská se sousední mořskou provincií.

// arr: Uint16Array štítků (0 = nic), n: počet štítků, minPx, okPair(a, b, tier) -> 2 (nejlepší) | 1 | 0 (nesmí)
function mergeSmall(GW, GH, arr, n, minPx, rank) {
  const N = GW * GH;
  const px = new Int32Array(n + 1);
  for (let i = 0; i < N; i++) if (arr[i]) px[arr[i]]++;
  const tiny = new Set();
  for (let l = 1; l <= n; l++) if (px[l] < minPx) tiny.add(l);
  if (!tiny.size) return { map: null, merged: 0, dropped: 0 };
  const nb = new Map();
  for (const t of tiny) nb.set(t, new Map());
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const i = y * GW + x, a = arr[i];
      if (!a) continue;
      if (x + 1 < GW) { const b = arr[i + 1]; if (b && b !== a) { if (tiny.has(a)) { const m = nb.get(a); m.set(b, (m.get(b) || 0) + 1); } if (tiny.has(b)) { const m = nb.get(b); m.set(a, (m.get(a) || 0) + 1); } } }
      if (y + 1 < GH) { const b = arr[i + GW]; if (b && b !== a) { if (tiny.has(a)) { const m = nb.get(a); m.set(b, (m.get(b) || 0) + 1); } if (tiny.has(b)) { const m = nb.get(b); m.set(a, (m.get(a) || 0) + 1); } } }
    }
  }
  const target = new Map();
  for (const t of tiny) {
    let best = 0, bs = -1;
    for (const [b, c] of nb.get(t)) {
      const r = rank(t, b, px[t]);
      if (!r) continue;
      const s = r * 1e6 + (tiny.has(b) ? 0 : 5e5) + c;
      if (s > bs) { bs = s; best = b; }
    }
    if (best) target.set(t, best);
  }
  // řetězení (drobná → drobná → ...) s ochranou proti cyklům
  const final = new Map();
  let dropped = 0;
  for (const t of tiny) {
    let cur = t, steps = 0;
    while (target.has(cur) && tiny.has(cur) && steps++ < 20) cur = target.get(cur);
    if (cur === t || tiny.has(cur)) { final.set(t, 0); dropped++; }
    else final.set(t, cur);
  }
  // přečíslování
  const newId = new Int32Array(n + 1);
  const keep = [0];                           // keep[nové id] = původní štítek, který přežil
  let k = 0;
  for (let l = 1; l <= n; l++) {
    if (!tiny.has(l) || (!final.get(l) && px[l] >= 8)) { newId[l] = ++k; keep.push(l); }
  }
  for (const t of tiny) if (final.get(t)) newId[t] = newId[final.get(t)];
  for (let i = 0; i < N; i++) if (arr[i]) arr[i] = newId[arr[i]];
  return { map: newId, keep, merged: tiny.size - (dropped), dropped, count: k };
}

export function mergeTinyProvinces(W, minPx, log) {
  const { grid, provOf, provs, states } = W;
  const L = W.nLand;
  const rank = (a, b) => {
    if (provs[a].state === provs[b].state) return 2;
    if (states[provs[a].state].owner === states[provs[b].state].owner) return 1;
    return 0.5;                 // střípek u cizí hranice se připojí k cizí provincii (je to pár pixelů)
  };
  const r = mergeSmall(grid.W, grid.H, provOf, L, minPx, rank);
  if (!r.map) return;
  W.provs = r.keep.map((l) => (l ? provs[l] : { state: 0 }));
  W.nLand = r.count;
  log(`drobné provincie: sloučeno ${r.merged}, odstraněno ${r.dropped} → provincií ${r.count}`);
}

export function mergeTinySeas(W, minPx, log) {
  const { grid, seaOf, seas } = W;
  const S = seas.length - 1;
  const r = mergeSmall(grid.W, grid.H, seaOf, S, minPx, () => 2);
  if (!r.map) return;
  W.seas = r.keep.map((l) => (l ? seas[l] : seas[0]));
  log(`drobná moře: sloučeno ${r.merged}, odstraněno ${r.dropped} → moří ${r.count}`);
}
