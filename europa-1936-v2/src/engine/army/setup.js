// Počáteční armády všech zemí (leden 1936): šablony, rozmístění divizí, armády a skupiny armád, velitelé, sklady a lidská síla.
// Deterministické: náhodu bere z předaného stavu rng a vrací nový. Svět se do výsledku nekopíruje – drží se jen čísla provincií.
import { getWorld } from '../world.js';
import { nextRandom } from '../rng.js';
import { geo } from './geo.js';
import { supplyFlow } from './supply.js';
import { deriveStats, divisionName } from './stats.js';
import { C } from './constants.js';
import { NATIONAL, TPL_KINDS, NAMES, TRAIT_IDS, EQUIP_IDS, EQUIP } from '../../data/army/index.js';
import { COUNTRIES } from '../../data/countries.js';

export const emptyMil = (nOwners) => ({
  ver: 0, bn: 0, qn: 0, wars: [],
  tpl: [null], divs: [null], armies: [null], groups: [null], gens: [null],
  battles: [], queue: [],
  stock: Array.from({ length: nOwners }, () => null),
  man: new Array(nOwners).fill(0),
  cas: new Array(nOwners).fill(0),
  lv: new Array(nOwners).fill(null),   // úrovně výzbroje zemí (M20): { výzbroj: úroveň }, chybí = 1
});

/** Výběr k položek bez opakování s váhami (metoda exponenciálních klíčů – deterministická pro daný generátor). */
export function pickWeighted(weights, k, rnd) {
  const keys = weights.map((wt, i) => ({ i, key: wt > 0 ? -Math.log(1 - rnd() * 0.999999) / wt : Infinity }));
  keys.sort((a, b) => a.key - b.key || a.i - b.i);
  return keys.slice(0, k).map((x) => x.i);
}

