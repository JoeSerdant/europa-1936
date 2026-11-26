// S5c: nájezdy speciálních jednotek (vlastní obdoba nájezdů z HOI4). Divize ze speciálních praporů (`sf` v datech praporů) se
// v dosahu `RAID.KM` připraví na nájezd na nepřátelský stát; po `RAID.PREP` dnech se nájezd vyhodnotí (šance podle zkušeností,
// organizace a obrany cíle, náhoda přes hash `rand01`, ne `state.rng`). Druhy: letiště (zničí letadla křídel na základně),
// přístav (poškodí flotily v přístavních vodách), sklad (zničí část výzbroje cílové země), továrny (poškození jako bombardování).
//  mil.raids = [{ id, o, d, k, s, at }]
import { getWorld } from '../world.js';
import { RAID, RAID_KINDS } from '../../data/army/raids.js';
import { atWar } from '../army/war.js';
import { geo } from '../army/geo.js';
import { tplStats } from '../army/unit.js';
import { isSpecial } from '../army/special.js';
import { rand01 } from '../nat/core.js';
import { logAdd } from '../log.js';
import { xpLevel } from '../army/constants.js';
import { AIR } from '../air/constants.js';
import { NAV } from '../nav/constants.js';

const raidsOf = (state) => state.mil.raids || [];

/** Šance na úspěch nájezdu divize `d` na stát `s` druhu `k` (0–1). */
export function raidChance(state, d, k, s) {
  const w = getWorld(), t = state.stateOwner[s];
  let c = RAID.BASE + RAID.XP * xpLevel(d.xp || 0) + RAID.ORG * (d.org / Math.max(1, tplStats(state.mil, d.tpl).org) - 1);
  const inState = new Set(w.states[s].v);
  for (const x of state.mil.divs) if (x && x.o === t && inState.has(x.p)) c -= RAID.GUARD;
  const st = state.ind.st[s] || {};
  if (k === 'afb') c -= RAID.RADAR * (st.radar || 0);
  c -= RAID.AA * (st.aa || 0);
  return Math.max(RAID.MIN, Math.min(RAID.MAX, c));
}

/** Proč divize `id` nemůže na nájezd `k` na stát `s` (český text), nebo null. */
export function raidBlock(state, id, k, s) {
  const w = getWorld(), d = state.mil.divs[id], K = RAID_KINDS[k];
  if (!d) return 'Divize neexistuje.';
  if (!K) return 'Neznámý druh nájezdu.';
  if (!isSpecial(state.mil, d)) return 'Nájezdy podnikají jen speciální jednotky (horští střelci, výsadkáři, námořní pěchota).';
  if (raidsOf(state).some((r) => r.d === id)) return 'Divize už nájezd chystá.';
  if (d.b) return 'Divize je v boji.';
  if (!Number.isInteger(s) || s < 1 || s >= w.states.length) return 'Zvolte cílový stát.';
  const t = state.stateOwner[s];
  if (!t || !atWar(state.mil, d.o, t)) return 'Nájezd jen na stát nepřítele.';
  if (geo(w).distKm(d.p, w.states[s].cap) > RAID.KM) return `Cíl je dál než ${RAID.KM} km.`;
  const st = state.ind.st[s] || {};
  if (k === 'afb' && !(st.afb > 0)) return 'Ve státě není letiště.';
  if (k === 'port' && !w.states[s].v.some((p) => w.portLevel[p] > 0)) return 'Ve státě není přístav.';
  if (k === 'ind' && !(st.civ + st.mil + (st.dok || 0))) return 'Ve státě nejsou továrny.';
  return null;
}

/** Zahájí přípravu nájezdu (vyhodnotí se za `RAID.PREP` dní). */
export function orderRaid(state, id, k, s) {
  if (raidBlock(state, id, k, s)) return state;
  const d = state.mil.divs[id], n = (state.mil.rn || 0) + 1;
  return { ...state, mil: { ...state.mil, rn: n, raids: [...raidsOf(state), { id: n, o: d.o, d: id, k, s, at: state.tick + RAID.PREP * 24 }], ver: state.mil.ver + 1 } };
}

/** Zruší připravovaný nájezd. */
export function cancelRaid(state, raidId) {
  const r = raidsOf(state).find((x) => x.id === raidId);
  if (!r) return state;
  return { ...state, mil: { ...state.mil, raids: raidsOf(state).filter((x) => x !== r), ver: state.mil.ver + 1 } };
}

