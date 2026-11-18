// Ikona technologie (M105): odvozená z účinků – úroveň výzbroje = kreslená ikona výzbroje, bonusy = ikona podle druhu (čistá funkce, test `test/tech-icons.test.js`).
import { EQUIP_ICON_IDS } from '../industry/EquipIcon.jsx';

// odemčení nových jednotek podle id technologie (účinek je jen „odemyká“)
const UNLOCK_EQ = { mtank: 'mtanky', htank: 'htanky', mech: 'auta', strbomb: 'str', rakety: 'rak', vysadek: 'pusky', spoj: 'podpora', log: 'auta', nem: 'podpora' };
// bonus → ikona (`Icon`), první shoda vyhrává
const MOD_ICON = [
  ['research', 'research'], ['slot', 'research'], ['build', 'build'], ['extract', 'industry'], ['effCap', 'industry'], ['fuel', 'supply'],
  ['air', 'air'], ['nav', 'navy'], ['supUse', 'supply'], ['speed', 'speed'], ['orgRegen', 'flag'], ['planGain', 'target'], ['planCap', 'target'],
  ['def', 'shield'], ['atk', 'attack'], ['hill', 'regions'],
];
const CAT_ICON = { pesi: 'army', zbran: 'attack', tanky: 'attack', podpora: 'supply', letectvo: 'air', prumysl: 'industry', namor: 'navy', elektro: 'eye' };

/** { eq } = kreslená výzbroj, nebo { icon } = jednoduchá ikona. */
export function techIconOf(id, t) {
  const fx = t.fx || {};
  const lv = fx.lv ? Object.keys(fx.lv)[0] : '';
  if (lv && EQUIP_ICON_IDS.includes(lv)) return { eq: lv };
  if (UNLOCK_EQ[id]) return { eq: UNLOCK_EQ[id] };
  if (/^jadro/.test(id)) return { icon: 'regions' };
  const keys = [...Object.keys(fx.mod || {}), ...Object.keys(fx.army || {}), ...(fx.slot ? ['slot'] : [])];
  for (const [k, icon] of MOD_ICON) if (keys.some((x) => x === k || x.startsWith(k))) return { icon };
  return { icon: CAT_ICON[t.cat] || 'research' };
}
