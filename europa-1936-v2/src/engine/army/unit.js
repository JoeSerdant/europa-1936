// Společné pomocné funkce pro divize v pracovním kontextu hodiny.
import { deriveStats } from './stats.js';
import { abilityMods } from '../cmd/index.js';
import { armyMods, ZERO_MODS, MOD_KEYS } from './leaders.js';
import { docMods } from '../doc/core.js';
import { spiritArmyMods, NO_SPIRIT_MODS } from '../nat/spirits.js';
import { techArmyMods, NO_TECH_ARMY } from '../research/core.js';

const extraCache = new WeakMap();   // bonusy duchů → Map(bonusy technologií → součet)
/** Vojenské bonusy duchů a technologií země dohromady (M96). */
function extraMods(state, o) {
  const sp = state.nat ? spiritArmyMods(state.nat.own[o] && state.nat.own[o].sp) : NO_SPIRIT_MODS;
  const tm = state.tech ? techArmyMods(state.tech.own[o] && state.tech.own[o].done) : NO_TECH_ARMY;
  if (tm === NO_TECH_ARMY) return sp;
  if (sp === NO_SPIRIT_MODS) return tm;
  let m = extraCache.get(sp);
  if (!m) { m = new Map(); extraCache.set(sp, m); }
  let r = m.get(tm);
  if (!r) { r = { ...sp }; for (const k in tm) r[k] = (r[k] || 0) + tm[k]; m.set(tm, r); }
  return r;
}

/** Odvozené statistiky šablony divize. */
/** Statistiky šablony včetně úrovně výzbroje jejího vlastníka (M20). */
export const tplStats = (mil, tplId) => { const t = mil.tpl[tplId]; return deriveStats(t, mil.lv ? mil.lv[t.o] : null); };
export const statsOf = (mil, d) => tplStats(mil, d.tpl);

/** Postih zásobování 0–1 (po vyčerpání zásoby v batohu). */
export const lackOf = (d) => (d.sg > 0 ? 0 : 1 - d.sup);

/**
 * Bonusy velitele armády divize (v kontextu hodiny podle upravených polí). F2 (výkon): výsledek se v kontextu pamatuje podle armády a země
 * (`ctx.modsMemo`); paměť maže `editArmy` a `editGen`, protože bonusy závisí jen na armádě, velitelích a stavu mimo armádu (doktríny, duchové, technologie).
 */
export function modsOf(ctx, d) {
  const army = d.army || 0;
  const o = d.o ?? (army && ctx.armies[army] ? ctx.armies[army].o : 0);
  const key = army * 4096 + o;
  const memo = ctx.modsMemo || (ctx.modsMemo = new Map());
  let r = memo.get(key);
  if (r === undefined) { r = computeMods(ctx, d); memo.set(key, r); }
  return r;
}
const mergeCache = new WeakMap();   // bonusy velitele → Map(doktrinální bonusy → součet)
function computeMods(ctx, d) {
  const base = baseMods(ctx, d);
  const ab = ctx.state.cmd && d.army ? abilityMods(ctx.state, d.army) : null;   // M53: schopnost armády
  if (!ab) return base;
  const r = { ...base };
  for (const k in ab) r[k] = (r[k] || 0) + ab[k];
  return r;
}
const spiritCache = new WeakMap();   // bonusy velitele a doktrín → Map(bonusy duchů → součet)
function baseMods(ctx, d) {
  const army = d.army ? ctx.armies[d.army] : null;
  const o = d.o ?? (army ? army.o : 0);   // dotaz za armádu (`{ army }`) nese jen její id
  const lead = army ? armyMods(ctx.gens, ctx.mil.groups, army) : ZERO_MODS;
  const doc = ctx.state.doc && o ? docMods(ctx.state, o) : null;
  let r = lead;
  if (doc && doc.land) {
    let m = mergeCache.get(lead);
    if (!m) { m = new Map(); mergeCache.set(lead, m); }
    r = m.get(doc);
    if (!r) { r = { ...lead }; for (const k of MOD_KEYS) r[k] = (lead[k] || 0) + (doc[k] || 0); m.set(doc, r); }
  }
  const sp = o ? extraMods(ctx.state, o) : NO_SPIRIT_MODS;   // M88: vojenské bonusy národních duchů; M96: a technologií
  if (sp === NO_SPIRIT_MODS || sp === NO_TECH_ARMY) return r;
  let m = spiritCache.get(r);
  if (!m) { m = new Map(); spiritCache.set(r, m); }
  let q = m.get(sp);
  if (!q) { q = { ...r }; for (const k of MOD_KEYS) q[k] = (r[k] || 0) + (sp[k] || 0); m.set(sp, q); }
  return q;
}
