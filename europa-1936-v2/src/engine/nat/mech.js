// S4: mechaniky jednotlivých zemí (data `MECHS`): ukazatel `nat.mech[id]` (0–100), pásma jako národní duchové, historické kroky u AI.
import { getWorld } from '../world.js';
import { MECHS, MECH_IDS } from '../../data/nat/mechanics.js';
import { addSpirit, removeSpirit } from './spirits.js';
import { shiftOf } from '../ai/free.js';

const clamp = (v) => Math.max(0, Math.min(100, Math.round(v * 10) / 10));

/** Počáteční ukazatele všech mechanik. */
export const startMechs = () => Object.fromEntries(MECH_IDS.map((id) => [id, MECHS[id].start]));

/** Země mechaniky `id` (index) nebo 0. */
export const mechOwner = (id) => (MECHS[id] ? getWorld().ownerIdx[MECHS[id].tag] || 0 : 0);

/** Pásmo ukazatele mechaniky `id` při hodnotě `v` (prvek `bands`). */
export function mechBand(id, v) {
  const M = MECHS[id];
  return M.bands.find((b) => v >= b.min) || M.bands[M.bands.length - 1];
}

/** Běží mechanika `id` (okno dní a země existuje)? */
export function mechActive(state, id) {
  const M = MECHS[id], o = mechOwner(id), day = state.tick / 24;
  return !!o && !state.dip.cap[o] && day >= M.from && day < M.until;
}

/** Mechaniky země `o`: [{ id, v, band, active }] pro rozhraní. */
export function mechsOf(state, o) {
  return MECH_IDS.filter((id) => mechOwner(id) === o).map((id) => {
    const v = (state.nat.mech && state.nat.mech[id]) ?? MECHS[id].start;
    return { id, v, band: mechBand(id, v), active: mechActive(state, id) };
  });
}

/** Posun ukazatele mechaniky `id` o `dv` (účinek `mech`). */
export function shiftMech(state, id, dv) {
  if (!MECHS[id] || !dv) return state;
  const cur = (state.nat.mech && state.nat.mech[id]) ?? MECHS[id].start, v = clamp(cur + dv);
  if (v === cur) return state;
  return { ...state, nat: { ...state.nat, mech: { ...state.nat.mech, [id]: v }, ver: state.nat.ver + 1 } };
}

/** Denní krok: historické kroky u AI (s posunem volné historie), pak duch podle pásma; mimo okno se duchové mechaniky odeberou. */
export function mechDay(state) {
  const w = getWorld(), day = Math.floor(state.tick / 24), player = state.player ? w.ownerIdx[state.player] : 0;
  for (const id of MECH_IDS) {
    const M = MECHS[id], o = mechOwner(id);
    if (!o) continue;
    const active = mechActive(state, id);
    if (active && o !== player) for (const [d, dv] of M.hist) if (day === d + shiftOf(state, o)) state = shiftMech(state, id, dv);
    const want = active ? mechBand(id, state.nat.mech[id] ?? M.start).spirit : '';
    const sp = (state.nat.own[o] && state.nat.own[o].sp) || {};
    for (const b of M.bands) if (b.spirit && b.spirit !== want && b.spirit in sp) state = removeSpirit(state, o, b.spirit);
    if (want && !(want in sp)) state = addSpirit(state, o, want);
  }
  return state;
}
