// Exilové vlády (M83). Když kapituluje člen bloku a jiný člen ještě bojuje s jeho nepřáteli, poražená země odchází do exilu k hostiteli
// (`dip.exile[země] = hostitel`): divize stojící na území bloku přejdou pod hostitele (se zkopírovanými šablonami), flotily a lodě také, hostitel dostane
// podíl zásob výzbroje. Když hostitel nebo jeho blok později získá do vlastnictví stát s původním hlavním městem exilové země, země se obnoví
// (`restoreCountry`): dostane zpět své původní státy, které drží hostitel a jeho spojenci, a vstoupí do jeho bloku. Čisté funkce.
import { getWorld } from '../world.js';
import { logAdd } from '../log.js';
import { atWar, enemiesOf } from '../army/war.js';
import { divisionCount } from '../army/selectors.js';
import { DIP } from './constants.js';

const exileOf = (state) => state.dip.exile || [];

/** Hostitel exilu země `o` (0 = země v exilu není). */
export const exileHost = (state, o) => exileOf(state)[o] || 0;

/** Kdo by přijal exilovou vládu země `loser`? Vedoucí jejího bloku, jinak nejsilnější člen, který ještě bojuje s některým jejím nepřítelem; 0 = nikdo. */
export function exileCandidate(state, loser) {
  const f = state.dip.facs[state.dip.fac[loser]];
  if (!f) return 0;
  const foes = enemiesOf(state.mil, loser);
  const ok = (m) => m !== loser && !state.dip.cap[m] && foes.some((e) => atWar(state.mil, m, e));
  if (ok(f.ldr)) return f.ldr;
  const list = f.mem.filter(ok).sort((a, b) => divisionCount(state, b) - divisionCount(state, a) || a - b);
  return list[0] || 0;
}

/**
 * Přesune síly země `loser` k hostiteli `host`: divize na území, které ovládá hostitel nebo člen bloku `mem` (ne poražená země), flotily a lodě v rezervě,
 * podíl `EXILE_STOCK` zásob výzbroje. `ctrl` je kontrola provincií po anexi dobytých států. Vrací stav s `dip.exile[loser] = host`.
 */
export function goIntoExile(state, loser, host, mem, ctrl) {
  const mil = state.mil, friendly = new Set(mem.filter((m) => m !== loser));
  const tpl = mil.tpl.slice(), divs = mil.divs.slice();
  const map = new Map();
  const tplOf = (id) => {
    if (!map.has(id)) { const t = mil.tpl[id]; map.set(id, tpl.length); tpl.push({ ...t, o: host, nm: `${t.nm} (exil)`, reg: t.reg.map((c) => c.slice()), sup: t.sup.slice() }); }
    return map.get(id);
  };
  let moved = 0;
  for (let id = 1; id < divs.length; id++) {
    const d = divs[id];
    if (!d || d.o !== loser || !friendly.has(ctrl[d.p])) continue;
    divs[id] = { ...d, o: host, tpl: tplOf(d.tpl), army: 0, path: [], prog: 0, b: 0, org: d.org * DIP.EXILE_ORG };
    moved++;
  }
  const stock = mil.stock.slice(), mine = { ...(stock[host] || {}) }, left = {};
  for (const e in mil.stock[loser] || {}) {
    const n = Math.floor(mil.stock[loser][e] * DIP.EXILE_STOCK);
    mine[e] = (mine[e] || 0) + n; left[e] = mil.stock[loser][e] - n;
  }
  stock[host] = mine; stock[loser] = left;
  let nav = state.nav;
  if (nav) {
    const fleets = nav.fleets.map((f) => (f && f.o === loser ? { ...f, o: host, nm: `${f.nm} (exil)` } : f));
    const pool = nav.pool.slice(), add = { ...pool[host] }, zero = { ...pool[loser] };
    for (const k in zero) { add[k] = (add[k] || 0) + zero[k]; zero[k] = 0; }
    pool[host] = add; pool[loser] = zero;
    nav = { ...nav, fleets, pool, ver: nav.ver + 1 };
  }
  const exile = exileOf(state).slice();
  while (exile.length < getWorld().owners.length) exile.push(0);
  exile[loser] = host;
  const next = { ...state, mil: { ...mil, divs, tpl, stock, ver: mil.ver + 1 }, nav, dip: { ...state.dip, exile, ver: state.dip.ver + 1 } };
  return logAdd(next, { k: 'exile', o: loser, x: host, y: moved });
}

