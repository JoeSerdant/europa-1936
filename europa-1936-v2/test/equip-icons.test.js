// Výroba jako v HOI4 (M104): každá výzbroj, letoun i loď má vlastní kreslenou ikonu a patří do skupiny na obrazovce Výroba (jinak by ji nešlo založit).
import { describe, it, expect } from 'vitest';
import { EQUIP_PROD, PLANES, SHIPS } from '../src/engine/index.js';
import { EQUIP_ICON_IDS } from '../src/ui/industry/EquipIcon.jsx';
import { EQUIP_GROUPS } from '../src/data/industry/groups.js';

describe('ikony a skupiny výzbroje', () => {
  it('všechna vyráběná výzbroj, letouny a lodě mají ikonu a skupinu', () => {
    const all = [...Object.keys(EQUIP_PROD), ...Object.keys(PLANES), ...Object.keys(SHIPS)];
    const grouped = new Set(EQUIP_GROUPS.flatMap((g) => g.items));
    for (const id of all) {
      expect(EQUIP_ICON_IDS, id).toContain(id);
      expect(grouped.has(id), id).toBe(true);
    }
  });
});
