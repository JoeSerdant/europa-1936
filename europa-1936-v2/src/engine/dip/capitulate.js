// Kapitulace (M23): okupované státy připadnou okupantům, válečné stavy země skončí, jednotky v anektovaných provinciích odejdou domů nebo zaniknou.
import { getWorld } from '../world.js';
import { atWar, enemiesOf } from '../army/war.js';
import { withCtx, settleAfterPeace, makePeace } from '../army/commands.js';
import { COUNTRIES } from '../../data/countries.js';
import { pairKey } from './core.js';
import { DIP } from './constants.js';
import { logAdd } from '../log.js';
import { conference, stateValue } from './subjects.js';
import { addSpirit } from '../nat/spirits.js';
import { exileCandidate, goIntoExile, dropExiles } from './exile.js';

/**
 * Konec války bloku (M88): padne-li vedoucí bloku, jeho malí členové, kteří válčili jen kvůli bloku (nikdo proti nim nemá válečný cíl ani oni proti nikomu),
 * uzavřou s protivníky vedoucího mír. Velmoci a země s vlastním cílem bojují dál.
 */
function endBlocWar(state, loser) {
  const f = state.dip.facs[state.dip.fac[loser]];
  if (!f || f.ldr !== loser) return state;
  const w = getWorld(), foes = enemiesOf(state.mil, loser);
  for (const m of f.mem) {
    if (m === loser || state.dip.cap[m] || (COUNTRIES[w.owners[m].tag]?.tier ?? 3) === 1) continue;
    for (const e of foes) {
      if (!atWar(state.mil, m, e) || state.dip.goal[`${m}>${e}`] || state.dip.goal[`${e}>${m}`]) continue;
      const s = makePeace(state, w.owners[m].tag, w.owners[e].tag);
      if (s === state) continue;
      const since = { ...s.dip.since };
      delete since[pairKey(m, e)];
      state = logAdd({ ...s, dip: { ...s.dip, since, ver: s.dip.ver + 1 } }, { k: 'peace', a: m, b: e });
    }
  }
  return state;
}

export function capitulate(state, loser) {
  const w = getWorld();
  if (state.dip.cap[loser]) return state;
  state = endBlocWar(state, loser);
  const stateOwner = state.stateOwner.slice();
  const ctrl = state.ctrl.slice();
  let annexed = 0;
  const by = {}, val = {};
  for (let s = 1; s < w.states.length; s++) {
    if (stateOwner[s] !== loser) continue;
    const c = ctrl[w.states[s].cap];
    if (c === loser || !atWar(state.mil, c, loser)) continue;
    stateOwner[s] = c;
    for (const p of w.states[s].v) ctrl[p] = c;
    annexed++;
    by[c] = (by[c] || 0) + 1;
    val[c] = (val[c] || 0) + stateValue(state, s);   // M84: hodnota dobytých států = body vítěze v mírové konferenci
  }
  // M88: cizí území, které poražený sám okupoval, se vrací vlastníkům (jeho divize tam pak zaniknou nebo odejdou domů)
  for (let p = 1; p <= w.L; p++) if (ctrl[p] === loser) { const own = stateOwner[w.provState[p]]; if (own !== loser) ctrl[p] = own; }
  const host = exileCandidate(state, loser);   // M83: exilová vláda u člena bloku, který ještě bojuje
  const allies = host ? state.dip.facs[state.dip.fac[loser]].mem.slice() : [];
  const wars = state.mil.wars.filter(([a, b]) => a !== loser && b !== loser);
  const cap = state.dip.cap.slice();
  cap[loser] = 1;
  // z bloku vypadne
  let fac = state.dip.fac, facs = state.dip.facs;
  const id = fac[loser];
  if (id) {
    fac = fac.slice(); fac[loser] = 0;
    facs = facs.slice();
    const f = facs[id], mem = f.mem.filter((m) => m !== loser);
    facs[id] = mem.length ? { ...f, mem, ldr: f.ldr === loser ? mem[0] : f.ldr } : null;
  }
  const pol = state.pol.own.slice();
  pol[loser] = { ...pol[loser], stab: Math.max(0.05, pol[loser].stab - DIP.CAP_STAB) };
  const next = {
    ...state, stateOwner, ctrl, ownerVer: state.ownerVer + 1,
    mil: { ...state.mil, wars, ver: state.mil.ver + 1 },
    dip: { ...state.dip, cap, fac, facs, since: Object.fromEntries(Object.entries(state.dip.since || {}).filter(([k]) => !k.split('-').map(Number).includes(loser))), just: state.dip.just.filter((j) => j.a !== loser && j.b !== loser), ver: state.dip.ver + 1 },
    pol: { ...state.pol, own: pol },
  };
  void annexed;
  let top = 0;   // M74: země, která dobyla nejvíc provincií poraženého, dostane dočasného ducha „Vítězná nálada“
  for (const c in by) if (!top || by[c] > by[top]) top = +c;
  let done = top ? addSpirit(next, top, 'vitezna_nalada', DIP.VICTORY_DAYS) : next;
  if (host) done = goIntoExile(done, loser, host, allies, ctrl);
  done = dropExiles(done, loser);   // exily u poražené země zanikají
  return conference(logAdd(withCtx(done, (ctx) => settleAfterPeace(ctx, loser, loser)), { k: 'cap', o: loser }), loser, by, val);
}
