// Výcvik nových divizí: položky fronty se po uplynutí doby změní v divizi na zadané provincii.
import { C } from './constants.js';
import { addDiv, bumpVer } from './ctx.js';
import { deriveStats } from './stats.js';
import { nearestControlled } from './war.js';
import { getWorld } from '../world.js';

/** Další pořadové číslo jména divize pro šablonu a zemi. */
export function nextNr(divs, o, tplId) {
  let m = 0;
  for (let i = 1; i < divs.length; i++) { const d = divs[i]; if (d && d.o === o && d.tpl === tplId && d.nr > m) m = d.nr; }
  return m + 1;
}

export function trainingStep(ctx) {
  if (!ctx.queue.length) return;
  const due = ctx.queue.filter((q) => q.done <= ctx.tick);
  if (!due.length) return;
  ctx.queue = ctx.queue.filter((q) => q.done > ctx.tick);
  ctx.changed = true;
  const w = getWorld();
  for (const q of due) {
    const tpl = ctx.mil.tpl[q.tpl];
    if (!tpl) continue;
    let p = q.p;
    if (ctx.ctrl[p] !== q.o) p = nearestControlled(ctx.ctrl, q.o, p) || w.owners[q.o].cap;
    const st = deriveStats(tpl);
    addDiv(ctx, {
      o: q.o, tpl: q.tpl, nr: nextNr(ctx.divs, q.o, q.tpl), p, org: st.org, hp: st.hp, xp: q.xp ?? 0,
      army: 0, path: [], prog: 0, b: 0, rt: 0, dig: 0, sup: 1, sg: C.SUP_GRACE, hold: 0,
    });
  }
  bumpVer(ctx);
}