/** Jednoduché k-means (Lloyd, počáteční středy podle nejvzdálenějšího bodu); vrací pole shluků s indexy bodů. */
export function cluster(points, k) {
  const n = points.length;
  if (k <= 1 || n <= k) return k <= 1 ? [points.map((_, i) => i)] : points.map((_, i) => [i]);
  const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  let first = 0;
  for (let i = 1; i < n; i++) if (points[i].x < points[first].x) first = i;
  const centers = [{ x: points[first].x, y: points[first].y }];
  while (centers.length < k) {
    let best = -1, bd = -1;
    for (let i = 0; i < n; i++) {
      let d = Infinity;
      for (const c of centers) d = Math.min(d, dist2(points[i], c));
      if (d > bd) { bd = d; best = i; }
    }
    centers.push({ x: points[best].x, y: points[best].y });
  }
  let assign = new Array(n).fill(0);
  for (let it = 0; it < 8; it++) {
    for (let i = 0; i < n; i++) {
      let b = 0, bd = Infinity;
      for (let c = 0; c < k; c++) { const d = dist2(points[i], centers[c]); if (d < bd) { bd = d; b = c; } }
      assign[i] = b;
    }
    const sum = centers.map(() => ({ x: 0, y: 0, n: 0 }));
    for (let i = 0; i < n; i++) { const s = sum[assign[i]]; s.x += points[i].x; s.y += points[i].y; s.n++; }
    sum.forEach((s, c) => { if (s.n) { centers[c].x = s.x / s.n; centers[c].y = s.y / s.n; } });
  }
  const out = Array.from({ length: k }, () => []);
  assign.forEach((c, i) => out[c].push(i));
  return out.filter((c) => c.length).sort((a, b) => {
    const ax = a.reduce((s, i) => s + points[i].x, 0) / a.length, bx = b.reduce((s, i) => s + points[i].x, 0) / b.length;
    return ax - bx;
  });
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function makeGeneral(o, rank, tier, cult, rnd, usedNames) {
  const pool = NAMES[cult] || NAMES.de;
  let nm = '';
  for (let tries = 0; tries < 12; tries++) {
    nm = `${pool.first[Math.floor(rnd() * pool.first.length)]} ${pool.last[Math.floor(rnd() * pool.last.length)]}`;
    if (!usedNames.has(nm)) break;
  }
  usedNames.add(nm);
  const base = tier === 1 ? 3 : tier === 2 ? 2.4 : 2;
  const sk = () => clamp(Math.round(base + (rnd() * 2 - 1) * 1.2 + (rank === 'M' ? 0.8 : 0)), 1, C.LEADER_MAX_SKILL);
  const tr = [];
  if (rnd() < 0.5) tr.push(TRAIT_IDS[Math.floor(rnd() * TRAIT_IDS.length)]);
  if (tr.length && rnd() < 0.3) { const t = TRAIT_IDS[Math.floor(rnd() * TRAIT_IDS.length)]; if (!tr.includes(t)) tr.push(t); }
  let h = o * 2654435761;   // manévr (M54) z hashe jména: nespotřebuje náhodu, takže se nemění ostatní velitelé
  for (let i = 0; i < nm.length; i++) h = Math.imul(h ^ nm.charCodeAt(i), 16777619);
  const mn = clamp(Math.round(base + (((h >>> 0) % 1000) / 1000 * 2 - 1) * 1.2 + (rank === 'M' ? 0.8 : 0)), 1, C.LEADER_MAX_SKILL);
  return { o, nm, r: rank, a: sk(), d: sk(), pl: sk(), lg: sk(), mn, tr, xp: 0 };
}

/**
 * Vytvoří počáteční stav armády všech zemí.
 * @returns {{ mil: object, rng: number }}
 */
export function createMil(w = getWorld(), rngState = 1936) {
  let rs = rngState;
  const rnd = () => { const [x, n] = nextRandom(rs); rs = n; return x; };
  const g = geo(w);
  const mil = emptyMil(w.owners.length);

  // provincie podle vlastníka a váha pro posádky
  const owned = Array.from({ length: w.owners.length }, () => []);
  for (let p = 1; p <= w.L; p++) owned[w.provOwner0[p]].push(p);

  for (let o = 1; o < w.owners.length; o++) {
    const ow = w.owners[o];
    const nat = NATIONAL[ow.tag];
    const provs = owned[o];
    // lidská síla: podíl obyvatel
    let popK = 0;
    for (const p of provs) popK += w.pop[p];
    mil.man[o] = Math.round(popK * 1000 * (nat ? nat.man : 0.01));
    mil.stock[o] = {};
    for (const e of EQUIP_IDS) mil.stock[o][e] = 0;
    if (!nat) continue;

    const tier = COUNTRIES[ow.tag]?.tier ?? 3;
    const used = new Set();

    // ---- šablony země (kopie výchozích druhů, které sestava používá) ----
    const tplOf = {};
    const kinds = Object.keys(nat.divs).filter((k) => nat.divs[k] > 0);
    for (const kind of kinds) {
      const k = TPL_KINDS[kind];
      const id = mil.tpl.length;
      mil.tpl.push({ o, nm: k.nm, short: k.short, reg: k.reg.map((c) => c.slice()), sup: k.sup.slice() });
      tplOf[kind] = id;
    }
    const N = kinds.reduce((s, k) => s + nat.divs[k], 0);
    if (N === 0) continue;

    // ---- kam které divize ----
    const reach = supplyFlow(w.provOwner0, o);   // posádky nestavíme tam, kde by divize neměla zásoby
    const weights = provs.map((p) => {
      let border = 0;
      w.forLandNeighbors(p, (q, kind) => { if (kind !== 2 && w.provOwner0[q] !== o) border++; });
      let sc = 1 + w.vp[p] * 1.2 + border * 3 + (g.hub[p] ? 6 : 0) + (w.portLevel[p] ? 2 : 0);
      if (p === ow.cap) sc += 60;
      return sc;
    });
    // jen provincie, kde divize dostane zásoby (nemá-li země žádnou takovou, zůstanou původní váhy)
    const supplied = weights.map((x, i) => (reach[provs[i]] * C.SUP_CAPACITY >= 1 ? x : 0));
    if (supplied.some((x) => x > 0)) for (let i = 0; i < weights.length; i++) weights[i] = supplied[i];
    const chosen = [];
    let remaining = N;
    const capIdx = provs.indexOf(ow.cap);
    if (N >= 2 && capIdx >= 0) { chosen.push(ow.cap); remaining--; }
    const w2 = weights.slice();
    if (capIdx >= 0 && chosen.length) w2[capIdx] = 0;
    while (remaining > 0) {
      const live = w2.filter((x) => x > 0).length;
      const take = Math.min(remaining, live);
      if (take === 0) {
        // víc divizí než provincií: začneme znovu s původními váhami
        for (let i = 0; i < w2.length; i++) w2[i] = weights[i];
        continue;
      }
      for (const i of pickWeighted(w2, take, rnd)) { chosen.push(provs[i]); w2[i] = 0; }
      remaining -= take;
    }
    // chosen: kapitál první, zbytek pořadí výběru → přiřadit druhy
    const wanted = [];
    for (const kind of kinds) for (let i = 0; i < nat.divs[kind]; i++) wanted.push(kind);
    const suit = {
      hory: (p) => (w.terrain[p] === 3 ? 4 : w.terrain[p] === 2 ? 2 : 0) + (w.terrain[p] === 1 ? 0.3 : 0),
      tank: (p) => (g.hub[p] ? 4 : 0) + (w.terrain[p] === 0 ? 2 : 0) + w.vp[p] * 0.2,
      motor: (p) => (g.hub[p] ? 3 : 0) + (w.terrain[p] === 0 ? 1 : 0) + w.vp[p] * 0.1,
      kav: (p) => (w.terrain[p] === 0 || w.terrain[p] === 5 ? 3 : 0) + (g.railMax[p] ? 0 : 1),
    };
    const slots = chosen.slice();
    const kindAt = new Array(slots.length).fill(null);
    for (const kind of ['hory', 'tank', 'motor', 'kav']) {
      const f = suit[kind];
      for (let n = 0; n < (nat.divs[kind] || 0); n++) {
        let best = -1, bs = -Infinity;
        for (let i = 0; i < slots.length; i++) { if (kindAt[i]) continue; const s = f(slots[i]) + rnd() * 0.01; if (s > bs) { bs = s; best = i; } }
        if (best >= 0) kindAt[best] = kind;
      }
    }
    const restKinds = wanted.filter((k) => !['hory', 'tank', 'motor', 'kav'].includes(k));
    let ri = 0;
    for (let i = 0; i < slots.length; i++) if (!kindAt[i]) kindAt[i] = restKinds[ri++] || 'pesi';

    // ---- divize ----
    const counters = {};
    const divIds = [];
    for (let i = 0; i < slots.length; i++) {
      const kind = kindAt[i];
      const tpl = mil.tpl[tplOf[kind]];
      const st = deriveStats(tpl);
      counters[kind] = (counters[kind] || 0) + 1;
      const id = mil.divs.length;
      mil.divs.push({
        o, tpl: tplOf[kind], nr: counters[kind], p: slots[i], org: st.org, hp: st.hp, xp: clamp(nat.xp + (rnd() - 0.5) * 0.08, 0, 1),
        army: 0, path: [], prog: 0, b: 0, rt: 0, dig: 0, sup: 1, sg: C.SUP_GRACE, hold: 0,
      });
      divIds.push(id);
    }

    // ---- sklady: potřeba nasazených divizí × záloha ----
    const need = {};
    for (const id of divIds) {
      const st = deriveStats(mil.tpl[mil.divs[id].tpl]);
      for (const e in st.need) need[e] = (need[e] || 0) + st.need[e];
    }
    for (const e of EQUIP_IDS) if (!EQUIP[e].unlock) mil.stock[o][e] = Math.ceil((need[e] || 0) * nat.res);
    const reserve = { pusky: 1, dela: 0.02, pdela: 0.02, auta: 0.25, vozy: 0.03, ltanky: 0.08, podpora: 0.1 };
    const rb = tier === 1 ? 900 : tier === 2 ? 450 : 150;
    for (const e in reserve) if (!EQUIP[e].unlock) mil.stock[o][e] = Math.max(mil.stock[o][e], Math.ceil(rb * reserve[e]));

    // ---- armády a skupiny armád ----
    const usedNames = new Set();
    if (N >= 3) {
      const pts = divIds.map((id) => ({ x: g.cx[mil.divs[id].p], y: g.cy[mil.divs[id].p] }));
      let k = Math.max(1, Math.ceil(N / 10));
      let cl = cluster(pts, k);
      while (cl.some((c) => c.length > 16) && k < N) { k++; cl = cluster(pts, k); }
      const armyIds = [];
      cl.forEach((members, ci) => {
        const aid = mil.armies.length;
        const gen = makeGeneral(o, 'G', tier, nat.cult, rnd, usedNames);
        const gid = mil.gens.length;
        mil.gens.push(gen);
        mil.armies.push({ o, nm: `${ci + 1}. armáda`, grp: 0, cmd: gid, plan: null, pl: 0 });
        for (const i of members) mil.divs[divIds[i]].army = aid;
        armyIds.push(aid);
      });
      if (armyIds.length >= 3) {
        const apts = armyIds.map((aid) => {
          const ms = divIds.filter((id) => mil.divs[id].army === aid);
          return { x: ms.reduce((s, id) => s + g.cx[mil.divs[id].p], 0) / ms.length, y: ms.reduce((s, id) => s + g.cy[mil.divs[id].p], 0) / ms.length };
        });
        let gk = Math.max(1, Math.ceil(armyIds.length / 4));
        let gcl = cluster(apts, gk);
        while (gcl.some((c) => c.length > C.GROUP_CAP) && gk < armyIds.length) { gk++; gcl = cluster(apts, gk); }
        // pojmenování podle polohy: severně → jižně
        const order = gcl.map((members, gi) => ({ gi, y: members.reduce((s, i) => s + apts[i].y, 0) / members.length }));
        order.sort((a, b) => a.y - b.y);
        const labels = order.length === 1 ? ['Skupina armád'] : order.length === 2 ? ['Skupina armád Sever', 'Skupina armád Jih']
          : order.length === 3 ? ['Skupina armád Sever', 'Skupina armád Střed', 'Skupina armád Jih'] : order.map((_, i) => `${i + 1}. skupina armád`);
        gcl.forEach((members, gi) => {
          const gid = mil.groups.length;
          const fm = makeGeneral(o, 'M', tier, nat.cult, rnd, usedNames);
          const fid = mil.gens.length;
          mil.gens.push(fm);
          mil.groups.push({ o, nm: labels[order.findIndex((x) => x.gi === gi)], cmd: fid });
          for (const i of members) mil.armies[armyIds[i]].grp = gid;
        });
      }
    }
    // zásoba velitelů navíc
    for (let i = 0; i < nat.pool; i++) mil.gens.push(makeGeneral(o, i === 0 && tier === 1 ? 'M' : 'G', tier, nat.cult, rnd, usedNames));
  }
  return { mil, rng: rs };
}
