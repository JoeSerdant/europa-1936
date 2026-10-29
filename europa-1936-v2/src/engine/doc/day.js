// Denní krok doktrín (M34): zisk zkušeností podle bojů, misí letectva a pohybu flotil.
import { getWorld } from '../world.js';
import { DOC } from './constants.js';

const r2 = (v) => Math.round(v * 100) / 100;

export function docDay(state) {
  const w = getWorld(), n = w.owners.length;
  const inBattle = new Array(n).fill(0), onMission = new Array(n).fill(0), fleets = new Array(n).fill(0);
  const divs = state.mil.divs;
  for (const b of state.mil.battles) for (const id of b.att.concat(b.dep)) { const d = divs[id]; if (d) inBattle[d.o]++; }
  for (const wg of state.air.wings) if (wg && wg.m) onMission[wg.o] += wg.n;
  for (const f of state.nav.fleets) if (f && f.path.length) fleets[f.o]++;
  const own = state.doc.own.slice();
  let changed = false;
  for (let o = 1; o < n; o++) {
    if (state.dip.cap[o]) continue;
    const e = own[o];
    const gain = {
      land: DOC.LAND_BASE + Math.min(DOC.LAND_BATTLE_MAX, inBattle[o] * DOC.LAND_BATTLE),
      air: DOC.AIR_BASE + Math.min(DOC.AIR_MAX, onMission[o] * DOC.AIR_MISSION),
      sea: DOC.SEA_BASE + Math.min(DOC.SEA_MAX, fleets[o] * DOC.SEA_FLEET),
    };
    const xp = {};
    let any = false;
    for (const k in gain) { xp[k] = Math.min(DOC.XP_MAX, r2(e.xp[k] + gain[k])); if (xp[k] !== e.xp[k]) any = true; }
    if (any) { own[o] = { ...e, xp }; changed = true; }
  }
  return changed ? { ...state, doc: { ...state.doc, own, ver: state.doc.ver + 1 } } : state;
}
