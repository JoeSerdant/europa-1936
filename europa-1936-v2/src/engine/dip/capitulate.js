// Kapitulace (M23): okupované státy připadnou okupantům, válečné stavy země skončí, jednotky v anektovaných provinciích odejdou domů nebo zaniknou.
import { getWorld } from '../world.js';
import { atWar } from '../army/war.js';
import { withCtx, settleAfterPeace } from '../army/commands.js';
import { DIP } from './constants.js';

export function capitulate(state, loser) {
  const w = getWorld();
  if (state.dip.cap[loser]) return state;
  const stateOwner = state.stateOwner.slice();
  const ctrl = state.ctrl.slice();
  let annexed = 0;
  for (let s = 1; s < w.states.length; s++) {
    if (stateOwner[s] !== loser) continue;
    const c = ctrl[w.states[s].cap];
    if (c === loser || !atWar(state.mil, c, loser)) continue;
    stateOwner[s] = c;
    for (const p of w.states[s].v) ctrl[p] = c;
    annexed++;
  }
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
  return withCtx(next, (ctx) => settleAfterPeace(ctx, loser, loser));
}
