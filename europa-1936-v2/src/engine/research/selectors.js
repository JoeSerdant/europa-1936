// Dotazy na výzkum pro rozhraní a AI (čisté, bez změn stavu).
import { getWorld } from '../world.js';
import { TECHS, TECH_IDS } from '../../data/research/index.js';
import { RES } from './constants.js';
import { isAvailable, slotCount, baseSpeed, aheadFactor, yearsAhead, modsOf, speedOfDone } from './core.js';

const idxOf = (o) => (typeof o === 'string' ? getWorld().ownerIdx[o] : o);

/** Odhad dnů do dokončení technologie při současné rychlosti a zbývajícím postupu. */
function etaDays(state, o, id, prog) {
  const rate = (baseSpeed(state, o) * aheadFactor(state.tick, id)) / TECHS[id].days;
  return rate > 0 ? Math.ceil((1 - prog) / rate) : -1;
}

/** Přehled výzkumu země: sloty s postupem a odhadem, rychlost, úrovně výzbroje a bonusy. */
export function researchOf(state, o) {
  o = idxOf(o);
  const own = state.tech.own[o];
  const total = slotCount(own.done, o);
  const slots = [];
  for (let i = 0; i < total; i++) {
    const id = own.slots[i] || 0;
    slots.push(id ? { slot: i, id, tech: TECHS[id], p: own.prog[id] || 0, eta: etaDays(state, o, id, own.prog[id] || 0), ahead: yearsAhead(state.tick, id) } : { slot: i, id: 0 });
  }
  return {
    o, slots, speed: baseSpeed(state, o), mods: modsOf(state, o), levels: state.mil.lv[o] || {},
    done: Object.keys(own.done).length, total: TECH_IDS.length, free: slots.filter((s) => !s.id).length,
  };
}

/**
 * Všechny technologie se stavem: `done`, `active` (v slotu), `available`, `locked`; `p` rozpracovaný postup, `ahead` roky předstihu, `eta` dny při současné rychlosti.
 * Pole je stejné pro každou zemi (pořadí podle dat).
 */
export function techList(state, o) {
  o = idxOf(o);
  const own = state.tech.own[o];
  const active = new Set(own.slots.filter(Boolean));
  return TECH_IDS.map((id) => {
    const t = TECHS[id];
    const status = own.done[id] ? 'done' : active.has(id) ? 'active' : isAvailable(own, id) ? 'available' : 'locked';
    const p = own.prog[id] || 0;
    return { id, ...t, status, p, ahead: yearsAhead(state.tick, id), eta: status === 'done' ? 0 : etaDays(state, o, id, p), missing: t.req.filter((r) => !own.done[r]) };
  });
}

export { RES, speedOfDone };
