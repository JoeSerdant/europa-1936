// Příkazy: čisté funkce (state, ...argumenty) → nový stav. Při neplatném vstupu vracejí tentýž objekt stavu (nic se nezmění).
import { SPEEDS, MAX_SPEED } from './game.js';
import { getWorld } from './world.js';

export function setPlayer(state, tag) {
  const w = getWorld();
  if (tag !== null && !w.ownerIdx[tag]) return state;
  if (state.player === tag) return state;
  return { ...state, player: tag };
}

export function setSpeed(state, speed) {
  if (!Number.isInteger(speed) || speed < 1 || speed > MAX_SPEED || speed === state.speed) return state;
  return { ...state, speed };
}

export function setPaused(state, paused) {
  paused = !!paused;
  return state.paused === paused ? state : { ...state, paused };
}

export const togglePause = (state) => setPaused(state, !state.paused);

/** Zvýší/sníží rychlost o jedna (kolečko, klávesy +/−). */
export function changeSpeed(state, delta) {
  return setSpeed(state, Math.max(1, Math.min(MAX_SPEED, state.speed + delta)));
}

/** Přenese vlastnictví celého státu (a kontrolu všech jeho provincií) na jiného vlastníka. */
export function transferState(state, stateId, tag) {
  const w = getWorld();
  const to = w.ownerIdx[tag];
  const st = w.states[stateId];
  if (!to || !st) return state;
  if (state.stateOwner[stateId] === to) {
    // vlastník už je, ale kontrola mohla být jinde – srovnáme jen kontrolu
    if (st.v.every((p) => state.ctrl[p] === to)) return state;
  }
  const stateOwner = state.stateOwner.slice();
  stateOwner[stateId] = to;
  const ctrl = state.ctrl.slice();
  for (const p of st.v) ctrl[p] = to;
  return { ...state, stateOwner, ctrl, ownerVer: state.ownerVer + 1 };
}

export { SPEEDS };
