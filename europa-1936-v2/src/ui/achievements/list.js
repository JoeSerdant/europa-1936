// Úspěchy (M86): seznam jako data. Každý úspěch má název, popis a čistý test nad stavem hry a zemí hráče (`me` = index). Vlastní texty.
// Úspěchy nejsou součástí herního stavu: splněné se pamatují v prohlížeči (`store.js`) napříč hrami.
import { getWorld } from '../../engine/world.js';
import { industryOf } from '../../engine/industry/selectors.js';
import { divisionCount } from '../../engine/army/selectors.js';

const mineLog = (g, me, k, extra = () => true) => g.log.items.some((e) => e.k === k && e.o === me && extra(e));
const day = (g) => g.tick / 24;

export const ACHIEVEMENTS = [
  { id: 'stavitel', n: 'Stavitel', info: 'Dokončete první stavbu.', test: (g, me) => mineLog(g, me, 'built') },
  { id: 'vedec', n: 'Věk vědy', info: 'Mějte hotových 25 technologií.', test: (g, me) => Object.keys(g.tech.own[me].done).length >= 25 },
  { id: 'vizionar', n: 'Vizionář', info: 'Splňte 8 národních cílů.', test: (g, me) => Object.keys(g.nat.own[me].done).length >= 8 },
  { id: 'prumysl', n: 'Průmyslová velmoc', info: 'Vlastněte 100 továren a loděnic.', test: (g, me) => { const x = industryOf(g, me); return x.civ + x.mil + x.dok >= 100; } },
  { id: 'armada', n: 'Miliónová armáda', info: 'Mějte 80 divizí.', test: (g, me) => divisionCount(g, me) >= 80 },
  { id: 'loutkar', n: 'Loutkář', info: 'Mějte loutkový stát.', test: (g, me) => g.dip.sub.some((o) => o === me) },
  { id: 'blok', n: 'Vůdce bloku', info: 'Veďte blok aspoň se čtyřmi členy.', test: (g, me) => { const f = g.dip.facs[g.dip.fac[me]]; return !!f && f.ldr === me && f.mem.length >= 4; } },
  { id: 'diplomat', n: 'Kus papíru', info: 'Uzavřete pakt o neútočení.', test: (g, me) => (g.dip.nap || []).some((x) => x.a === me || x.b === me) },
  { id: 'vylodeni', n: 'Den D', info: 'Úspěšně vyloďte divizi na nepřátelském pobřeží.', test: (g, me) => mineLog(g, me, 'landing', (e) => e.a === 1 && g.stateOwner[getWorld().provState[e.x]] !== me) },
  { id: 'vysadek', n: 'Z nebe', info: 'Proveďte úspěšný letecký výsadek.', test: (g, me) => mineLog(g, me, 'drop', (e) => e.a === 1) },
  { id: 'letadlovka', n: 'Vládce moří', info: 'Mějte tři letadlové lodě.', test: (g, me) => (g.nav.pool[me].cv || 0) + g.nav.fleets.reduce((a, f) => a + (f && f.o === me ? f.ships.cv || 0 : 0), 0) >= 3 },
  { id: 'eso', n: 'Rudý baron', info: 'Mějte křídlo s esy nejvyššího stupně.', test: (g, me) => g.air.wings.some((wg) => wg && wg.o === me && (wg.a || 0) >= 3) },
  { id: 'atom', n: 'Ničitel světů', info: 'Vyrobte atomovou bombu.', test: (g, me) => (g.air.nuke[me] ? g.air.nuke[me].n : 0) >= 1 || mineLog(g, me, 'nuke') },
  { id: 'exil', n: 'Útočiště', info: 'Přijměte exilovou vládu spojence.', test: (g, me) => (g.dip.exile || []).some((h) => h === me) },
  { id: 'stabilita', n: 'Pevná ruka', info: 'Dosáhněte stability 90 %.', test: (g, me) => g.pol.own[me].stab >= 0.9 },
  { id: 'prezil', n: 'Až do konce', info: 'Dožijte se roku 1945, aniž byste kapitulovali.', test: (g, me) => day(g) >= 3288 && !g.dip.cap[me] },
  { id: 'vitez', n: 'Vítěz', info: 'Vyhrajte hru.', test: (g) => !!g.end && g.end.kind === 'win' },
];
export const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

/** Id úspěchů, které stav hry právě splňuje (pozorovatel žádné nemá). Chyba v testu úspěch jen nesplní. */
export function achievedNow(game, me) {
  if (!game || !me) return [];
  const out = [];
  for (const a of ACHIEVEMENTS) { try { if (a.test(game, me)) out.push(a.id); } catch { /* neúplný stav: úspěch se nepočítá */ } }
  return out;
}
