// Konec hry (M36): vítězství (tvůj blok drží polovinu světa), porážka (tvá země kapitulovala) a konec času (1. 1. 1946) s hodnocením.
// `state.end = null | { kind: 'win'|'lose'|'time', tick, ack, share, rank, vp, score }`; po vzniku se čas zastaví, `ackEnd` dovolí pokračovat.
import { getWorld } from './world.js';
import { campOf } from './dip/core.js';
import { subjectsOf } from './dip/subjects.js';

export const END = { TICK: 87660, WIN_SHARE: 0.5 };

/** Postavení hráče: { vp (body pod kontrolou jeho země), share (podíl jeho bloku a loutek na světě 0–1), rank (pořadí zemí podle bodů pod kontrolou) }. */
export function standing(state) {
  const w = getWorld();
  const me = state.player ? w.ownerIdx[state.player] : 0;
  const vpBy = new Array(w.owners.length).fill(0);
  let total = 0;
  for (let p = 1; p <= w.L; p++) {
    const v = w.vp[p] + 1;
    total += v;
    vpBy[state.ctrl[p]] += v;
  }
  if (!me) return { me, vp: 0, share: 0, rank: 0, total };
  const camp = new Set(campOf(state, me));
  for (const m of [...camp]) for (const s of subjectsOf(state, m)) camp.add(s);
  let held = 0;
  for (const o of camp) held += vpBy[o] || 0;
  let rank = 1;
  for (let o = 1; o < vpBy.length; o++) if (o !== me && vpBy[o] > vpBy[me]) rank++;
  return { me, vp: vpBy[me], share: total ? held / total : 0, rank, total };
}

/** Denní kontrola konce hry. */
export function endDay(state) {
  if (state.end || !state.player) return state;
  const st = standing(state);
  let kind = null;
  if (state.dip.cap[st.me] && !(state.dip.sub && state.dip.sub[st.me])) kind = 'lose';
  else if (st.share >= END.WIN_SHARE) kind = 'win';
  else if (state.tick >= END.TICK) kind = 'time';
  if (!kind) return state;
  const score = Math.max(0, Math.round(st.share * 1000) + (kind === 'win' ? 500 : 0) + (kind === 'time' ? Math.max(0, 100 - st.rank * 10) : 0));
  return { ...state, paused: true, end: { kind, tick: state.tick, ack: 0, share: Math.round(st.share * 1000) / 1000, rank: st.rank, vp: st.vp, score } };
}

export function endHour(state) {
  return state.tick % 24 === 0 ? endDay(state) : state;
}

/** Hráč vzal konec hry na vědomí a hraje dál (podmínky se už nevyhodnocují). */
export function ackEnd(state) {
  return state.end && !state.end.ack ? { ...state, end: { ...state.end, ack: 1 } } : state;
}

/** Vynutí konec hry (cheat, testy). */
export function forceEnd(state, kind) {
  if (!state.player || state.end || !['win', 'lose', 'time'].includes(kind)) return state;
  const st = standing(state);
  return { ...state, paused: true, end: { kind, tick: state.tick, ack: 0, share: Math.round(st.share * 1000) / 1000, rank: st.rank, vp: st.vp, score: Math.round(st.share * 1000) } };
}
