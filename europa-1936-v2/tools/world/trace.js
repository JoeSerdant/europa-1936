// Vektorizace rastru oblastí: hranice mezi štítky = oblasti „oblouky“ (jako TopoJSON) – sdílené, hladké a topologicky konzistentní.
//  1) hrany mezi pixely s různým štítkem → řetězce mezi uzly, kde se setkají ≥ 3 štítky (nebo uzavřené smyčky)
//  2) vyhlazení (klouzavý průměr s pevnými konci) + zjednodušení (Douglas–Peucker)
//  3) sestavení okruhů oblastí z oblouků (pravidlo: oblast je vlevo; ve sporném uzlu zatáčet doleva, rovně, doprava)

const DX = [1, 0, -1, 0];   // E, S, W, N  (osa y míří dolů)
const DY = [0, 1, 0, -1];

export function traceArcs(lab, GW, GH, log = () => {}) {
  const W1 = GW + 1;
  const NN = W1 * (GH + 1);
  const L = (x, y) => (x < 0 || y < 0 || x >= GW || y >= GH ? -1 : lab[y * GW + x]);
  const eE = new Uint8Array(NN);   // hrana z uzlu na východ
  const eS = new Uint8Array(NN);   // hrana z uzlu na jih
  for (let y = 0; y <= GH; y++) {
    for (let x = 0; x <= GW; x++) {
      const n = y * W1 + x;
      if (x < GW && L(x, y - 1) !== L(x, y)) eE[n] = 1;
      if (y < GH && L(x - 1, y) !== L(x, y)) eS[n] = 1;
    }
  }
  const has = (n, d) => {
    switch (d) {
      case 0: return eE[n] === 1;
      case 1: return eS[n] === 1;
      case 2: return n % W1 > 0 && eE[n - 1] === 1;
      default: return n >= W1 && eS[n - W1] === 1;
    }
  };
  const step = (n, d) => n + (d === 0 ? 1 : d === 1 ? W1 : d === 2 ? -1 : -W1);
  const degree = (n) => (has(n, 0) ? 1 : 0) + (has(n, 1) ? 1 : 0) + (has(n, 2) ? 1 : 0) + (has(n, 3) ? 1 : 0);
  const visE = new Uint8Array(NN), visS = new Uint8Array(NN);
  const visited = (n, d) => (d === 0 ? visE[n] : d === 1 ? visS[n] : d === 2 ? visE[n - 1] : visS[n - W1]);
  const mark = (n, d) => { if (d === 0) visE[n] = 1; else if (d === 1) visS[n] = 1; else if (d === 2) visE[n - 1] = 1; else visS[n - W1] = 1; };
  // štítky vlevo/vpravo od hrany vedoucí z uzlu n směrem d
  const sides = (n, d) => {
    const x = n % W1, y = (n / W1) | 0;
    switch (d) {
      case 0: return [L(x, y - 1), L(x, y)];
      case 1: return [L(x, y), L(x - 1, y)];
      case 2: return [L(x - 1, y), L(x - 1, y - 1)];
      default: return [L(x - 1, y - 1), L(x, y - 1)];
    }
  };

  const arcs = [];
  const trace = (n0, d0) => {
    const [l, r] = sides(n0, d0);
    const nodes = [n0];
    let cur = n0, d = d0;
    for (;;) {
      mark(cur, d);
      const nx = step(cur, d);
      nodes.push(nx);
      if (nx === n0) break;
      const dg = degree(nx);
      if (dg !== 2) break;
      // jediná další hrana (kromě zpětné)
      let nd = -1;
      for (const t of [d, (d + 3) % 4, (d + 1) % 4]) if (has(nx, t)) { nd = t; break; }
      if (nd < 0) break;
      cur = nx; d = nd;
    }
    arcs.push({ l, r, n0, n1: nodes[nodes.length - 1], d0, dEnd: d, nodes, closed: nodes[0] === nodes[nodes.length - 1] });
  };

  // 1) oblouky vycházející z křižovatek
  let junctions = 0;
  for (let n = 0; n < NN; n++) {
    const dg = (eE[n] ? 1 : 0) + (eS[n] ? 1 : 0) + (n % W1 > 0 && eE[n - 1] ? 1 : 0) + (n >= W1 && eS[n - W1] ? 1 : 0);
    if (dg < 3) continue;
    junctions++;
    for (let d = 0; d < 4; d++) if (has(n, d) && !visited(n, d)) trace(n, d);
  }
  // 2) uzavřené smyčky bez křižovatky
  for (let n = 0; n < NN; n++) {
    for (let d = 0; d < 2; d++) if (has(n, d) && !visited(n, d)) trace(n, d);
  }
  log(`oblouků: ${arcs.length}, křižovatek: ${junctions}`);
  return { arcs, W1 };
}

