// S5a: konstrukční kanceláře. Najatá kancelář oboru je v úrovních výzbroje země `mil.lv[o].bu = { obor: { id, lv } }` (mění se jen
// při najmutí a postupu na vyšší úroveň, takže mezipaměti statistik se obnoví samy); zkušenosti `ind.bux['o:obor']` rostou denně
// z továren na linkách oboru (`bureauDay`). Násobky čte `multOf` (design/core.js) přes `bureauMult`. Čisté funkce a příkazy.
import { getWorld } from '../world.js';
import { BUREAU, BUREAU_CATS, BUREAUS } from '../../data/design/bureaus.js';

const EQ_CAT = {};
for (const c in BUREAU_CATS) for (const eq of BUREAU_CATS[c].eq) EQ_CAT[eq] = c;
/** Obor kanceláře pro druh výzbroje, nebo ''. */
export const bureauCatOf = (eq) => EQ_CAT[eq] || '';

const cache = new WeakMap();   // lv.bu → Map(obor → součty)
/** Součty účinků kanceláře pro druh `type` z úrovní výzbroje `lv` ({ klíč: příplatek }), nebo null. */
export function bureauMods(lv, type) {
  const c = EQ_CAT[type], b = c && lv && lv.bu && lv.bu[c];
  if (!b || !BUREAUS[b.id]) return null;
  let m = cache.get(lv.bu);
  if (!m) { m = new Map(); cache.set(lv.bu, m); }
  let r = m.get(c);
  if (!r) { r = {}; const per = BUREAUS[b.id].per; for (const k in per) r[k] = per[k] * b.lv; m.set(c, r); }
  return r;
}

/** Proč země `o` nemůže najmout kancelář `id` (český text), nebo null. */
export function bureauBlock(state, o, id) {
  const B = BUREAUS[id];
  if (!B) return 'Neznámá kancelář.';
  const cur = state.mil.lv[o] && state.mil.lv[o].bu && state.mil.lv[o].bu[B.cat];
  if (cur && cur.id === id) return 'Kancelář už pro vás pracuje.';
  if (state.pol.own[o].pp < BUREAU.PP) return `Chybí politická moc (${Math.ceil(BUREAU.PP - state.pol.own[o].pp)}).`;
  return null;
}

/** Najme kancelář `id` (stojí politickou moc; výměna kanceláře v oboru začíná znovu od 1. úrovně a bez zkušeností). */
export function hireBureau(state, o, id) {
  if (bureauBlock(state, o, id)) return state;
  const B = BUREAUS[id], lv = state.mil.lv.slice(), old = lv[o] || {};
  lv[o] = { ...old, bu: { ...(old.bu || {}), [B.cat]: { id, lv: 1 } } };
  const own = state.pol.own.slice(); own[o] = { ...own[o], pp: own[o].pp - BUREAU.PP };
  const bux = { ...(state.ind.bux || {}) }; delete bux[`${o}:${B.cat}`];
  return { ...state, mil: { ...state.mil, lv, ver: state.mil.ver + 1 }, pol: { ...state.pol, own }, ind: { ...state.ind, bux, ver: state.ind.ver + 1 } };
}

/** Zkušenosti potřebné z úrovně `l` na další. */
export const bureauNeed = (l) => BUREAU.XP_LV * l;

/** Denní krok (v `industryDay`): kanceláře sbírají zkušenosti z továren na linkách svého oboru a postupují na vyšší úroveň. */
export function bureauDay(state) {
  const fac = new Map();   // 'o:obor' → továrny
  for (const l of state.ind.lines) { const c = EQ_CAT[l.eq]; if (c && l.fac > 0) { const k = `${l.o}:${c}`; fac.set(k, (fac.get(k) || 0) + l.fac); } }
  let bux = state.ind.bux || {}, lv = state.mil.lv, bo = false, lo = false;
  for (const [k, f] of [...fac].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const [o, c] = k.split(':'), b = lv[+o] && lv[+o].bu && lv[+o].bu[c];
    if (!b || b.lv >= BUREAU.MAX) continue;
    let x = (bux[k] || 0) + f * BUREAU.XP_FAC;
    if (!bo) { bux = { ...bux }; bo = true; }
    if (x >= bureauNeed(b.lv)) {
      x -= bureauNeed(b.lv);
      if (!lo) { lv = lv.slice(); lo = true; }
      lv[+o] = { ...lv[+o], bu: { ...lv[+o].bu, [c]: { ...b, lv: b.lv + 1 } } };
    }
    bux[k] = Math.round(x * 10) / 10;
  }
  if (!bo) return state;
  return { ...state, ind: { ...state.ind, bux }, ...(lo ? { mil: { ...state.mil, lv, ver: state.mil.ver + 1 } } : {}) };
}

/** Přehled kanceláří země `o` pro rozhraní: [{ cat, cur: { id, lv } | null, xp, need }]. */
export function bureausOf(state, o) {
  const bu = (state.mil.lv[o] && state.mil.lv[o].bu) || {}, bux = state.ind.bux || {};
  return Object.keys(BUREAU_CATS).map((cat) => {
    const cur = bu[cat] || null;
    return { cat, cur, xp: bux[`${o}:${cat}`] || 0, need: cur ? bureauNeed(cur.lv) : 0 };
  });
}
void getWorld;
