// Armádní systém jedné herní hodiny: pevné pořadí kroků (viz SPEC § 4a).
import { openCtx, closeCtx } from './ctx.js';
import { dailySteps } from './daily.js';
import { trainingStep } from './training.js';
import { movementStep } from './movement.js';
import { combatStep } from './combat.js';
import { upkeepStep } from './upkeep.js';

/** Armádní hodina jako generátor (F2): o půlnoci dává přestávky v denním kroku; vrací nový stav. */
export function* armyHourSteps(state) {
  const ctx = openCtx(state);
  if (ctx.tick % 24 === 0) yield* dailySteps(ctx);
  trainingStep(ctx);
  movementStep(ctx);
  combatStep(ctx);
  upkeepStep(ctx);
  return closeCtx(ctx);
}

export function armyHour(state) {
  const g = armyHourSteps(state);
  let r = g.next();
  while (!r.done) r = g.next();
  return r.value;
}