// ---- vyhlazení + zjednodušení ---------------------------------------------------------------------------------------------------
function smoothPts(P, closed, passes = 2) {
  // P: pole [x,y]; vrací nové pole; konce otevřených oblouků zůstávají
  let cur = P;
  const n = P.length;
  if (n < 4) return P;
  const wts = [1, 2, 3, 2, 1];
  for (let pass = 0; pass < passes; pass++) {
    const out = new Array(n);
    const m = closed ? n - 1 : n;      // u smyčky je poslední bod = první
    for (let i = 0; i < n; i++) {
      if (!closed && (i === 0 || i === n - 1)) { out[i] = cur[i]; continue; }
      if (closed && i === n - 1) { out[i] = out[0]; continue; }
      let sx = 0, sy = 0, sw = 0;
      for (let k = -2; k <= 2; k++) {
        let j = i + k;
        let px, py;
        if (closed) { j = ((j % m) + m) % m; px = cur[j][0]; py = cur[j][1]; }
        else if (j < 0) { px = 2 * cur[0][0] - cur[-j][0]; py = 2 * cur[0][1] - cur[-j][1]; }
        else if (j > n - 1) { const t = 2 * (n - 1) - j; px = 2 * cur[n - 1][0] - cur[t][0]; py = 2 * cur[n - 1][1] - cur[t][1]; }
        else { px = cur[j][0]; py = cur[j][1]; }
        const w = wts[k + 2];
        sx += px * w; sy += py * w; sw += w;
      }
      out[i] = [sx / sw, sy / sw];
    }
    cur = out;
  }
  return cur;
}

function dp(P, eps) {
  const n = P.length;
  if (n <= 2) return P;
  const keep = new Uint8Array(n);
  keep[0] = keep[n - 1] = 1;
  const stack = [[0, n - 1]];
  const e2 = eps * eps;
  while (stack.length) {
    const [a, b] = stack.pop();
    let md = -1, mi = -1;
    const ax = P[a][0], ay = P[a][1], bx = P[b][0], by = P[b][1];
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) {
      let d;
      if (l2 === 0) d = (P[i][0] - ax) ** 2 + (P[i][1] - ay) ** 2;
      else {
        let t = ((P[i][0] - ax) * dx + (P[i][1] - ay) * dy) / l2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        d = (P[i][0] - (ax + t * dx)) ** 2 + (P[i][1] - (ay + t * dy)) ** 2;
      }
      if (d > md) { md = d; mi = i; }
    }
    if (md > e2) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
  }
  const out = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(P[i]);
  return out;
}

export function finishArcs(arcs, W1, { eps = 0.3, passes = 2 } = {}) {
  for (const a of arcs) {
    const P = a.nodes.map((n) => [n % W1, (n / W1) | 0]);
    let Q = smoothPts(P, a.closed, passes);
    if (a.closed) {
      // smyčku rozdělíme na dvě poloviny pro DP (aby se neztratil tvar), pak složíme
      const h = Q.length >> 1;
      if (Q.length > 8) { const A = dp(Q.slice(0, h + 1), eps), B = dp(Q.slice(h), eps); Q = A.concat(B.slice(1)); }
    } else Q = dp(Q, eps);
    a.pts = Q;
    delete a.nodes;
  }
}

// ---- okruhy oblastí --------------------------------------------------------------------------------------------------------------
// vrací Map štítek → [okruh = [signed arc ids]]; id oblouku i ≥ 0: dopředu, ~i: obráceně
export function buildRings(arcs) {
  const out = new Map();
  // směrové oblouky: pro každý štítek (≥ 0) = oblouky, kde je vlevo; (obrácené) kde je vpravo
  const byLabel = new Map();
  const add = (lbl, entry) => { let a = byLabel.get(lbl); if (!a) { a = []; byLabel.set(lbl, a); } a.push(entry); };
  arcs.forEach((a, i) => {
    if (a.l >= 0) add(a.l, { id: i, rev: false, start: a.n0, end: a.n1, dIn: a.d0, dOut: a.dEnd });
    if (a.r >= 0) add(a.r, { id: ~i, rev: true, start: a.n1, end: a.n0, dIn: (a.dEnd + 2) % 4, dOut: (a.d0 + 2) % 4 });
  });
  for (const [lbl, list] of byLabel) {
    const startMap = new Map();
    for (const e of list) { let s = startMap.get(e.start); if (!s) { s = []; startMap.set(e.start, s); } s.push(e); }
    const used = new Set();
    const rings = [];
    for (const e0 of list) {
      if (used.has(e0)) continue;
      const ring = [];
      let e = e0;
      let guard = 0;
      while (e && !used.has(e) && guard++ < 1e6) {
        used.add(e);
        ring.push(e.id);
        const cand = (startMap.get(e.end) || []).filter((c) => !used.has(c) || c === e0);
        if (!cand.length) { e = null; break; }
        if (cand.length === 1) { e = cand[0]; }
        else {
          // preferuj levou zatáčku, rovně, pravou (relativně ke směru příjezdu e.dOut)
          const rank = (c) => { const t = (c.dIn - e.dOut + 4) % 4; return t === 3 ? 0 : t === 0 ? 1 : t === 1 ? 2 : 3; };
          cand.sort((p, q) => rank(p) - rank(q));
          e = cand[0];
        }
        if (e === e0) break;
      }
      if (e && e !== e0 && !used.has(e)) { /* nedokončený okruh – nemělo by nastat */ }
      rings.push(ring);
    }
    out.set(lbl, rings);
  }
  return out;
}

// bodová posloupnost okruhu (z vyhlazených oblouků)
export function ringPoints(arcs, ring) {
  const pts = [];
  for (const id of ring) {
    const rev = id < 0;
    const a = arcs[rev ? ~id : id];
    const P = rev ? a.pts.slice().reverse() : a.pts;
    for (let k = pts.length ? 1 : 0; k < P.length; k++) pts.push(P[k]);
  }
  return pts;
}

export function ringArea(P) {
  let s = 0;
  for (let i = 0, n = P.length, j = n - 1; i < n; j = i++) s += P[j][0] * P[i][1] - P[i][0] * P[j][1];
  return s / 2;
}
