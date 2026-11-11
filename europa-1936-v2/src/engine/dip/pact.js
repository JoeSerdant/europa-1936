// Pakty o neútočení a zlepšování vztahů (M75). `dip.nap = [{ a, b, t }]` platné pakty (dvojice bez pořadí, `t` čas podpisu),
// `dip.napq = [{ a, b, t }]` nabídky čekající na hráče `b`. Pakt brání ospravedlnění a vyhlášení války i ultimátu mezi oběma zeměmi;
// vypovědět ho lze nejdřív po `NAP_MIN_DAYS` dnech a stojí stabilitu a vztahy. Čisté funkce, neplatný vstup vrací tentýž stav.
import { getWorld } from '../world.js';
import { logAdd } from '../log.js';
import { atWar, enemiesOf } from '../army/war.js';
import { DIP } from './constants.js';
import { relOf, setRel, sameFaction, hasCapitulated, isDormant } from './core.js';

const ok = (o) => Number.isInteger(o) && o >= 1 && o < getWorld().owners.length;
const patch = (state, p) => ({ ...state, dip: { ...state.dip, ...p, ver: state.dip.ver + 1 } });
const napOf = (state) => state.dip.nap || [];
const napqOf = (state) => state.dip.napq || [];
const same = (x, a, b) => (x.a === a && x.b === b) || (x.a === b && x.b === a);
const playerOf = (state) => (state.player ? getWorld().ownerIdx[state.player] : 0);
const gone = (state, o) => hasCapitulated(state, o) || isDormant(state, o);
const setPol = (state, o, fn) => { const own = state.pol.own.slice(); own[o] = { ...own[o], ...fn(own[o]) }; return { ...state, pol: { ...state.pol, own } }; };

/** Platný pakt mezi `a` a `b`, nebo null. */
export const pactOf = (state, a, b) => napOf(state).find((x) => same(x, a, b)) || null;

/** Proč `a` nemůže nabídnout pakt zemi `b` (český text), nebo null. */
export function pactBlock(state, a, b, free = false) {
  if (!ok(a) || !ok(b) || a === b) return 'Neplatná země.';
  if (gone(state, a) || gone(state, b)) return 'Země neexistuje.';
  if (atWar(state.mil, a, b)) return 'Ve válce se pakt neuzavírá.';
  if (sameFaction(state, a, b)) return 'Člen téhož bloku je spojenec.';
  if (state.dip.sub[a] || state.dip.sub[b]) return 'Loutkový stát pakty neuzavírá.';
  if (pactOf(state, a, b)) return 'Pakt už platí.';
  if (napqOf(state).some((x) => same(x, a, b))) return 'Nabídka už čeká na odpověď.';
  if (!free && state.pol.own[a].pp < DIP.NAP_PP) return `Chybí politická moc (${Math.ceil(DIP.NAP_PP - state.pol.own[a].pp)}).`;
  return null;
}

/** Přijme země `b` (řízená AI) pakt od `a`? Podle vztahu, společného nepřítele a vlastní války; kdo sám chystá válku proti `a`, odmítne. */
export function pactAccepts(state, a, b) {
  if (state.dip.just.some((j) => j.a === b && j.b === a)) return { ok: false, score: -999, need: DIP.NAP_REL };
  let score = relOf(state, b, a);
  const mine = new Set(enemiesOf(state.mil, a));
  const theirs = enemiesOf(state.mil, b);
  if (theirs.some((e) => mine.has(e))) score += DIP.NAP_ENEMY;
  if (theirs.length) score += DIP.NAP_WAR;
  return { ok: score >= DIP.NAP_REL, score, need: DIP.NAP_REL };
}

const sign = (state, a, b) => logAdd(patch(state, { nap: [...napOf(state), { a, b, t: state.tick }], napq: napqOf(state).filter((x) => !same(x, a, b)), rel: setRel(state.dip.rel, a, b, DIP.NAP_GAIN) }), { k: 'nap', a, b, y: 1 });

/**
 * Nabídne pakt: stojí politickou moc. Cíl řízený AI odpoví hned (s `hist` = historická dohoda: zdarma a vždy přijme), hráč dostane nabídku do `dip.napq`.
 * Neplatná nabídka vrací tentýž stav.
 */
