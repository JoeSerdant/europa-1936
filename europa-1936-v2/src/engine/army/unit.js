// Společné pomocné funkce pro divize v pracovním kontextu hodiny.
import { deriveStats } from './stats.js';
import { armyMods, ZERO_MODS } from './leaders.js';

/** Odvozené statistiky šablony divize. */
/** Statistiky šablony včetně úrovně výzbroje jejího vlastníka (M20). */
export const tplStats = (mil, tplId) => { const t = mil.tpl[tplId]; return deriveStats(t, mil.lv ? mil.lv[t.o] : null); };
export const statsOf = (mil, d) => tplStats(mil, d.tpl);

/** Postih zásobování 0–1 (po vyčerpání zásoby v batohu). */
export const lackOf = (d) => (d.sg > 0 ? 0 : 1 - d.sup);

/** Bonusy velitele armády divize (v kontextu hodiny podle upravených polí). */
export function modsOf(ctx, d) {
  if (!d.army) return ZERO_MODS;
  return armyMods(ctx.gens, ctx.mil.groups, ctx.armies[d.army]);
}
