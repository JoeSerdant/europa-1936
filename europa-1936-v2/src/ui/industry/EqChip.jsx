// Výzbroj jako ikona s počtem (F4g): cena šablony, potřeba praporu, sklad. Barva podle skupiny výzbroje (`EQUIP_GROUPS`).
import { EquipIcon } from './EquipIcon.jsx';
import { EQUIP_GROUPS } from '../../data/industry/groups.js';
import { fmtInt } from '../format.js';

export const eqColor = (e) => (EQUIP_GROUPS.find((g) => g.items.includes(e)) || EQUIP_GROUPS[0]).color;

/** Štítek výzbroje: kreslená ikona a počet; `lack` = chybí (červeně). */
export function EqChip({ e, n, lack, title }) {
  return (
    <span className={`eq-chip ${lack ? 'lack' : ''}`} title={title}>
      <EquipIcon eq={e} size={24} color={eqColor(e)} /><b>{fmtInt(n)}</b>
    </span>
  );
}
