// F3 (pohyb jako v HOI4): odhad doby pochodu – „příjezd za …“ u rozkazů na mapě, v náhledu trasy a v bublině nad žetonem.
// Počítá stejně jako `movementStep` (rychlost divize, terén, počasí, infrastruktura, železnice ve vlastním území), jen bez bitev
// a bez úbytku organizace cestou – je to odhad. Čistá čtení stavu, nic nemění.
import { getWorld } from '../world.js';
import { edgeData, findPath } from './paths.js';
import { openCtx } from './ctx.js';
import { statsOf } from './unit.js';
import { moveSpeed, legHours } from './movement.js';

const isId = (x) => Number.isInteger(x) && x > 0;

/** Hodiny pochodu divize `d` po cestě `path` (z její provincie, s rozpracovaným postupem `prog` 0–100), nebo -1 (cesta nevede po souši). */
function hoursAlong(ctx, d, path, prog) {
  const adj = edgeData(getWorld());
  const st = statsOf(ctx.mil, d);
  let from = d.p, total = 0;
  for (let i = 0; i < path.length; i++) {
    const next = path[i];
    const e = adj[from].find((x) => x.to === next);
    if (!e || e.kind === 2) return -1;
    const speed = moveSpeed(ctx, d, st, next, e.kind);
    const rail = ctx.ctrl[from] === d.o && ctx.ctrl[next] === d.o ? e.rl : 0;
    const hours = Math.max(1, legHours(e, speed, rail, d.rd));
    total += i === 0 ? hours * (1 - Math.min(99, Math.max(0, prog)) / 100) : hours;
    from = next;
  }
  return Math.max(1, Math.ceil(total));
}

/**
 * Pochod divizí `ids` podle jejich rozkazů: { hours (nejpomalejší divize; -1 = nikdo nepochoduje), dest (cíl nejpomalejší), moving, fighting }.
 * Divize v bitvě se do odhadu nepočítají (čekají na výsledek), jen se spočítají ve `fighting`.
 */
export function marchEta(state, ids) {
  const mil = state.mil;
  let ctx = null, hours = -1, dest = 0, moving = 0, fighting = 0;
  for (const id of ids) {
    const d = isId(id) && id < mil.divs.length ? mil.divs[id] : null;
    if (!d || !d.path.length) continue;
    if (d.b) { fighting++; continue; }
    if (!ctx) ctx = openCtx(state);
    const h = hoursAlong(ctx, d, d.path, d.prog);
    if (h < 0) continue;
    moving++;
    if (h > hours) { hours = h; dest = d.path[d.path.length - 1]; }
  }
  return { hours, dest, moving, fighting };
}

const PREVIEW_STARTS = 12;   // náhled hledá cestu nejvýš z tolika různých výchozích provincií (výběr celé fronty)

/**
 * Náhled rozkazu (stejná pravidla jako `orderMove`): kudy by divize `ids` šly do `to` a za jak dlouho.
 * Vrací { routes: [{ nodes: [start, …cíl], ids, hours, prog }], hours (nejpomalejší), attack } nebo null (nikdo by nešel).
 * `append` = rozkaz se Shiftem (další bod trasy za dosavadní cestou).
 */
export function marchPreview(state, ids, to, append = false) {
  const mil = state.mil, w = getWorld();
  if (!isId(to) || !w.isLand(to)) return null;
  const segs = new Map(), groups = new Map();
  let ctx = null, hours = -1, o = 0;
  for (const id of ids) {
    const d = isId(id) && id < mil.divs.length ? mil.divs[id] : null;
    if (!d || d.p === to) continue;
    if (d.b) { const b = mil.battles.find((x) => x.id === d.b); if (b && b.dep.includes(id)) continue; }   // bránící se divize neodejde (jako orderMove)
    const queued = append && d.path.length > 0;
    const from = queued ? d.path[d.path.length - 1] : d.p;
    if (from === to) continue;
    if (!segs.has(from)) {
      if (segs.size >= PREVIEW_STARTS) continue;
      segs.set(from, findPath(mil, state.ctrl, d.o, from, to, { dip: state.dip }));
    }
    const seg = segs.get(from);
    if (!seg) continue;
    const path = queued ? d.path.concat(seg) : seg;
    const prog = queued || d.path[0] === path[0] ? d.prog : 0;
    if (!ctx) ctx = openCtx(state);
    const h = hoursAlong(ctx, d, path, prog);
    if (h < 0) continue;
    o = d.o;
    const key = `${d.p}:${path.join(',')}`;
    let r = groups.get(key);
    if (!r) { r = { nodes: [d.p, ...path], ids: [], hours: 0, prog: 0 }; groups.set(key, r); }
    r.ids.push(id); r.hours = Math.max(r.hours, h); r.prog += prog;
    if (h > hours) hours = h;
  }
  if (!groups.size) return null;
  const routes = [...groups.values()];
  for (const r of routes) r.prog /= r.ids.length;
  return { routes, hours, attack: state.ctrl[to] !== o };
}
