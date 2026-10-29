// Rozhodnutí (M35): příkaz `takeDecision` a přehled `decisionsOf`. Podmínky jsou data (data/nat/decisions.js), účinky provádí `applyFx`.
import { getWorld } from '../world.js';
import { DECISIONS, DECISION_BY_ID, DECISION_CATS } from '../../data/nat/decisions.js';
import { COUNTRIES } from '../../data/countries.js';
import { hasWar } from '../army/war.js';
import { applyFx } from './effects.js';
import { fxLinesOf } from '../../data/nat/describe.js';

const inRange = (v, r) => v >= r[0] - 1e-9 && v <= r[1] + 1e-9;

/** Proč nejde rozhodnutí `id` použít (český text), nebo null. */
export function decisionBlock(state, o, id) {
  const d = DECISION_BY_ID[id], w = getWorld();
  if (!d || !Number.isInteger(o) || o < 1 || o >= w.owners.length || state.dip.cap[o]) return 'Rozhodnutí nelze použít.';
  const tag = w.owners[o].tag, c = d.when || {};
  if (c.tag && !c.tag.includes(tag)) return 'Pro tuto zemi není.';
  if (c.ideo && !c.ideo.includes(COUNTRIES[tag]?.ideology)) return 'Neodpovídá ideologii vlády.';
  const war = hasWar(state.mil, o);
  if (c.war === true && !war) return 'Jen za války.';
  if (c.war === false && war) return 'Jen v míru.';
  const p = state.pol.own[o];
  if (c.stab && !inRange(p.stab, c.stab)) return c.stab[0] > 0 ? 'Stabilita je příliš nízká.' : 'Stabilita je příliš vysoká.';
  if (c.ws && !inRange(p.ws, c.ws)) return 'Podpora války nevyhovuje.';
  const ready = state.nat.own[o].dec[id] || 0;
  if (ready > state.tick) return `Dostupné za ${Math.ceil((ready - state.tick) / 24)} dní.`;
  if (p.pp < d.cost) return `Chybí politická moc (${Math.ceil(d.cost - p.pp)}).`;
  return null;
}

/** Použije rozhodnutí: zaplatí politickou moc, provede účinky a spustí obnovovací dobu. */
export function takeDecision(state, o, id) {
  if (decisionBlock(state, o, id)) return state;
  const d = DECISION_BY_ID[id];
  const pol = state.pol.own.slice();
  pol[o] = { ...pol[o], pp: pol[o].pp - d.cost };
  let s = { ...state, pol: { ...state.pol, own: pol } };
  s = applyFx(s, o, d.fx);
  const own = s.nat.own.slice();
  own[o] = { ...own[o], dec: { ...own[o].dec, [id]: s.tick + d.cd * 24 } };
  return { ...s, nat: { ...s.nat, ver: s.nat.ver + 1, own } };
}

/** Rozhodnutí použitelná zemí (její státní i obecná), po kategoriích: [{ ...d, block, left, lines }]. */
export function decisionsOf(state, o) {
  o = typeof o === 'string' ? getWorld().ownerIdx[o] : o;
  const tag = getWorld().owners[o].tag;
  return DECISIONS.filter((d) => !d.when.tag || d.when.tag.includes(tag)).map((d) => {
    const ready = state.nat.own[o].dec[d.id] || 0;
    const once = d.cd >= 99999 && ready > state.tick;   // jednorázová, už použitá
    return { ...d, cat: d.cat, catName: DECISION_CATS[d.cat], block: decisionBlock(state, o, d.id), left: Math.max(0, Math.ceil((ready - state.tick) / 24)), used: once, lines: fxLinesOf(d.fx) };
  });
}
