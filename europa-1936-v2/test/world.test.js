import { describe, it, expect } from 'vitest';
import { getWorld, decodeArcs, ringToPoints, ADJ } from '../src/engine/world.js';

const W = getWorld();
const arcs = decodeArcs(W.raw);

// sudo-liché pravidlo
function inside(pts, x, y) {
  let c = false;
  const n = pts.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = pts[2 * i], yi = pts[2 * i + 1], xj = pts[2 * j], yj = pts[2 * j + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const insideLabel = (label, x, y) => {
  let c = false;
  for (const ring of W.raw.rings[label]) if (inside(ringToPoints(arcs, ring), x, y)) c = !c;
  return c;
};

describe('svět: počty a struktura', () => {
  it('má dost provincií, moří a států', () => {
    expect(W.L).toBeGreaterThan(2500);
    expect(W.S).toBeGreaterThan(300);
    expect(W.states.length - 1).toBeGreaterThan(400);
    expect(W.owners.filter((o) => o && !o.dyn).length).toBe(35);   // země ze souboru; rezervní země (M69) přibývají za nimi
    expect(W.nLabel).toBe(1 + W.L + W.S + W.K);
  });
  it('každá pevninská provincie má jméno, stát téhož vlastníka a kladnou plochu', () => {
    const names = new Set();
    for (let p = 1; p <= W.L; p++) {
      const o = W.land[p];
      expect(o.n, `jméno ${p}`).toBeTruthy();
      expect(names.has(o.n), `duplicitní jméno ${o.n}`).toBe(false);
      names.add(o.n);
      expect(o.s).toBeGreaterThan(0);
      expect(W.stateOwner0[o.s], `vlastník státu u ${o.n}`).toBe(o.o);
      expect(o.a).toBeGreaterThan(0);
      expect(W.states[o.s].v).toContain(p);
    }
  });
  it('každý stát má aspoň jednu provincii a jednoznačné id', () => {
    const ids = new Set();
    for (let s = 1; s < W.states.length; s++) {
      const st = W.states[s];
      expect(st.v.length, `stát ${st.n}`).toBeGreaterThan(0);
      expect(ids.has(st.id)).toBe(false);
      ids.add(st.id);
      expect(W.land[st.cap].s).toBe(s);
    }
  });
  it('každá země má hlavní město uvnitř svého území', () => {
    for (let i = 1; i < W.owners.length; i++) {
      const o = W.owners[i];
      expect(o.cap, o.tag).toBeGreaterThan(0);
      if (!o.dyn) expect(W.provOwner0[o.cap], o.tag).toBe(i);   // rezervní země nemá na začátku žádné území (hlavní město je v cizí zemi)
    }
  });
  it('počty obyvatel dávají smysl', () => {
    let sum = 0;
    for (let p = 1; p <= W.L; p++) { expect(W.pop[p]).toBeGreaterThanOrEqual(0); sum += W.pop[p]; }
    expect(sum).toBeGreaterThan(500000);
    expect(sum).toBeLessThan(700000);
  });
});

describe('svět: sousednosti', () => {
  it('pozemní sousednosti jsou symetrické', () => {
    for (let p = 1; p <= W.L; p++) {
      W.forLandNeighbors(p, (q, kind, len) => {
        let found = false;
        W.forLandNeighbors(q, (r, k2, l2) => { if (r === p) { found = true; expect(k2).toBe(kind); expect(l2).toBe(len); } });
        expect(found, `${W.provName(p)} ↔ ${W.provName(q)}`).toBe(true);
      });
    }
  });
  it('mořské sousednosti a pobřeží si odpovídají', () => {
    for (let s = 1; s <= W.S; s++) {
      const sl = W.L + s;
      W.forSeaNeighbors(sl, (t, len) => {
        let found = false;
        W.forSeaNeighbors(t, (u) => { if (u === sl) found = true; });
        expect(found, `moře ${s} ↔ ${t - W.L}`).toBe(true);
      });
      for (let k = W.seaCoast.start[s]; k < W.seaCoast.start[s + 1]; k++) {
        const p = W.seaCoast.to[k];
        let found = false;
        W.forCoast(p, (m) => { if (m === sl) found = true; });
        expect(found, `pobřeží ${p} ↔ moře ${s}`).toBe(true);
      }
    }
  });
  it('přístavy leží u moře, s nímž provincie sousedí', () => {
    let n = 0;
    for (let p = 1; p <= W.L; p++) {
      if (!W.portSea[p]) continue;
      n++;
      expect(W.isSea(W.portSea[p])).toBe(true);
      let ok = false;
      W.forCoast(p, (m) => { if (m === W.portSea[p]) ok = true; });
      expect(ok, W.provName(p)).toBe(true);
      expect(W.portLevel[p]).toBeGreaterThanOrEqual(1);
      expect(W.portLevel[p]).toBeLessThanOrEqual(4);
    }
    expect(n).toBeGreaterThan(150);
  });
  it('železnice spojují sousední provincie', () => {
    expect(W.raw.rails.length).toBeGreaterThan(800);
    for (const [a, b, lv] of W.raw.rails) {
      expect(lv).toBeGreaterThanOrEqual(1);
      expect(lv).toBeLessThanOrEqual(5);
      let adj = false;
      W.forLandNeighbors(a, (q) => { if (q === b) adj = true; });
      expect(adj, `${W.provName(a)} – ${W.provName(b)}`).toBe(true);
    }
  });
  it('velké země drží pohromadě (největší souvislá část)', () => {
    const comp = new Int32Array(W.L + 1).fill(-1);
    const sizes = [];
    for (let p = 1; p <= W.L; p++) {
      if (comp[p] >= 0) continue;
      const id = sizes.length;
      let n = 0;
      const stack = [p];
      comp[p] = id;
      while (stack.length) {
        const u = stack.pop(); n++;
        W.forLandNeighbors(u, (q, kind) => { if (comp[q] < 0 && W.provOwner0[q] === W.provOwner0[u]) { comp[q] = id; stack.push(q); } });
      }
      sizes.push(n);
    }
    // Francie má i africké a levantské držby, SSSR ostrovy – tam stačí menší podíl
    for (const tag of ['GER', 'POL', 'ROM', 'YUG', 'CZE', 'HUN', 'TUR', 'SOV', 'FRA']) {
      const o = W.ownerIdx[tag];
      const cnt = {};
      let total = 0;
      for (let p = 1; p <= W.L; p++) if (W.provOwner0[p] === o) { cnt[comp[p]] = (cnt[comp[p]] || 0) + 1; total++; }
      const best = Math.max(...Object.values(cnt));
      expect(best / total, tag).toBeGreaterThan(tag === 'FRA' ? 0.5 : 0.9);
    }
  });
});

describe('svět: geometrie', () => {
  it('oblouky mají platné štítky a body', () => {
    for (const a of arcs) {
      expect(a.pts.length).toBeGreaterThanOrEqual(4);
      expect(a.l).toBeGreaterThanOrEqual(-1);
      expect(a.l).toBeLessThan(W.nLabel);
      expect(a.r).toBeLessThan(W.nLabel);
    }
  });
  it('každá pevninská provincie a moře má okruh a bod popisku uvnitř', () => {
    const labels = [];
    for (let p = 1; p <= W.L; p++) labels.push(p);
    for (let s = 1; s <= W.S; s++) labels.push(W.L + s);
    let bad = 0;
    for (const l of labels) {
      const rs = W.raw.rings[l];
      expect(rs.length, `okruh ${l}`).toBeGreaterThan(0);
      const o = W.isLand(l) ? W.land[l] : W.sea[l - W.L];
      const [x0, y0, x1, y1] = o.b;
      expect(x1).toBeGreaterThan(x0);
      expect(y1).toBeGreaterThan(y0);
      const [cx, cy] = o.c;
      expect(cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1).toBe(true);
      if (!insideLabel(l, cx + 0.5, cy + 0.5)) bad++;
    }
    // vyhlazené hranice mohou u drobných oblastí posunout bod těsně ven – tolerujeme jednotky
    expect(bad).toBeLessThan(15);
  });
  it('ploché okruhy sousedních provincií se kryjí s oblouky (každý oblouk je ve dvou okruzích)', () => {
    const used = new Int32Array(arcs.length);
    for (let l = 0; l < W.raw.rings.length; l++) for (const ring of W.raw.rings[l]) for (const id of ring) used[id < 0 ? ~id : id]++;
    let bad = 0;
    arcs.forEach((a, i) => {
      const expected = (a.l >= 0 ? 1 : 0) + (a.r >= 0 ? 1 : 0);   // -1 = rám mapy
      if (used[i] !== expected) bad++;
    });
    expect(bad).toBe(0);
  });
});

describe('svět: terén a regiony', () => {
  it('rozložení terénu je rozumné', () => {
    const cnt = new Array(7).fill(0);
    for (let p = 1; p <= W.L; p++) cnt[W.terrain[p]]++;
    expect(cnt[0]).toBeGreaterThan(W.L * 0.25);   // roviny
    expect(cnt[3]).toBeGreaterThan(W.L * 0.05);   // hory
    expect(cnt[5]).toBeGreaterThan(W.L * 0.05);   // poušť
    expect(cnt[6]).toBeGreaterThan(30);           // města
    expect(cnt.every((n) => n > 0)).toBe(true);
  });
  it('každá provincie patří do existujícího regionu', () => {
    for (let p = 1; p <= W.L; p++) { expect(W.region[p]).toBeGreaterThanOrEqual(1); expect(W.region[p]).toBeLessThanOrEqual(W.regions.length); }
  });
  it('slavná města jsou tam, kde mají být', () => {
    const find = (n) => { for (let p = 1; p <= W.L; p++) if (W.land[p].n === n) return p; return 0; };
    const berlin = find('Berlín'), paris = find('Paříž'), moscow = find('Moskva');
    expect(W.ownerTag(W.provOwner0[berlin])).toBe('GER');
    expect(W.ownerTag(W.provOwner0[paris])).toBe('FRA');
    expect(W.ownerTag(W.provOwner0[moscow])).toBe('SOV');
    expect(W.vp[berlin]).toBeGreaterThan(30);
    expect(W.terrain[berlin]).toBe(6);
    expect(W.portSea[find('Hamburk')] || W.portSea[find('Kiel')]).toBeGreaterThan(0);
  });
});
