// Upozornění pro hráče (M49): co zrovna zahálí nebo čeká na rozhodnutí. Čistá funkce stavu, nic se neukládá.
// Každé upozornění: { id, panel, tab?, tone, text }; `panel` je okno, které problém řeší.
import { getWorld } from './world.js';
import { researchOf } from './research/selectors.js';
import { focusTree, natOf, pendingEvents } from './nat/selectors.js';
import { industryOf } from './industry/selectors.js';
import { hasCapitulated } from './dip/core.js';

export const ALERT = { PP_HIGH: 150, PP_HIGH_LATE: 250, CIV_IDLE: 1, MIL_IDLE: 2 };

/** Seznam upozornění pro zemi `o` (index nebo tag); pro neplatnou nebo kapitulovanou zemi prázdný. */
export function alertsOf(state, o) {
  const w = getWorld();
  o = typeof o === 'string' ? w.ownerIdx[o] : o;
  if (!Number.isInteger(o) || o < 1 || o >= w.owners.length || hasCapitulated(state, o)) return [];
  const out = [];
  const ev = pendingEvents(state, o).length;
  if (ev) out.push({ id: 'event', panel: 'nat', tone: 'info', text: ev === 1 ? 'Čeká na vás událost.' : `Čeká na vás ${ev} událostí.` });
  const r = researchOf(state, o);
  if (r.free > 0 && r.done < r.total) out.push({ id: 'research', panel: 'research', tone: 'warn', text: r.free === 1 ? 'Volný výzkumný slot.' : `${r.free} volné výzkumné sloty.` });
  if (!natOf(state, o).cur && focusTree(state, o).some((f) => f.status === 'available')) out.push({ id: 'focus', panel: 'nat', tone: 'warn', text: 'Žádný národní cíl se neplní.' });
  const pp = state.pol.own[o].pp;
  if (pp >= ALERT.PP_HIGH) out.push({ id: 'pp', panel: 'politics', tone: 'warn', text: `Nevyužitá politická moc (${Math.floor(pp)}).` });
  const ind = industryOf(state, o);
  if (!ind.build.length && ind.civAvail >= 1) out.push({ id: 'build', panel: 'industry', tab: 'build', tone: 'warn', text: 'Nic se nestaví, civilní továrny zahálejí.' });
  if (ind.milFree >= ALERT.MIL_IDLE) out.push({ id: 'prod', panel: 'industry', tab: 'prod', tone: 'warn', text: `${ind.milFree} vojenských továren bez zakázky.` });
  return out;
}
