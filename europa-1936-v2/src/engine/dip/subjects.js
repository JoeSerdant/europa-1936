// Loutkové státy a mírová konference (M33). Kapitulace (capitulate.js) rozdělí okupované státy; o zbytek poraženého rozhodne hlavní vítěz:
// ponechá ho jako loutkový stát (`dip.sub[loser] = vítěz`), nebo ho anektuje. Hráč rozhoduje v mírové konferenci (`dip.conf`), AI automaticky.
import { getWorld } from '../world.js';
import { DIP } from './constants.js';
import { atWar, enemiesOf } from '../army/war.js';
import { withCtx, settleAfterPeace, declareWar, makePeace } from '../army/commands.js';
import { COUNTRIES } from '../../data/countries.js';
import { logAdd } from '../log.js';
import { setRel } from './core.js';

const ok = (o) => Number.isInteger(o) && o >= 1 && o < getWorld().owners.length;
const tagOf = (o) => getWorld().owners[o].tag;
const patch = (state, p) => ({ ...state, dip: { ...state.dip, ...p, ver: state.dip.ver + 1 } });

/** Pán loutkového státu `o` (idx země), jinak 0. */
export const overlordOf = (state, o) => (state.dip.sub && state.dip.sub[o]) || 0;
/** Loutkové státy země `o`. */
export function subjectsOf(state, o) {
  const out = [];
  if (!state.dip.sub) return out;
  for (let t = 1; t < state.dip.sub.length; t++) if (state.dip.sub[t] === o) out.push(t);
  return out;
}

/** Úroveň autonomie loutky podle hodnoty `au`: 0 kolonie, 1 loutka, 2 dominion, 3 nespokojená. */
export const autonomyLevel = (au) => DIP.AU_LEVELS.filter((x) => au >= x).length;
export const AUTONOMY_NAMES = ['Kolonie', 'Loutkový stát', 'Dominion', 'Nespokojená loutka'];
export const autonomyOf = (state, p) => (state.dip.au && state.dip.au[p]) || 0;

/** Proč pán nemůže změnit autonomii loutky (český text), nebo null. */
export function autonomyBlock(state, overlord, puppet, tighten) {
  if (!ok(overlord) || !ok(puppet) || overlordOf(state, puppet) !== overlord) return 'Není to vaše loutka.';
  const au = autonomyOf(state, puppet);
  if (tighten) {
    if (au <= 0) return 'Kontrola je už úplná.';
    if (state.pol.own[overlord].pp < DIP.AU_TIGHT_PP) return `Chybí politická moc (${Math.ceil(DIP.AU_TIGHT_PP - state.pol.own[overlord].pp)}).`;
  } else if (au >= 100) return 'Loutka je zcela nezávislá.';
  return null;
}

/** Pán utáhne kontrolu: autonomie klesne o `AU_TIGHT`, stojí politickou moc a stabilitu loutky. */
export function tightenControl(state, overlord, puppet) {
  if (autonomyBlock(state, overlord, puppet, true)) return state;
  const au = state.dip.au.slice(); au[puppet] = Math.max(0, au[puppet] - DIP.AU_TIGHT);
  const pol = state.pol.own.slice();
  pol[overlord] = { ...pol[overlord], pp: pol[overlord].pp - DIP.AU_TIGHT_PP };
  pol[puppet] = { ...pol[puppet], stab: Math.max(0, pol[puppet].stab - 0.03) };
  return { ...patch(state, { au }), pol: { ...state.pol, own: pol } };
}

/** Pán uvolní kontrolu: autonomie vzroste o `AU_LOOSE` a vztah se zlepší. */
export function loosenControl(state, overlord, puppet) {
  if (autonomyBlock(state, overlord, puppet, false)) return state;
  const au = state.dip.au.slice(); au[puppet] = Math.min(100, au[puppet] + DIP.AU_LOOSE);
  return patch(state, { au, rel: setRel(state.dip.rel, overlord, puppet, 10) });
}

/** Zbylé státy země `o` (které jí ještě patří). */
const statesOf = (state, o) => { const w = getWorld(), out = []; for (let s = 1; s < w.states.length; s++) if (state.stateOwner[s] === o) out.push(s); return out; };

/** Převede všechny státy a provincie `from` na `to`; jednotky `from` v takových provinciích zaniknou. */
function absorb(state, from, to) {
  const w = getWorld();
  const stateOwner = state.stateOwner.slice(), ctrl = state.ctrl.slice();
  for (let s = 1; s < w.states.length; s++) {
    if (stateOwner[s] !== from) continue;
    stateOwner[s] = to;
    for (const p of w.states[s].v) if (ctrl[p] === from) ctrl[p] = to;
  }
  const next = { ...state, stateOwner, ctrl, ownerVer: state.ownerVer + 1, mil: { ...state.mil, ver: state.mil.ver + 1 } };
  return withCtx(next, (ctx) => settleAfterPeace(ctx, from, to));
}

/** Mírová konference: vítěz nechá poraženého jako loutku. Poražený musí být kapitulovaný, s vlastními státy a bez pána. */
export function makePuppet(state, victor, loser) {
  if (!ok(victor) || !ok(loser) || victor === loser || !state.dip.cap[loser] || state.dip.cap[victor] || overlordOf(state, loser) || overlordOf(state, victor) === loser) return state;
  if (!statesOf(state, loser).length) return state;
  const cap = state.dip.cap.slice(); cap[loser] = 0;
  const sub = state.dip.sub.slice(); sub[loser] = victor;
  const pol = state.pol.own.slice();
  pol[loser] = { ...pol[loser], stab: Math.max(pol[loser].stab, 0.35) };
  const au = state.dip.au.slice(); au[loser] = DIP.AU_START;
  return logAdd({ ...patch(state, { cap, sub, au }), pol: { ...state.pol, own: pol } }, { k: 'puppet', o: victor, x: loser });
}

