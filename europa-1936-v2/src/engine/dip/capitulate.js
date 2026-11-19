// Kapitulace (M23): okupované státy jdou na mírovou konferenci (M95; okupant je získá levněji), válečné stavy země skončí, jednotky v anektovaných provinciích odejdou domů nebo zaniknou.
import { getWorld } from '../world.js';
import { atWar, enemiesOf, hasWar } from '../army/war.js';
import { withCtx, settleAfterPeace, makePeace, declareWar } from '../army/commands.js';
import { COUNTRIES } from '../../data/countries.js';
import { pairKey, alliesAtFall } from './core.js';
import { DIP } from './constants.js';
import { logAdd } from '../log.js';
import { conference, stateValue } from './subjects.js';
import { addSpirit } from '../nat/spirits.js';
import { exileCandidate, goIntoExile, dropExiles, markExile, exileHost } from './exile.js';
import { divisionCount } from '../army/selectors.js';

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

export function capitulate(state, loser, opts = {}) {
  const w = getWorld();
  if (state.dip.cap[loser]) return state;
  // F2: spojenci z doby kapitulace – loutka proti nim nikdy nebojuje (při opakované kapitulaci se seznamy slučují)
  const prev = (state.dip.ally0 && state.dip.ally0[loser]) || [], now = alliesAtFall(state, loser) || [];
  const all = [...new Set([...prev, ...now])].filter((c) => c !== loser).sort((a, b) => a - b);
  const friends = all.length ? all : 0;
  state = endBlocWar(state, loser);
  const stateOwner = state.stateOwner.slice();
  const ctrl = state.ctrl.slice();
  const foes = enemiesOf(state.mil, loser).filter((c) => !state.dip.cap[c]);   // M95: účastníci mírové konference
  const by = {}, val = {}, occ = {};
  const capState = w.provState[w.owners[loser].cap];   // F3: územní mír – hlavní město zůstane poraženému
  for (let s = 1; s < w.states.length; s++) {
    if (stateOwner[s] !== loser) continue;
    const c = ctrl[w.states[s].cap];
    if (c === loser || !atWar(state.mil, c, loser)) continue;
    occ[s] = c;   // M95: okupovaný stát jde na konferenční stůl (okupant ho získá levněji)
    by[c] = (by[c] || 0) + 1;
    val[c] = (val[c] || 0) + stateValue(state, s);   // M84: hodnota dobytých států = body vítěze v mírové konferenci
    if (opts.armistice && !(opts.peace && s === capState)) { stateOwner[s] = c; for (const p of w.states[s].v) ctrl[p] = c; }   // M93: po příměří připadnou okupované státy okupantům hned
  }
  if (opts.victor && !Object.keys(by).length) by[opts.victor] = 1;   // M98: bezpodmínečná kapitulace bez okupace – konferenci vede země z koleje
  if (opts.peace) for (let p = 1; p <= w.L; p++) if (stateOwner[w.provState[p]] === loser && ctrl[p] !== loser) ctrl[p] = loser;   // F3: územní mír – zbytek země se vyklidí
  // M88: cizí území, které poražený sám okupoval, se vrací vlastníkům (jeho divize tam pak zaniknou nebo odejdou domů)
  for (let p = 1; p <= w.L; p++) if (ctrl[p] === loser) { const own = stateOwner[w.provState[p]]; if (own !== loser) ctrl[p] = own; }
  // F2 B3: hráčova země pokračuje v exilu – hostitelem může být i spojenec mimo blok, který ještě bojuje (Británie po pádu Francie)
  const playerIdx = state.player ? w.ownerIdx[state.player] : 0;
  const playable = loser === playerIdx && !opts.armistice && !opts.noExile;
  let host = opts.armistice || opts.noExile ? 0 : exileCandidate(state, loser);   // M83: exilová vláda u člena bloku, který ještě bojuje (M93: ne po historickém příměří)
  if (!host && playable && friends) host = strongestFighting(state, friends, loser);
  const allies = host && state.dip.facs[state.dip.fac[loser]] ? state.dip.facs[state.dip.fac[loser]].mem.slice() : [];
  const wars = state.mil.wars.filter(([a, b]) => a !== loser && b !== loser);
  const cap = state.dip.cap.slice();
  cap[loser] = opts.peace ? 0 : 1;   // F3: územní mír (`peace`, s příměřím) – země odstoupí obsazené státy, ale žije dál (AI, vlastní války)
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
    // F2: kapitulovaná loutka přestává být loutkou – o zbytku země rozhodne konference (může z ní udělat loutku vítěze)
    dip: { ...state.dip, cap, fac, facs, sub: state.dip.sub.map((x, i) => (i === loser ? 0 : x)), au: state.dip.au.map((x, i) => (i === loser ? 0 : x)), ally0: (state.dip.ally0 || []).map((x, i) => (i === loser ? friends : x)), since: Object.fromEntries(Object.entries(state.dip.since || {}).filter(([k]) => !k.split('-').map(Number).includes(loser))), just: state.dip.just.filter((j) => j.a !== loser && j.b !== loser), ver: state.dip.ver + 1 },
    pol: { ...state.pol, own: pol },
  };
  let top = 0;   // M74: země, která dobyla nejvíc provincií poraženého, dostane dočasného ducha „Vítězná nálada“
  for (const c in by) if (!top || by[c] > by[top]) top = +c;
  let done = top ? addSpirit(next, top, 'vitezna_nalada', DIP.VICTORY_DAYS) : next;
  if (host) done = playable ? markExile(done, loser, host) : goIntoExile(done, loser, host, allies, ctrl);   // F2 B3: hráčovi jednotky a lodě zůstanou
  done = dropExiles(done, loser, host);   // exily u poražené země odcházejí s ní k jejímu hostiteli (F2), bez hostitele zanikají
  done = logAdd(withCtx(done, (ctx) => settleAfterPeace(ctx, loser, loser)), opts.peace ? { k: 'cede', o: loser, x: top } : { k: 'cap', o: loser });
  done = opts.armistice ? done : conference(done, loser, by, val, occ, foes);   // M93: po historickém příměří zbytek země zůstane samostatný a neutrální (bez konference)
  return playable && host ? fightOn(done, loser) : done;
}

