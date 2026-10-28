// Armádní systém jedné herní hodiny: pevné pořadí kroků (viz SPEC § 4a).
import { openCtx, closeCtx } from './ctx.js';
import { dailyStep } from './daily.js';
import { trainingStep } from './training.js';
import { movementStep } from './movement.js';
import { combatStep } from './combat.js';
import { upkeepStep } from './upkeep.js';

export function armyHour(state) {
  const ctx = openCtx(state);
  if (ctx.tick % 24 === 0) dailyStep(ctx);
  trainingStep(ctx);
  movementStep(ctx);
  combatStep(ctx);
  upkeepStep(ctx);
  return closeCtx(ctx);
}