/** Vítěz anektuje zbytek poraženého (stát zanikne). */
export function annexRump(state, victor, loser) {
  if (!ok(victor) || !ok(loser) || victor === loser || !state.dip.cap[loser] || state.dip.cap[victor]) return state;
  if (!statesOf(state, loser).length) return state;
  return logAdd(absorb(state, loser, victor), { k: 'annex', o: victor, x: loser });
}

/** Anexe vlastního loutkového státu za politickou moc. */
export function annexPuppet(state, overlord, puppet) {
  if (!ok(overlord) || !ok(puppet) || overlordOf(state, puppet) !== overlord || state.pol.own[overlord].pp < DIP.ANNEX_PP) return state;
  const sub = state.dip.sub.slice(); sub[puppet] = 0;
  const cap = state.dip.cap.slice(); cap[puppet] = 1;
  const au = state.dip.au.slice(); au[puppet] = 0;
  const pol = state.pol.own.slice();
  pol[overlord] = { ...pol[overlord], pp: pol[overlord].pp - DIP.ANNEX_PP };
  const n = { ...patch(state, { sub, cap, au }), pol: { ...state.pol, own: pol } };
  return logAdd(absorb(n, puppet, overlord), { k: 'annex', o: overlord, x: puppet });
}

// ---- konference ----
/** Zadá konferenci po kapitulaci: hráč dostane rozhodnutí, AI rozhodne hned (velká nebo významná země se stane loutkou). */
export function conference(state, loser, by) {
  let victor = 0, best = 0;
  for (const k of Object.keys(by).map(Number).sort((a, b) => a - b)) if (by[k] > best) { best = by[k]; victor = k; }
  if (!victor || !statesOf(state, loser).length || state.dip.cap[victor]) return state;
  const w = getWorld(), player = state.player ? w.ownerIdx[state.player] : 0;
  if (victor === player) {
    const id = state.dip.conf.reduce((a, c) => Math.max(a, c.id), 0) + 1;
    return patch(state, { conf: [...state.dip.conf, { id, loser, victor }] });
  }
  const tier = COUNTRIES[tagOf(loser)]?.tier ?? 3;
  return statesOf(state, loser).length >= 3 || tier <= 2 ? makePuppet(state, victor, loser) : annexRump(state, victor, loser);
}

const confOf = (state, id) => state.dip.conf.find((c) => c.id === id);
const without = (state, id) => state.dip.conf.filter((c) => c.id !== id);
export function confPuppet(state, id) {
  const c = confOf(state, id);
  if (!c) return state;
  const n = makePuppet(state, c.victor, c.loser);
  return patch(n, { conf: without(n, id) });
}
export function confAnnex(state, id) {
  const c = confOf(state, id);
  if (!c) return state;
  const n = annexRump(state, c.victor, c.loser);
  return patch(n, { conf: without(n, id) });
}
export function confSkip(state, id) {
  return confOf(state, id) ? patch(state, { conf: without(state, id) }) : state;
}

// ---- denní krok ----
/** Loutky vedou války pána, platí mu přísun lidské síly a politické moci; zaniklé nebo zrušené vztahy se čistí. */
export function subjectsDay(state) {
  const sub = state.dip.sub;
  if (!sub || !sub.some(Boolean)) return state;
  const w = getWorld();
  for (let p = 1; p < sub.length; p++) {
    const v = sub[p];
    if (!v) continue;
    if (state.dip.cap[v] || !statesOf(state, p).length) { state = patch(state, { sub: state.dip.sub.map((x, i) => (i === p ? 0 : x)) }); continue; }
    // války pána: přidat chybějící, ukončit ty, které pán už nevede
    const foes = new Set(enemiesOf(state.mil, v));
    for (const e of foes) if (e !== p && !atWar(state.mil, p, e) && !state.dip.cap[e]) state = declareWar(state, tagOf(p), tagOf(e));
    for (const e of enemiesOf(state.mil, p)) if (!foes.has(e) && e !== v) state = makePeace(state, tagOf(p), tagOf(e));
    // autonomie roste; při 100 se loutka osamostatní
    const au0 = state.dip.au[p] + DIP.AU_GROW;
    if (au0 >= 100) {
      const nsub = state.dip.sub.slice(); nsub[p] = 0;
      const nau = state.dip.au.slice(); nau[p] = 0;
      state = logAdd(patch(state, { sub: nsub, au: nau, rel: setRel(state.dip.rel, v, p, -20) }), { k: 'free', o: v, x: p });
      continue;
    }
    const au = state.dip.au.slice(); au[p] = au0;
    state = patch(state, { au });
    const mult = DIP.AU_MULT[autonomyLevel(au0)];
    // příspěvky
    const man = state.mil.man.slice();
    const give = Math.floor((man[p] || 0) * DIP.SUB_MAN * mult);
    if (give > 0) { man[p] -= give; man[v] = (man[v] || 0) + give; state = { ...state, mil: { ...state.mil, man } }; }
    const own = state.pol.own.slice();
    own[v] = { ...own[v], pp: own[v].pp + DIP.SUB_PP * mult };
    state = { ...state, pol: { ...state.pol, own } };
  }
  void w;
  return state;
}
