// AI: historické strategie (M92). Data v `data/ai/strategies.js`; jen s historickou AI. Duchové se přidávají stejným účinkem jako z událostí (`addSpirit`),
// záloha v týlu se uplatní ve strategii (`decideStrategy` čte `holdBackOf`). Čisté funkce, beze změny vrací tentýž stav.
import { getWorld } from '../world.js';
import { HIST_STRATEGIES } from '../../data/ai/strategies.js';
import { atWar } from '../army/war.js';
import { pairKey } from '../dip/core.js';
import { addSpirit, removeSpirit } from '../nat/spirits.js';

const histOn = (state) => !!(state.ai && state.ai.hist);

/** Dny od začátku války zemí `o` a `t` (nebo −1, když spolu neválčí). */
export function warDays(state, o, t) {
  if (!t || !atWar(state.mil, o, t)) return -1;
  const since = state.dip.since[pairKey(o, t)];
  return since == null ? -1 : (state.tick - since) / 24;
}

/**
 * Denně: duchové ze spouštěčů válek (`war`, `after`, `upto`; trvání od začátku války, takže opakované spuštění nic nemění) a okenní duchové
 * (`from`, `until`, případně jen ve válce se zemí `needWar`; trvají do konce okna). Okenní duch válečný zaniká s koncem té války (`removeSpirit`).
 */
export function histStrategies(state, o) {
  if (!histOn(state)) return state;
  const w = getWorld(), tag = w.owners[o].tag, day = state.tick / 24;
  for (const s of HIST_STRATEGIES) {
    if (s.tag !== tag || !s.spirit) continue;
    if (s.war) {
      const d = warDays(state, o, w.ownerIdx[s.war]);
      if (d < s.after || d >= s.upto) continue;
      const left = s.days ? Math.max(1, Math.round(s.days - d)) : 0;
      state = addSpirit(state, o, s.spirit, left);
    } else if (s.from !== undefined) {
      const foe = s.needWar ? w.ownerIdx[s.needWar] : 0;
      const ok = day >= s.from && day < s.until && (!foe || (atWar(state.mil, o, foe) && !state.dip.cap[foe]));
      const has = !!(state.nat.own[o].sp || {})[s.spirit];
      if (ok) state = addSpirit(state, o, s.spirit, Math.max(1, Math.round(s.until - day)));
      else if (has && s.needWar && day < s.until) state = removeSpirit(state, o, s.spirit);   // válka skončila dřív než okno
    }
  }
  return state;
}

/** Brání země `o` jen (bez útoků) proti někomu ze svých nepřátel podle historické strategie (`defend`)? Vrací množinu takových nepřátel. */
export function defendOnlyOf(state, o) {
  const out = new Set();
  if (!histOn(state)) return out;
  const w = getWorld(), tag = w.owners[o].tag;
  for (const s of HIST_STRATEGIES) {
    if (s.tag !== tag || !s.defend) continue;
    const t = w.ownerIdx[s.war], d = warDays(state, o, t);
    if (d >= s.after && d < s.upto) out.add(t);
  }
  return out;
}

/** Podíl divizí, který země nechává v záloze v týlu (záměrná chyba podle `holdBack`), v daný den hry. */
export function holdBackOf(state, o) {
  if (!histOn(state)) return 0;
  const tag = getWorld().owners[o].tag, day = state.tick / 24;
  let h = 0;
  for (const s of HIST_STRATEGIES) if (s.tag === tag && s.holdBack && day >= (s.from ?? 0) && day <= (s.until ?? Infinity)) h = Math.max(h, s.holdBack);
  return h;
}
