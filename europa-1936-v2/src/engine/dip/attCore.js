// Vojenský atašé – čisté jádro bez závislostí (F4), aby bonus mohla číst armáda (`extraMods` v `army/unit.js`) bez cyklu importů.
import { DIP } from './constants.js';

const ATT_MODS = [null, 1, 2, 3].map((n) => (n ? Object.freeze({ atk: n * DIP.ATT_ATK, def: n * DIP.ATT_ATK }) : null));

/** Kolik atašé má u sebe země `o` (podle `dip.att`). */
export function attCount(dip, o) {
  const att = dip && dip.att;
  if (!att || !att.length) return 0;
  let n = 0;
  for (let i = 0; i < att.length; i++) if (att[i].b === o) n++;
  return n;
}

/** Vojenský bonus divizí země `o` od cizích atašé (počítají se nejvýš tři), nebo null. Vrací sdílené objekty (stabilní klíč mezipamětí). */
export const attMods = (dip, o) => ATT_MODS[Math.min(3, attCount(dip, o))];
