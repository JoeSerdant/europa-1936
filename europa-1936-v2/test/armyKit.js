// Pomůcky pro testy armády: prázdné bojiště, přidávání divizí, hledání dvojic provincií podle terénu. (Soubor není test – vitest ho nespouští.)
import { createGame, getWorld, advanceHour, deriveStats, declareWar, supplyFlow, TPL_KINDS } from '../src/engine/index.js';

export const W = getWorld();
export const idx = (tag) => W.ownerIdx[tag];

const adjList = (p) => {
  const out = [];
  W.forLandNeighbors(p, (to, kind) => out.push({ to, kind }));
  return out;
};
export const neighbors = (p) => adjList(p).filter((e) => e.kind !== 2).map((e) => e.to);

/** Hra bez jednotek (zůstanou šablony, sklady a velitelé zemí). */
export function emptyBattlefield(player = null) {
  const s = createGame({ player });
  return { ...s, mil: { ...s.mil, divs: [null], armies: [null], groups: [null], battles: [], wars: [], queue: [] } };
}

/** Přidá divizi druhu `kind` (klíč TPL_KINDS) zemi `tag` do provincie `p`; vrací [stav, id]. */
export function addDivision(s, tag, kind, p, extra = {}) {
  const o = idx(tag);
  let mil = s.mil;
  const def = TPL_KINDS[kind];
  let tplId = mil.tpl.findIndex((t) => t && t.o === o && t.short === def.short);
  if (tplId < 0) {
    tplId = mil.tpl.length;
    mil = { ...mil, tpl: [...mil.tpl, { o, nm: def.nm, short: def.short, reg: def.reg.map((c) => c.slice()), sup: def.sup.slice() }] };
  }
  const st = deriveStats(mil.tpl[tplId]);
  const id = mil.divs.length;
  const div = {
    o, tpl: tplId, nr: id, p, org: st.org, hp: st.hp, xp: 0.3, army: 0, path: [], prog: 0, b: 0, rt: 0, dig: 0, sup: 1, sg: 72, hold: 0, ...extra,
  };
  return [{ ...s, mil: { ...mil, divs: [...mil.divs, div], ver: mil.ver + 1 } }, id];
}

/** Dvojice sousedních provincií (po souši, bez řeky): útočník stojí v `from` (rovina), `to` má terén `terr`. */
export function pairWithTerrain(terr, { river = false } = {}) {
  for (let p = 1; p <= W.L; p++) {
    if (W.terrain[p] !== 0) continue;
    for (const e of adjList(p)) {
      if (e.kind === (river ? 1 : 0) && W.terrain[e.to] === terr && W.provOwner0[p] !== W.provOwner0[e.to]) return { from: p, to: e.to };
    }
  }
  return null;
}

/** Skutečná hranice zemí `a` a `b` (po souši, bez řeky): provincie `from` patří `a` a je dobře zásobená, `to` patří `b`. */
export function realBorder(a, b) {
  const s = createGame();
  const flow = supplyFlow(s.ctrl, idx(a));
  for (let p = 1; p <= W.L; p++) {
    if (W.provOwner0[p] !== idx(a) || flow[p] * 1.25 < 3) continue;
    for (const e of adjList(p)) if (e.kind === 0 && W.provOwner0[e.to] === idx(b)) return { from: p, to: e.to };
  }
  return null;
}

/** Přepíše kontrolu: `from` patří `a`, `to` a jeho okolí (kromě `from`) patří `b` – obránce má kam ustoupit. */
export function giveSides(s, a, b, from, to) {
  const ctrl = s.ctrl.slice();
  ctrl[from] = idx(a);
  ctrl[to] = idx(b);
  for (const q of neighbors(to)) {
    if (q === from) continue;
    ctrl[q] = idx(b);
    for (const r of neighbors(q)) if (r !== from && r !== to) ctrl[r] = idx(b);
  }
  return { ...s, ctrl };
}

/** Jednoduchý souboj: `na` divizí druhu `ka` útočí z `from` na `nd` divizí druhu `kd` v `to`. */
export function duel({ ka = 'pesi', kd = 'pesi', na = 1, nd = 1, terr = 0, dig = 0, xp = 0.3, xpA = xp, xpD = xp, river = false, supA = 1, sgA = 72 } = {}) {
  const pair = pairWithTerrain(terr, { river });
  if (!pair) return null;
  let s = emptyBattlefield();
  s = giveSides(s, 'GER', 'POL', pair.from, pair.to);
  const A = [], D = [];
  for (let i = 0; i < na; i++) { let id; [s, id] = addDivision(s, 'GER', ka, pair.from, { path: [pair.to], xp: xpA, sup: supA, sg: sgA }); A.push(id); }
  for (let i = 0; i < nd; i++) { let id; [s, id] = addDivision(s, 'POL', kd, pair.to, { dig, xp: xpD }); D.push(id); }
  s = { ...s, mil: { ...s.mil, wars: [[Math.min(idx('GER'), idx('POL')), Math.max(idx('GER'), idx('POL'))]] } };
  return { s, A, D, ...pair };
}

/** Pustí hodiny, dokud bitva nezačne a znovu neskončí (nejvýš `max`). Vrací { s, hours, started }. */
export function runUntilBattleEnds(s, max = 24 * 30) {
  let hours = 0, started = false;
  for (; hours < max; hours++) {
    s = advanceHour(s);
    if (s.mil.battles.length) started = true;
    else if (started) { hours++; break; }
  }
  return { s, hours, started };
}

export { declareWar };
