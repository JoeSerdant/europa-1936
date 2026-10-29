// Pohyb divizí po provinciích (hodinový krok). Divize s rozkazem postupuje do první provincie cesty:
//  - je-li v ní nepřítel, otevře/připojí se bitva (postup stojí, dokud trvá),
//  - jinak roste postup `prog`; při 100 % divize vstoupí a případnou nepřátelskou provincii obsadí.
import { getWorld } from '../world.js';
import { C } from './constants.js';
import { geo, adjacency } from './geo.js';
import { TERRAIN_RULES, RIVER } from '../../data/army/terrain.js';
import { atWar } from './war.js';
import { canEnter, stepHours } from './paths.js';
import { atMap, editDiv, relocate, setCtrl, addBattle, editBattle, battleById } from './ctx.js';
import { statsOf, lackOf, modsOf } from './unit.js';

export const MIN_ORG_TO_ATTACK = 0.1;   // podíl maxima organizace, pod který divize nezačíná útok

function clearOrder(ctx, id) {
  const d = editDiv(ctx, id);
  d.path = []; d.prog = 0;
}

/** Rychlost divize při vstupu do provincie `next` (index rychlosti, pěšák 4). */
export function moveSpeed(ctx, d, st, next, kind) {
  const w = getWorld();
  const t = w.terrain[next];
  let mult = 1 + (st.terr[t]?.mov || 0) + (kind === 1 ? st.terr.r?.mov || 0 : 0) + modsOf(ctx, d).speed;
  mult -= C.INFRA_SPEED * (5 - ctx.infra[next]);
  const share = st.org ? d.org / st.org : 1;
  if (share < C.ORG_SPEED_LOW) mult += C.ORG_SPEED_ZERO * (1 - share / C.ORG_SPEED_LOW);
  mult += C.SUP_SPEED * lackOf(d);
  return st.speed * Math.max(0.1, mult);
}

export function startBattleAgainst(ctx, id, target, foes) {
  const d = ctx.divs[id];
  let b = ctx.battles.find((x) => x.p === target);
  if (b) {
    b = editBattle(ctx, b.id);
    if (!b.att.includes(id)) b.att = [...b.att, id];
    if (!b.from.includes(d.p)) b.from = [...b.from, d.p];
  } else {
    b = addBattle(ctx, { p: target, att: [id], dep: foes.slice(), from: [d.p], hrs: 0, fa: [], fd: [], adv: 0.5 });
  }
  const ed = editDiv(ctx, id);
  ed.b = b.id;
  for (const f of foes) if (!ctx.divs[f].b) editDiv(ctx, f).b = b.id;
  return b;
}

export function movementStep(ctx) {
  const w = getWorld(), adj = adjacency(w);
  const mil = ctx.mil;
  for (let id = 1; id < ctx.divs.length; id++) {
    const d0 = ctx.divs[id];
    if (!d0 || d0.path.length === 0 || d0.b !== 0) continue;
    const next = d0.path[0];
    const e = adj[d0.p].find((x) => x.to === next);
    if (!e || e.kind === 2 || !canEnter(mil, d0.o, ctx.ctrl[next])) { clearOrder(ctx, id); continue; }
    const at = atMap(ctx).get(next);
    const foes = at ? at.filter((x) => atWar(mil, d0.o, ctx.divs[x].o)) : [];
    const st = statsOf(mil, d0);
    if (foes.length) {
      if (d0.hold > 0 || d0.rt > 0 || d0.org < st.org * MIN_ORG_TO_ATTACK) continue;   // čeká, až bude moci útočit
      startBattleAgainst(ctx, id, next, foes);
      continue;
    }
    const speed = moveSpeed(ctx, d0, st, next, e.kind);
    const hours = stepHours(w, d0.p, next, e.kind) * (C.SPEED_REF / speed);
    const d = editDiv(ctx, id);
    d.prog += 100 / Math.max(1, hours);
    d.org = Math.max(Math.min(d.org, st.org * C.MIN_ORG_SHARE_MOVING), d.org - C.ORG_MOVE_COST);
    d.dig = 0;
    if (d.prog >= 100) {
      d.prog = Math.min(99, d.prog - 100);
      d.path = d.path.slice(1);
      relocate(ctx, id, next);
      if (atWar(mil, d.o, ctx.ctrl[next])) {
        setCtrl(ctx, next, d.o);
        d.org = Math.max(st.org * C.MIN_ORG_SHARE_MOVING * 0.5, d.org - C.CONQUER_ORG_LOSS * st.org);
      }
      if (d.path.length === 0) d.prog = 0;
    }
  }
}

export { clearOrder };
