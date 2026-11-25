// Rozhodnutí (M35): příkaz `takeDecision` a přehled `decisionsOf`. Podmínky jsou data (data/nat/decisions.js), účinky provádí `applyFx`.
import { getWorld } from '../world.js';
import { DECISIONS, DECISION_BY_ID, DECISION_CATS } from '../../data/nat/decisions.js';
import { ideologyOf } from '../politics/parties.js';
import { hasWar, atWar } from '../army/war.js';
import { applyFx } from './effects.js';
import { FOCUS_TREES, FOCUS_BY_ID } from '../../data/nat/focuses.js';
import { dateOfHour } from '../time.js';

/** W6: id cíle v podmínce – '*_px_cmd' = cíl ve stromu vlastní země (vydané a nové země mají výchozí strom s prefixem `def`). */
export function focusIdFor(tag, id) {
  if (!id.startsWith('*')) return id;
  return (FOCUS_TREES[tag] ? tag.toLowerCase() : 'def') + id.slice(1);
}
import { fxLinesOf } from '../../data/nat/describe.js';

const inRange = (v, r) => v >= r[0] - 1e-9 && v <= r[1] + 1e-9;

/** Proč nejde rozhodnutí `id` použít (český text), nebo null. */
export function decisionBlock(state, o, id) {
  const d = DECISION_BY_ID[id], w = getWorld();
  if (!d || !Number.isInteger(o) || o < 1 || o >= w.owners.length || state.dip.cap[o]) return 'Rozhodnutí nelze použít.';
  const tag = w.owners[o].tag, c = d.when || {};
  if (c.tag && !c.tag.includes(tag)) return 'Pro tuto zemi není.';
  if (c.notTag && c.notTag.includes(tag)) return 'Pro tuto zemi není.';
  if (c.ideo && !c.ideo.includes(ideologyOf(state, o))) return 'Neodpovídá ideologii vlády.';
  if (c.year && dateOfHour(state.tick).year < c.year) return `Až od roku ${c.year}.`;
  for (const f of c.focus || []) {
    const id = focusIdFor(tag, f);
    if (!state.nat.own[o].done[id]) return `Vyžaduje národní cíl „${FOCUS_BY_ID[id] ? FOCUS_BY_ID[id].n : id}“.`;
  }
  if (c.atWar && !c.atWar.some((t) => w.ownerIdx[t] && atWar(state.mil, o, w.ownerIdx[t]))) return `Jen ve válce se zemí ${c.atWar.map((t) => w.owners[w.ownerIdx[t]]?.name || t).join(' nebo ')}.`;
  if (c.owns) for (const n of c.owns) { const sid = w.states.findIndex((x) => x && x.n === n); if (sid < 1 || state.stateOwner[sid] !== o) return `Vyžaduje stát ${n}.`; }
  if (c.faction && !state.dip.fac[o]) return 'Jen pro člena bloku.';
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
  return DECISIONS.filter((d) => (!d.when.tag || d.when.tag.includes(tag)) && !(d.when.notTag && d.when.notTag.includes(tag))).map((d) => {
    const ready = state.nat.own[o].dec[d.id] || 0;
    const once = d.cd >= 99999 && ready > state.tick;   // jednorázová, už použitá
    return { ...d, cat: d.cat, catName: DECISION_CATS[d.cat], block: decisionBlock(state, o, d.id), left: Math.max(0, Math.ceil((ready - state.tick) / 24)), used: once, lines: fxLinesOf(d.fx) };
  });
}