/** Účinek úspěšného nájezdu na stav. */
function hit(state, r) {
  const w = getWorld(), t = state.stateOwner[r.s];
  if (r.k === 'afb') {
    const wings = state.air.wings.map((wg) => (wg && wg.o === t && wg.s === r.s ? { ...wg, n: Math.floor(wg.n * (1 - RAID.PLANES)) } : wg));
    return { ...state, air: { ...state.air, wings: wings.map((wg) => (wg && wg.n <= 0 ? null : wg)), ver: state.air.ver + 1 } };
  }
  if (r.k === 'port') {
    const seas = new Set(w.states[r.s].v.filter((p) => w.portLevel[p] > 0).map((p) => w.portSea[p]));
    const fleets = state.nav.fleets.map((f) => (f && f.o === t && seas.has(f.p) && !f.path.length ? { ...f, dm: Math.min(NAV.DMG_MAX, (f.dm || 0) + RAID.FLEET_DMG) } : f));
    return { ...state, nav: { ...state.nav, fleets, ver: state.nav.ver + 1 } };
  }
  if (r.k === 'depot') {
    const stock = state.mil.stock.slice(), cur = stock[t], ns = {};
    for (const e in cur) ns[e] = Math.floor(cur[e] * (1 - RAID.STOCK));
    stock[t] = ns;
    return { ...state, mil: { ...state.mil, stock } };
  }
  const dmg = { ...(state.ind.dmg || {}) };   // továrny: poškození jako po bombardování (S8)
  dmg[r.s] = Math.round(Math.min(AIR.DMG_MAX, (dmg[r.s] || 0) + RAID.IND_DMG) * 1000) / 1000;
  return { ...state, ind: { ...state.ind, dmg, ver: state.ind.ver + 1 } };
}

/** Denní krok: vyhodnotí nájezdy, kterým uplynula příprava (divize zmizela nebo je v boji = nájezd propadá). */
export function raidDay(state) {
  const due = raidsOf(state).filter((r) => r.at <= state.tick);
  if (!due.length) return state;
  const w = getWorld(), me = state.player ? w.ownerIdx[state.player] : 0;
  let s = { ...state, mil: { ...state.mil, raids: raidsOf(state).filter((r) => r.at > state.tick), ver: state.mil.ver + 1 } };
  for (const r of due) {
    const d = s.mil.divs[r.d];
    if (!d || d.o !== r.o || d.b || raidBlock({ ...s, mil: { ...s.mil, raids: [] } }, r.d, r.k, r.s)) continue;
    const ok = rand01(state.tick, r.d, `raid:${r.k}:${r.s}`) < raidChance(s, d, r.k, r.s);
    if (ok) s = hit(s, r);
    const divs = s.mil.divs.slice();
    divs[r.d] = { ...d, org: d.org * (ok ? RAID.ORG_WIN : RAID.ORG_LOSE), hp: ok ? d.hp : d.hp * RAID.HP_LOSE };
    s = { ...s, mil: { ...s.mil, divs, ver: s.mil.ver + 1 } };
    const t = state.stateOwner[r.s];
    if (r.o === me || t === me) s = logAdd(s, { k: 'raid', o: r.o, b: t, x: r.k, s: r.s, y: ok ? 1 : 0 });
  }
  return s;
}

/** Připravované nájezdy země `o` pro rozhraní. */
export const raidsFor = (state, o) => raidsOf(state).filter((r) => r.o === o);

/** Cíle nájezdu divize `id` druhu `k`: [{ s, km, chance }] seřazené podle vzdálenosti (nejvýš `max`). */
export function raidTargets(state, id, k, max = 4) {
  const w = getWorld(), d = state.mil.divs[id], g = geo(w), out = [];
  if (!d) return out;
  for (let s = 1; s < w.states.length; s++) {
    const t = state.stateOwner[s];
    if (!t || !atWar(state.mil, d.o, t) || raidBlock(state, id, k, s)) continue;
    out.push({ s, km: Math.round(g.distKm(d.p, w.states[s].cap)), chance: raidChance(state, d, k, s) });
  }
  return out.sort((a, b) => a.km - b.km || a.s - b.s).slice(0, max);
}
