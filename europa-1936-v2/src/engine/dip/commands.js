// Příkazy diplomacie (M23): čisté funkce `(state, …) → state`; neplatný vstup vrací tentýž objekt. Země jsou indexy.
// Příkazy nehlídají, komu věc patří vůči hráči – to dělá `ui/actions.js`.
import { getWorld } from '../world.js';
import { COUNTRIES } from '../../data/countries.js';
import { declareWar, makePeace, cleanName } from '../army/commands.js';
import { atWar, enemiesOf } from '../army/war.js';
import { DIP } from './constants.js';
import { WARGOALS } from '../../data/dip/wargoals.js';
import { logAdd } from '../log.js';
import { joiningGuarantors, breakGuarantees } from './guarantee.js';
import { relOf, setRel, sameFaction, campOf, factionId, hasCapitulated, warScore, pairKey } from './core.js';

const ok = (o) => Number.isInteger(o) && o >= 1 && o < getWorld().owners.length;
const patch = (state, p) => ({ ...state, dip: { ...state.dip, ...p, ver: state.dip.ver + 1 } });
const tagOf = (o) => getWorld().owners[o].tag;

/** Proč nejde ospravedlnit / vyhlásit válku `a` proti `b` (český text), nebo null. */
export function warBlock(state, a, b) {
  if (!ok(a) || !ok(b) || a === b) return 'Neplatná země.';
  if (hasCapitulated(state, a)) return 'Kapitulovaná země nemůže vést válku.';
  if (atWar(state.mil, a, b)) return 'Už jste ve válce.';
  if (sameFaction(state, a, b)) return 'Země je ve stejném bloku.';
  if (state.dip.sub && (state.dip.sub[a] === b || state.dip.sub[b] === a)) return 'Pán a jeho loutkový stát spolu nebojují.';
  if (state.dip.sub && state.dip.sub[a]) return 'Loutkový stát nevede vlastní války.';
  return null;
}

/** Ospravedlní válku `a` proti `b`: stojí politickou moc a trvá `JUST_DAYS` dní. */
export function justifyWar(state, a, b, goal = 'conquest') {
  const G = WARGOALS[goal];
  if (!G || warBlock(state, a, b)) return state;
  if (state.dip.just.some((j) => j.a === a && j.b === b)) return state;
  if (state.dip.just.filter((j) => j.a === a).length >= DIP.JUST_MAX) return state;
  const p = state.pol.own[a];
  if (p.pp < G.pp) return state;
  const pol = state.pol.own.slice();
  pol[a] = { ...p, pp: p.pp - G.pp };
  return { ...patch(state, { just: [...state.dip.just, { a, b, g: goal, ready: state.tick + G.days * 24 }] }), pol: { ...state.pol, own: pol } };
}

/** Má `a` hotové ospravedlnění proti `b`? */
export const justReady = (state, a, b) => state.dip.just.some((j) => j.a === a && j.b === b && j.ready <= state.tick && state.tick - j.ready <= DIP.JUST_KEEP * 24);

/** Vyhlásí válku `a` proti `b` (vyžaduje hotové ospravedlnění). Členové bloků se zapojí: všichni členové bloku útočníka válčí se všemi členy bloku obránce. */
export function startWar(state, a, b) {
  if (warBlock(state, a, b) || !justReady(state, a, b)) return state;
  const attackers = campOf(state, a).filter((x) => !hasCapitulated(state, x));
  let defenders = campOf(state, b).filter((x) => !hasCapitulated(state, x));
  const guard = joiningGuarantors(state, b, attackers);   // M48: zaručitelé obránce se přidají i s bloky
  for (const g of guard) for (const x of campOf(state, g)) if (!hasCapitulated(state, x) && !attackers.includes(x) && !defenders.includes(x)) defenders = [...defenders, x];
  let s = breakGuarantees(state, b, attackers);
  const since = { ...state.dip.since };
  for (const x of attackers) for (const y of defenders) {
    if (x === y || atWar(s.mil, x, y)) continue;
    s = declareWar(s, tagOf(x), tagOf(y));
    since[pairKey(x, y)] = state.tick;
  }
  let rel = s.dip.rel;
  rel = setRel(rel, a, b, DIP.REL_WAR);
  for (const y of defenders) if (y !== b) rel = setRel(rel, a, y, DIP.REL_WAR_ALLY);
  const jg = (state.dip.just.find((j) => j.a === a && j.b === b) || {}).g || 'conquest';
  return logAdd(patch(s, { rel, since, goal: { ...s.dip.goal, [`${a}>${b}`]: jg }, just: s.dip.just.filter((j) => !(j.a === a && j.b === b)) }), { k: 'war', a, b });
}

