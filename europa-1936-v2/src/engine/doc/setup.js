// Počáteční doktríny: každá země začíná s malou zásobou zkušeností a bez doktrín.
import { DOC } from './constants.js';

export function createDoc(w) {
  const own = [null];
  for (let o = 1; o < w.owners.length; o++) own.push({ xp: { land: DOC.XP_START, air: DOC.XP_START, sea: DOC.XP_START }, done: {}, track: {}, c: { land: 0, air: 0, sea: 0 } });
  return { ver: 0, own };
}
