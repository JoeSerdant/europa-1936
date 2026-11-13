// Společné pomocné funkce pro divize v pracovním kontextu hodiny.
import { deriveStats } from './stats.js';
import { abilityMods } from '../cmd/index.js';
import { armyMods, ZERO_MODS, MOD_KEYS } from './leaders.js';
import { docMods } from '../doc/core.js';
import { spiritArmyMods, NO_SPIRIT_MODS } from '../nat/spirits.js';

/** Odvozené statistiky šablony divize. */
/** Statistiky šablony včetně úrovně výzbroje jejího vlastníka (M20). */
export const tplStats = (mil, tplId) => { const t = mil.tpl[tplId]; return deriveStats(t, mil.lv ? mil.lv[t.o] : null); };
export const statsOf = (mil, d) => tplStats(mil, d.tpl);

/** Postih zásobování 0–1 (po vyčerpání zásoby v batohu). */
export const lackOf = (d) => (d.sg > 0 ? 0 : 1 - d.sup);

/** Bonusy velitele armády divize (v kontextu hodiny podle upravených polí). */
const mergeCache = new WeakMap();   // bonusy velitele → Map(doktrinální bonusy → součet)
export function modsOf(ctx, d) {
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
  const sp = o && ctx.state.nat ? spiritArmyMods(ctx.state.nat.own[o] && ctx.state.nat.own[o].sp) : NO_SPIRIT_MODS;   // M88: vojenské bonusy národních duchů
  if (sp === NO_SPIRIT_MODS) return r;
  let m = spiritCache.get(r);
  if (!m) { m = new Map(); spiritCache.set(r, m); }
  let q = m.get(sp);
  if (!q) { q = { ...r }; for (const k of MOD_KEYS) q[k] = (r[k] || 0) + (sp[k] || 0); m.set(sp, q); }
  return q;
}
