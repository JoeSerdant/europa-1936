// Denní krok diplomacie (M23): kapitulace zemí, zapomínání změn vztahů v míru, vypršení ospravedlnění.
import { getWorld } from '../world.js';
import { hasWar } from '../army/war.js';
import { DIP } from './constants.js';
import { vpHeld } from './core.js';
import { capitulate } from './capitulate.js';
import { subjectsDay } from './subjects.js';
import { accessDay } from './access.js';

export function dipDay(state) {
  const w = getWorld();
  state = subjectsDay(state);
  // kapitulace
  for (let o = 1; o < w.owners.length; o++) {
    if (state.dip.cap[o] || !hasWar(state.mil, o)) continue;
    const h = vpHeld(state, o);
    if (h.total && (h.share >= DIP.CAP_SHARE || (h.capHeld && h.share >= DIP.CAP_CAPITAL_SHARE))) state = capitulate(state, o);
  }
  // vypršelá ospravedlnění
  let just = state.dip.just;
  const live = just.filter((j) => state.tick - j.ready <= DIP.JUST_KEEP * 24);
  if (live.length !== just.length) just = live;
  // zapomínání změn vztahů mezi zeměmi, které spolu nejsou ve válce
  let rel = state.dip.rel, relCopy = false;
  for (const k in rel) {
    const [a, b] = k.split('-').map(Number);
    if (state.mil.wars.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) continue;
    const v = rel[k], nv = Math.abs(v) <= DIP.REL_FORGET ? 0 : v - Math.sign(v) * DIP.REL_FORGET;
    if (nv !== v) { if (!relCopy) { rel = { ...rel }; relCopy = true; } if (nv === 0) delete rel[k]; else rel[k] = nv; }
  }
  if (just !== state.dip.just || rel !== state.dip.rel) state = { ...state, dip: { ...state.dip, just, rel } };
  return accessDay(state);   // M67: dohody s kapitulovanými a válečnými protivníky zaniknou, cizinci bez práva na cizím území odejdou domů
}
