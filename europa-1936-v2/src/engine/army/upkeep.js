// Hodinová údržba divizí: časovače ústupu a výdrže, obnova organizace, ztráty bez zásobování.
import { C } from './constants.js';
import { TERRAIN_RULES } from '../../data/army/terrain.js';
import { getWorld } from '../world.js';
import { editDiv, removeDiv, addCas } from './ctx.js';
import { statsOf, lackOf, modsOf } from './unit.js';

export function upkeepStep(ctx) {
  const w = getWorld();
  const mil = ctx.mil;
  for (let id = 1; id < ctx.divs.length; id++) {
    const d = ctx.divs[id];
    if (!d) continue;
    const st = statsOf(mil, d);
    const lack = lackOf(d);
    const fighting = d.b !== 0;
    const moving = d.path.length > 0 && d.prog > 0 && !fighting;
    const cap = st.org * (1 - (1 - C.SUP_ORG_CAP) * lack);
    let org = d.org;
    if (!fighting && !moving) {
      const share = st.org ? org / st.org : 1;
      let f = share >= C.ORG_REGEN_SLOW_AT ? C.ORG_REGEN_SLOW : share <= C.ORG_REGEN_FAST_AT ? C.ORG_REGEN_FAST : 1;
      f *= 1 + modsOf(ctx, d).orgRegen;
      f *= 1 - C.ORG_INFRA * (1 - ctx.infra[d.p] / 5);
      if (org < cap) org = Math.min(cap, org + st.org * C.ORG_REGEN * f);
    }
    if (org > cap) org = Math.max(cap, org - st.org * 0.02);
    const attr = lack > 0 ? C.SUP_ATTRITION * st.hp * lack * (1 + 10 * TERRAIN_RULES[w.terrain[d.p]].attr) : 0;
    const needsEdit = org !== d.org || d.rt > 0 || d.hold > 0 || attr > 0;
    if (!needsEdit) continue;
    if (attr > 0 && d.hp - attr <= st.hp * C.DEATH_HP) {
      addCas(ctx, d.o, st.men * C.EQUIP_LOSS);
      removeDiv(ctx, id);
      continue;
    }
    const e = editDiv(ctx, id);
    e.org = org;
    if (e.rt > 0) e.rt--;
    if (e.hold > 0) e.hold--;
    if (attr > 0) e.hp -= attr;
  }
}
