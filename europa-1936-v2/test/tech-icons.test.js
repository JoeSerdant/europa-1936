// Výzkum s ikonami (M105): každá technologie má ikonu – výzbroj, nebo jednoduchou ikonu, kterou rozhraní zná.
import { describe, it, expect } from 'vitest';
import { TECHS } from '../src/engine/index.js';
import { techIconOf } from '../src/ui/research/icons.js';
import { EQUIP_ICON_IDS } from '../src/ui/industry/EquipIcon.jsx';
import { DOCKED, FULL } from '../src/ui/army/SidePanel.jsx';

describe('ikony technologií', () => {
  it('všechny technologie mají ikonu; úrovně výzbroje kreslenou výzbroj', () => {
    for (const [id, t] of Object.entries(TECHS)) {
      const ic = techIconOf(id, t);
      expect(ic.eq || ic.icon, id).toBeTruthy();
      if (ic.eq) expect(EQUIP_ICON_IDS).toContain(ic.eq);
    }
    expect(techIconOf('pusky2', TECHS.pusky2)).toEqual({ eq: 'pusky' });
    expect(techIconOf('vyz1', TECHS.vyz1)).toEqual({ icon: 'research' });
  });
  it('okna u kraje jsou podmnožinou oken přes obrazovku a velké stromy zůstávají přes celou obrazovku', () => {
    for (const p of DOCKED) expect(FULL).toContain(p);
    for (const p of ['nat', 'research', 'industry']) expect(DOCKED).not.toContain(p);
  });
});
