// Denní krok výzkumu (M20): země bez hráče si doplní prázdné sloty, každý zkoumaný obor postoupí, hotové technologie se projeví (úrovně výzbroje, sloty).
import { getWorld } from '../world.js';
import { TECHS, TECH_IDS } from '../../data/research/index.js';
import { isAvailable, slotCount, speedOfDone, progressPerDay, yearOf } from './core.js';

const hash = (o, id) => { let h = o * 2654435761; for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619); return (h >>> 0) % 50; };

/** Volba AI: nejdřív technologie, jejichž čas už nastal, podle roku, délky a hashe (aby se země lišily). */
export function aiPick(own, year, taken) {
  let best = null, bk = Infinity;
  for (const id of TECH_IDS) {
    if (taken.has(id) || !isAvailable(own, id) || TECHS[id].year > year) continue;
    const k = TECHS[id].year * 1000 + TECHS[id].days + hash(own.o || 0, id);
    if (k < bk) { bk = k; best = id; }
  }
  return best;
}

export function researchDay(state) {
  const w = getWorld();
  const player = state.player ? w.ownerIdx[state.player] : 0;
  const year = Math.floor(yearOf(state.tick));
  let own = state.tech.own, ownCopy = false;
  let lv = state.mil.lv, lvCopy = false, milChanged = false;
  for (let o = 1; o < own.length; o++) {
    const cur = own[o];
    if (!cur) continue;
    const want = slotCount(cur.done, o);
    let slots = cur.slots;
    let changed = slots.length !== want;
    if (changed) { slots = slots.slice(0, want); while (slots.length < want) slots.push(0); }
    if (o !== player && slots.includes(0)) {
      const taken = new Set(slots.filter(Boolean));
      if (!changed) { slots = slots.slice(); changed = true; }
      for (let i = 0; i < slots.length; i++) {
        if (slots[i]) continue;
        const pick = aiPick({ ...cur, o }, year, taken);
        if (!pick) break;
        slots[i] = pick; taken.add(pick);
      }
    }
    if (slots.some(Boolean)) {
      if (slots === cur.slots) slots = slots.slice();
      changed = true;
      const speed = speedOfDone(o, cur.done);
      let prog = { ...cur.prog }, done = cur.done;
      for (let i = 0; i < slots.length; i++) {
        const id = slots[i];
        if (!id) continue;
        const p = (prog[id] || 0) + progressPerDay(speed, state.tick, id);
        if (p < 1) { prog[id] = p; continue; }
        if (done === cur.done) done = { ...done };
        done[id] = 1;
        delete prog[id];
        slots[i] = 0;
        for (const e in TECHS[id].fx.lv || {}) {
          const old = lv[o] || {};
          if ((old[e] || 1) < TECHS[id].fx.lv[e]) {
            if (!lvCopy) { lv = lv.slice(); lvCopy = true; }
            lv[o] = { ...old, [e]: TECHS[id].fx.lv[e] };
            milChanged = true;
          }
        }
      }
      if (!ownCopy) { own = own.slice(); ownCopy = true; }
      own[o] = { done, slots, prog };
    } else if (changed) {
      if (!ownCopy) { own = own.slice(); ownCopy = true; }
      own[o] = { ...cur, slots };
    }
  }
  if (!ownCopy) return state;
  const mil = milChanged ? { ...state.mil, lv, ver: state.mil.ver + 1 } : state.mil;
  return { ...state, tech: { ver: state.tech.ver + 1, own }, mil };
}
