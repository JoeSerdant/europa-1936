// Společné pomocné funkce pro divize v pracovním kontextu hodiny.
import { deriveStats } from './stats.js';
import { armyMods, ZERO_MODS, MOD_KEYS } from './leaders.js';
import { docMods } from '../doc/core.js';

/** Odvozené statistiky šablony divize. */
/** Statistiky šablony včetně úrovně výzbroje jejího vlastníka (M20). */
export const tplStats = (mil, tplId) => { const t = mil.tpl[tplId]; return deriveStats(t, mil.lv ? mil.lv[t.o] : null); };
export const statsOf = (mil, d) => tplStats(mil, d.tpl);

/** Postih zásobování 0–1 (po vyčerpání zásoby v batohu). */
export const lackOf = (d) => (d.sg > 0 ? 0 : 1 - d.sup);

/** Bonusy velitele armády divize (v kontextu hodiny podle upravených polí). */
const mergeCache = new WeakMap();   // bonusy velitele → Map(doktrinální bonusy → součet)
export function modsOf(ctx, d) {
  const lead = d.army ? armyMods(ctx.gens, ctx.mil.groups, ctx.armies[d.army]) : ZERO_MODS;
  const doc = ctx.state.doc ? docMods(ctx.state, d.o) : null;
  if (!doc || !doc.land) return lead;
  let m = mergeCache.get(lead);
  if (!m) { m = new Map(); mergeCache.set(lead, m); }
  let r = m.get(doc);
  if (!r) { r = { ...lead }; for (const k of MOD_KEYS) r[k] = (lead[k] || 0) + (doc[k] || 0); m.set(doc, r); }
  return r;
}
