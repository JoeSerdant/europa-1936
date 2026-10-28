// Společné pomocné funkce pro divize v pracovním kontextu hodiny.
import { deriveStats } from './stats.js';
import { armyMods, ZERO_MODS } from './leaders.js';

/** Odvozené statistiky šablony divize. */
export const statsOf = (mil, d) => deriveStats(mil.tpl[d.tpl]);

/** Postih zásobování 0–1 (po vyčerpání zásoby v batohu). */
export const lackOf = (d) => (d.sg > 0 ? 0 : 1 - d.sup);

/** Bonusy velitele armády divize (v kontextu hodiny podle upravených polí). */
export function modsOf(ctx, d) {
  if (!d.army) return ZERO_MODS;
  return armyMods(ctx.gens, ctx.mil.groups, ctx.armies[d.army]);
}
