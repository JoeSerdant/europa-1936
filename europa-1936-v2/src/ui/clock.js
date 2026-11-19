// Herní čas po snímcích (F2 A2): hodiny se počítají jako generátor `hourSteps` s přestávkami (po armádách a zemích o půlnoci), takže
// náročná půlnoční hodina se rozloží do více snímků a rozhraní se nezasekne. Výsledek je stejný jako `advance` – mění se jen, kdy se počítá.
// Když se stav mezi snímky změní (příkaz hráče, pauza, rychlost), rozpracovaná hodina se zahodí a spočítá znovu od nového stavu.
import { hourSteps } from '../engine/index.js';

/** Nejvíc nevyřízených herních hodin podle rychlosti (hodin za sekundu): když počítač nestíhá, hra raději zpomalí, než aby se čas hromadil. */
export const backlogMax = (perSecond) => Math.max(1, Math.ceil(perSecond * 0.25));

export function createClock() {
  let job = null;      // rozpracovaná hodina: { gen, base }
  let pending = 0;     // hodiny, které má hra odehrát
  return {
    /** Přidá `hours` k odehrání (nejvýš `max` nevyřízených). */
    add(hours, max) { pending = Math.min(max, pending + hours); },
    /** Zahodí nevyřízené hodiny i rozpracovanou hodinu (pauza, načtení hry). */
    reset() { job = null; pending = 0; },
    get pending() { return pending; },
    get busy() { return !!job; },
    /**
     * Odehraje, co stihne do času `deadline` (podle `now()`); vrací nový stav, nebo tentýž, když se nic nedokončilo.
     * Aspoň jeden krok se udělá vždy, i když je čas už pryč (hra se nezastaví ani na pomalém počítači).
     */
    run(state, now, deadline) {
      if (job && job.base !== state) job = null;
      let s = state, first = true;
      while (pending > 0) {
        if (!job) job = { gen: hourSteps(s), base: s };
        let r = null;
        while (first || now() < deadline) {
          first = false;
          r = job.gen.next();
          if (r.done) break;
        }
        if (!r || !r.done) break;            // pokračuje se v příštím snímku od téhož stavu
        s = r.value; job = null; pending--;
        if (now() >= deadline) break;
      }
      return s;
    },
  };
}