/** Zruší exily u hostitele `host` (hostitel sám kapituloval). */
export function dropExiles(state, host) {
  const exile = exileOf(state);
  if (!exile.some((h) => h === host)) return state;
  return { ...state, dip: { ...state.dip, exile: exile.map((h) => (h === host ? 0 : h)), ver: state.dip.ver + 1 } };
}

/** Státy, které by obnovená země `o` dostala zpět: její původní státy, které teď vlastní hostitel nebo člen jeho bloku. */
export function restorable(state, o) {
  const w = getWorld(), host = exileHost(state, o);
  if (!host) return [];
  const f = state.dip.facs[state.dip.fac[host]];
  const side = new Set(f ? f.mem : [host]);
  const out = [];
  for (let s = 1; s < w.states.length; s++) if (w.stateOwner0[s] === o && side.has(state.stateOwner[s])) out.push(s);
  return out;
}

/** Obnoví exilovou zemi `o`, pokud blok hostitele vlastní stát s jejím původním hlavním městem. Jinak vrací tentýž stav. */
export function restoreCountry(state, o) {
  const w = getWorld(), host = exileHost(state, o);
  if (!host || state.dip.cap[host]) return state;
  const ids = restorable(state, o);
  const capState = w.provState[w.owners[o].cap];
  if (!ids.includes(capState)) return state;
  const stateOwner = state.stateOwner.slice(), ctrl = state.ctrl.slice();
  for (const s of ids) { const prev = stateOwner[s]; stateOwner[s] = o; for (const p of w.states[s].v) if (ctrl[p] === prev) ctrl[p] = o; }
  const cap = state.dip.cap.slice(); cap[o] = 0;
  const exile = exileOf(state).slice(); exile[o] = 0;
  let fac = state.dip.fac, facs = state.dip.facs;
  const fid = fac[host];
  if (fid && facs[fid]) {
    fac = fac.slice(); fac[o] = fid;
    facs = facs.slice(); facs[fid] = { ...facs[fid], mem: facs[fid].mem.includes(o) ? facs[fid].mem : [...facs[fid].mem, o] };
  }
  const own = state.pol.own.slice();
  own[o] = { ...own[o], stab: DIP.RESTORE_STAB, ws: Math.max(own[o].ws, 0.5) };
  const man = state.mil.man.slice();
  man[o] = Math.max(man[o] || 0, DIP.RESTORE_MAN);
  // válka: obnovená země bojuje po boku hostitele proti jeho nepřátelům
  let wars = state.mil.wars;
  for (const e of enemiesOf(state.mil, host)) if (!atWar({ wars }, o, e)) wars = [...wars, o < e ? [o, e] : [e, o]];
  const next = {
    ...state, stateOwner, ctrl, ownerVer: state.ownerVer + 1,
    mil: { ...state.mil, man, wars, ver: state.mil.ver + 1 },
    pol: { ...state.pol, own },
    dip: { ...state.dip, cap, exile, fac, facs, ver: state.dip.ver + 1 },
  };
  return logAdd(next, { k: 'restore', o, x: host, y: ids.length });
}

/** Denní krok: obnova exilových zemí, jejichž hlavní město blok hostitele získal. */
export function exileDay(state) {
  const exile = exileOf(state);
  let s = state;
  for (let o = 1; o < exile.length; o++) if (exile[o]) s = restoreCountry(s, o);
  return s;
}