/** Zdůvodnění, proč druhá strana bílý mír odmítne (český text), nebo null. */
export function peaceBlock(state, a, b) {
  if (!ok(a) || !ok(b) || a === b || !atWar(state.mil, a, b)) return 'Nejste ve válce.';
  if (warScore(state, b, a) >= DIP.PEACE_SCORE) return 'Protivník vyhrává a bílý mír odmítá.';
  return null;
}

/** Navrhne bílý mír; protivník ho přijme, nevede-li válečné skóre. Mír platí jen mezi dvojicí (spojenci dál válčí). */
export function proposePeace(state, a, b) {
  if (peaceBlock(state, a, b)) return state;
  const s = makePeace(state, tagOf(a), tagOf(b));
  if (s === state) return state;
  const since = { ...s.dip.since };
  delete since[pairKey(a, b)];
  return logAdd(patch(s, { since }), { k: 'peace', a, b });
}

// ---- bloky ----
const tier = (o) => COUNTRIES[tagOf(o)]?.tier ?? 3;

/** Skóre, s jakým `target` přijme pozvání od `o`. */
export function inviteScore(state, o, target) {
  let sc = relOf(state, o, target);
  const e1 = new Set(enemiesOf(state.mil, o));
  if (enemiesOf(state.mil, target).some((x) => e1.has(x))) sc += DIP.INVITE_ENEMY;
  if (COUNTRIES[tagOf(o)]?.ideology === COUNTRIES[tagOf(target)]?.ideology) sc += DIP.INVITE_IDEO;
  void tier;
  return sc;
}

/** Proč blok nejde založit nebo pozvat (český text), nebo null. */
export function inviteBlock(state, o, target) {
  if (!ok(o) || !ok(target) || o === target) return 'Neplatná země.';
  const f = state.dip.facs[factionId(state, o)];
  if (!f) return 'Nejste v žádném bloku.';
  if (f.ldr !== o) return 'Zvát smí jen vedoucí bloku.';
  if (state.dip.fac[target]) return 'Země už je v bloku.';
  if (hasCapitulated(state, target)) return 'Země kapitulovala.';
  if (f.mem.length >= DIP.FAC_MAX_MEM) return 'Blok je plný.';
  if (atWar(state.mil, o, target) || f.mem.some((m) => atWar(state.mil, m, target))) return 'Země je ve válce s členem bloku.';
  if (inviteScore(state, o, target) < DIP.INVITE_MIN) return 'Země pozvání odmítá (špatné vztahy).';
  return null;
}

/** Založí blok země `o` (stojí politickou moc). */
export function createFaction(state, o, nm) {
  if (!ok(o) || state.dip.fac[o] || hasCapitulated(state, o)) return state;
  const p = state.pol.own[o];
  if (p.pp < DIP.FAC_PP) return state;
  const name = cleanName(nm) || `Blok ${getWorld().owners[o].name}`;
  const facs = [...state.dip.facs, { nm: name, ldr: o, mem: [o] }];
  const fac = state.dip.fac.slice();
  fac[o] = facs.length - 1;
  const pol = state.pol.own.slice();
  pol[o] = { ...p, pp: p.pp - DIP.FAC_PP };
  return logAdd({ ...patch(state, { facs, fac }), pol: { ...state.pol, own: pol } }, { k: 'faction', o, x: name });
}

/** Pozve zemi do bloku vedoucího `o`; pozvaný přijme podle skóre pozvání. */
export function inviteToFaction(state, o, target) {
  if (inviteBlock(state, o, target)) return state;
  const id = state.dip.fac[o];
  const facs = state.dip.facs.slice();
  facs[id] = { ...facs[id], mem: [...facs[id].mem, target] };
  const fac = state.dip.fac.slice();
  fac[target] = id;
  return logAdd(patch(state, { facs, fac }), { k: 'join', o: target, x: facs[id].nm });
}

/** Opustí blok; vedoucí předá vedení dalšímu členu, poslední člen blok zruší. */
export function leaveFaction(state, o) {
  const id = state.dip.fac[o];
  if (!ok(o) || !id) return state;
  const f = state.dip.facs[id];
  const mem = f.mem.filter((m) => m !== o);
  const facs = state.dip.facs.slice();
  const fac = state.dip.fac.slice();
  fac[o] = 0;
  if (!mem.length) facs[id] = null;
  else facs[id] = { ...f, mem, ldr: f.ldr === o ? mem[0] : f.ldr };
  return patch(state, { facs, fac });
}