export function proposePact(state, a, b, hist = false) {
  if (pactBlock(state, a, b, hist)) return state;
  let s = hist ? state : setPol(state, a, (p) => ({ pp: p.pp - DIP.NAP_PP }));   // historická dohoda je zdarma
  if (b === playerOf(state)) return logAdd(patch(s, { napq: [...napqOf(s), { a, b, t: s.tick }] }), { k: 'napq', a, b });
  if (hist || pactAccepts(s, a, b).ok) return sign(s, a, b);
  return logAdd(s, { k: 'nap', a, b, y: 0 });
}

/** Odpověď hráče `b` na nabídku země `a`. */
export function answerPact(state, b, a, accept) {
  if (!napqOf(state).some((x) => x.a === a && x.b === b)) return state;
  if (accept && !atWar(state.mil, a, b) && !gone(state, a) && !gone(state, b)) return sign(state, a, b);
  return logAdd(patch(state, { napq: napqOf(state).filter((x) => !(x.a === a && x.b === b)) }), { k: 'nap', a, b, y: 0 });
}

/** Proč `a` nemůže pakt se zemí `b` vypovědět (český text), nebo null. */
export function breakBlock(state, a, b) {
  const p = ok(a) && ok(b) ? pactOf(state, a, b) : null;
  if (!p) return 'Žádný pakt neplatí.';
  const left = DIP.NAP_MIN_DAYS * 24 - (state.tick - p.t);
  if (left > 0) return `Pakt lze vypovědět až za ${Math.ceil(left / 24)} dní.`;
  return null;
}

/** Vypoví pakt: `a` ztratí stabilitu, vztah s `b` prudce klesne. */
export function breakPact(state, a, b) {
  if (breakBlock(state, a, b)) return state;
  let s = patch(state, { nap: napOf(state).filter((x) => !same(x, a, b)), rel: setRel(state.dip.rel, a, b, DIP.NAP_BREAK_REL) });
  s = setPol(s, a, (p) => ({ stab: Math.max(0.05, p.stab - DIP.NAP_BREAK_STAB) }));
  return logAdd(s, { k: 'napend', a, b });
}

/** Zruší pakty mezi zeměmi, které jsou spolu ve válce (válka bloků pakt ruší), a pakty zaniklých zemí. Bez změny vrací tentýž stav. */
export function voidPacts(state) {
  const nap = napOf(state);
  const live = nap.filter((x) => !atWar(state.mil, x.a, x.b) && !gone(state, x.a) && !gone(state, x.b));
  return live.length === nap.length ? state : patch(state, { nap: live });
}

/** Denní krok: vypršelé nabídky hráči a zaniklé pakty. */
export function pactDay(state) {
  let s = voidPacts(state);
  const q = napqOf(s);
  const live = q.filter((x) => s.tick - x.t < DIP.NAP_OFFER_DAYS * 24 && !atWar(s.mil, x.a, x.b) && !gone(s, x.a));
  if (live.length !== q.length) s = patch(s, { napq: live });
  return s;
}

/** Proč `a` nemůže zlepšovat vztahy se zemí `b` (český text), nebo null. */
export function improveBlock(state, a, b) {
  if (!ok(a) || !ok(b) || a === b) return 'Neplatná země.';
  if (gone(state, a) || gone(state, b)) return 'Země neexistuje.';
  if (atWar(state.mil, a, b)) return 'Ve válce se vztahy nezlepšují.';
  if (relOf(state, a, b) >= DIP.IMPROVE_MAX) return 'Vztahy už lepší být nemohou.';
  if (state.pol.own[a].pp < DIP.IMPROVE_PP) return `Chybí politická moc (${Math.ceil(DIP.IMPROVE_PP - state.pol.own[a].pp)}).`;
  return null;
}

/** Zlepší vztah `a` se zemí `b` o `IMPROVE_GAIN` za politickou moc (změna se v míru pomalu zapomíná jako každá jiná). */
export function improveRelations(state, a, b) {
  if (improveBlock(state, a, b)) return state;
  const s = setPol(state, a, (p) => ({ pp: p.pp - DIP.IMPROVE_PP }));
  return patch(s, { rel: setRel(s.dip.rel, a, b, DIP.IMPROVE_GAIN) });
}

/** Nabídky paktu čekající na zemi `o`: [{ a, left (dní) }]. */
export const pactOffers = (state, o) => napqOf(state).filter((x) => x.b === o).map((x) => ({ a: x.a, left: Math.max(0, Math.ceil((DIP.NAP_OFFER_DAYS * 24 - (state.tick - x.t)) / 24)) }));
