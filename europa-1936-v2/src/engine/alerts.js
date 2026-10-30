// Upozornění pro hráče (M49): co zrovna zahálí nebo čeká na rozhodnutí. Čistá funkce stavu, nic se neukládá.
// Každé upozornění: { id, panel, tab?, tone, text }; `panel` je okno, které problém řeší.
import { getWorld } from './world.js';
import { researchOf } from './research/selectors.js';
import { focusTree, natOf, pendingEvents } from './nat/selectors.js';
import { industryOf } from './industry/selectors.js';
import { hasCapitulated } from './dip/core.js';
import { decisionsOf } from './nat/decisions.js';

export const ALERT = { PP_HIGH: 150, PP_HIGH_LATE: 250, CIV_IDLE: 1, MIL_IDLE: 2 };

/** Seznam upozornění pro zemi `o` (index nebo tag); pro neplatnou nebo kapitulovanou zemi prázdný. */
export function alertsOf(state, o) {
  const w = getWorld();
  o = typeof o === 'string' ? w.ownerIdx[o] : o;
  if (!Number.isInteger(o) || o < 1 || o >= w.owners.length || hasCapitulated(state, o)) return [];
  const out = [];
  const ev = pendingEvents(state, o).length;
  if (ev) out.push({ id: 'event', panel: 'nat', tone: 'info', n: ev, text: ev === 1 ? 'Čeká na vás událost.' : `Čeká na vás ${ev} událostí.`, lines: [] });
  const r = researchOf(state, o);
  if (r.free > 0 && r.done < r.total) out.push({ id: 'research', panel: 'research', tone: 'warn', n: r.free, text: r.free === 1 ? 'Volný výzkumný slot.' : `${r.free} volné výzkumné sloty.`, lines: ['Přiřaďte obor k výzkumu, jinak se zbytečně nevyužívá kapacita.'] });
  if (!natOf(state, o).cur && focusTree(state, o).some((f) => f.status === 'available')) out.push({ id: 'focus', panel: 'nat', tone: 'warn', n: 1, text: 'Žádný národní cíl se neplní.', lines: ['Vyberte národní cíl, získáte bonusy a nové možnosti.'] });
  const pp = state.pol.own[o].pp;
  if (pp >= ALERT.PP_HIGH) out.push({ id: 'pp', panel: 'politics', tone: 'warn', n: Math.floor(pp), text: `Nevyužitá politická moc (${Math.floor(pp)}).`, lines: ['Utraťte ji za zákony, poradce, rozhodnutí nebo diplomacii.'] });
  const ind = industryOf(state, o);
  if (!ind.build.length && ind.civAvail >= 1) out.push({ id: 'build', panel: 'industry', tab: 'build', tone: 'warn', n: 1, text: 'Nic se nestaví, civilní továrny zahálejí.', lines: [`Volné civilní kapacity: ${Math.floor(ind.civAvail)} továren.`] });
  if (ind.milFree >= ALERT.MIL_IDLE) out.push({ id: 'prod', panel: 'industry', tab: 'prod', tone: 'warn', n: ind.milFree, text: `${ind.milFree} vojenských továren bez zakázky.`, lines: ['Přidejte výrobní linku, jinak továrny nic nevyrábějí.'] });
  let loose = 0;
  for (let d = 1; d < state.mil.divs.length; d++) { const dv = state.mil.divs[d]; if (dv && dv.o === o && !dv.army) loose++; }
  if (loose) out.push({ id: 'divs', panel: 'army', tone: 'warn', n: loose, text: loose === 1 ? 'Jedna divize nemá přidělenou armádu.' : `${loose} divizí nemá přidělenou armádu.`, lines: ['Divize bez armády nemají velitele ani plán. Přiřaďte je v panelu Armáda.'] });
  const dec = decisionsOf(state, o).filter((x) => !x.block && !x.used);
  if (dec.length) out.push({ id: 'decisions', panel: 'decisions', tone: 'info', n: dec.length, text: dec.length === 1 ? 'K dispozici je rozhodnutí.' : `K dispozici je ${dec.length} rozhodnutí.`, lines: dec.slice(0, 8).map((x) => x.n) });
  return out;
}
