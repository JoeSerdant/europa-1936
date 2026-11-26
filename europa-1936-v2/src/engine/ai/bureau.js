// S5a: AI si v oboru, ve kterém vyrábí, najme kancelář označenou `ai` (levnější výroba), jednou za čas a jen s přebytkem politické moci.
import { BUREAUS, BUREAU_IDS, BUREAU } from '../../data/design/bureaus.js';
import { bureauBlock, hireBureau, bureauCatOf } from '../design/bureau.js';
import { AI } from './constants.js';

export function aiBureaus(state, o) {
  if ((Math.floor(state.tick / 24) + o) % 30 !== 17) return state;
  if (state.pol.own[o].pp < BUREAU.PP + AI.S5_BU_PP_KEEP) return state;
  const bu = (state.mil.lv[o] && state.mil.lv[o].bu) || {};
  const cats = new Set();
  for (const l of state.ind.lines) if (l.o === o && l.fac > 0) { const c = bureauCatOf(l.eq); if (c && !bu[c]) cats.add(c); }
  for (const id of BUREAU_IDS) if (BUREAUS[id].ai && cats.has(BUREAUS[id].cat) && !bureauBlock(state, o, id)) return hireBureau(state, o, id);
  return state;
}
