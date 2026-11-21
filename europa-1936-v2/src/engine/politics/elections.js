// Volby v demokraciích (F4, po vzoru HOI4): země s demokratickou vládou volí v termínech z `ELECTIONS` (jinak každé `POL.ELECT_EVERY` dní
// od dne odvozeného z indexu země). Za války se volby odkládají. Má-li jiná strana víc než `POL.ELECT_WIN` bodů a nejvíc ze všech,
// převezme vládu (`changeGov` s `vote`); jinak demokraté vládnou dál se silným (stabilita +) nebo slabým (stabilita −) mandátem.
// S historickou AI se vláda AI zemí volbami nemění (koleje), hráčova ano. Žádný stav: termín je čistá funkce dne.
import { getWorld } from '../world.js';
import { ELECTIONS } from '../../data/politics/elections.js';
import { IDEO_ORDER } from '../../data/politics/ideology.js';
import { hasWar } from '../army/war.js';
import { rand01 } from '../nat/core.js';
import { logAdd } from '../log.js';
import { ideologyOf, changeGov } from './parties.js';
import { POL } from './constants.js';

/** Termíny voleb země: { day, every } (den prvních voleb, odstup ve dnech). */
export function electionPlan(o) {
  const row = ELECTIONS[getWorld().owners[o].tag];
  if (row) return { day: row.day, every: row.every };
  const every = POL.ELECT_EVERY;
  return { day: Math.floor(rand01(0, o, 'volby') * every), every };
}

/** Den nejbližších voleb země (dnes nebo později), nebo null, nevládne-li demokracie. */
export function nextElection(state, o) {
  if (!state.pol.own[o] || ideologyOf(state, o) !== 'democracy') return null;
  const { day, every } = electionPlan(o), today = Math.floor(state.tick / 24);
  return today <= day ? day : day + Math.ceil((today - day) / every) * every;
}

/** Denní krok (po půlnoci): volby v zemích, kde dnes připadají. Bez voleb vrací tentýž stav. */
export function electionsDay(state) {
  const w = getWorld(), today = Math.floor(state.tick / 24);
  const player = state.player ? w.ownerIdx[state.player] || 0 : 0;
  const rails = !!(state.ai && state.ai.hist);
  for (let o = 1; o < w.owners.length; o++) {
    const own = state.pol.own[o];
    if (!own || state.dip.cap[o] || ideologyOf(state, o) !== 'democracy') continue;
    const { day, every } = electionPlan(o);
    if (today < day || (today - day) % every !== 0) continue;
    if (hasWar(state.mil, o)) { if (o === player) state = logAdd(state, { k: 'elect', o, x: 'war' }); continue; }
    let top = 'democracy';
    for (const k of IDEO_ORDER) if (own.par[k] > own.par[top]) top = k;
    if (top !== 'democracy' && own.par[top] > POL.ELECT_WIN && !(rails && o !== player)) { state = changeGov(state, o, top, { vote: true }); continue; }
    const dem = own.par.democracy, strong = dem >= POL.ELECT_STRONG;
    const d = strong ? POL.ELECT_STAB : dem < 50 ? -POL.ELECT_STAB : POL.ELECT_STAB / 3;
    const arr = state.pol.own.slice();
    arr[o] = { ...own, stab: Math.max(0, Math.min(1, own.stab + d)) };
    state = { ...state, pol: { ...state.pol, own: arr } };
    if (o === player) state = logAdd(state, { k: 'elect', o, x: 'win', y: strong ? 1 : 0 });
  }
  return state;
}