/** Nejsilnější (podle divizí) z `list`, kdo nekapituloval, není loutkou a válčí; 0 = nikdo. */
function strongestFighting(state, list, not) {
  const ok = list.filter((c) => c !== not && !state.dip.cap[c] && !(state.dip.sub && state.dip.sub[c]) && hasWar(state.mil, c));
  ok.sort((a, b) => divisionCount(state, b) - divisionCount(state, a) || a - b);
  return ok[0] || 0;
}

/**
 * F2 B3: hráčova země po kapitulaci bojuje dál jako exilová vláda – jen když jí nezbylo území (jinak je loutkou nebo samostatná, jako dřív):
 * znovu „žije“ (`cap` = 0), vstoupí do bloku hostitele a je ve válce s jeho nepřáteli. Jednotky na území hostitele a lodě jí zůstaly (`markExile`).
 * Obnovu území zařídí `restoreCountry`, až blok hostitele získá stát s hlavním městem.
 */
function fightOn(state, o) {
  const host = exileHost(state, o);
  if (!host || state.dip.cap[host] || (state.dip.sub && state.dip.sub[o]) || state.stateOwner.some((x) => x === o)) return state;
  const w = getWorld();
  const cap = state.dip.cap.slice(); cap[o] = 0;
  let fac = state.dip.fac, facs = state.dip.facs;
  const fid = fac[host];
  if (fid && facs[fid] && !facs[fid].mem.includes(o)) {
    fac = fac.slice(); fac[o] = fid;
    facs = facs.slice(); facs[fid] = { ...facs[fid], mem: [...facs[fid].mem, o] };
  }
  let s = { ...state, dip: { ...state.dip, cap, fac, facs, ver: state.dip.ver + 1 } };
  const since = { ...s.dip.since };
  for (const e of enemiesOf(s.mil, host)) {
    if (e === o || atWar(s.mil, o, e) || s.dip.cap[e]) continue;
    s = declareWar(s, w.owners[o].tag, w.owners[e].tag);
    since[pairKey(o, e)] = s.tick;
  }
  return { ...s, dip: { ...s.dip, since, ver: s.dip.ver + 1 } };
}
