// Hráč v exilu (F2 B3): kapitulace hráčovy země bez zbylého území hru neukončí – vláda odejde k bojujícímu spojenci (i mimo blok),
// jednotky na jeho území a lodě jí zůstanou a bojuje dál; AI země se chovají jako dřív. Bez hostitele hra končí prohrou.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, declareWar, capitulate, exileHost, validateState, divisionCount } from '../src/engine/index.js';
import { atWar } from '../src/engine/army/war.js';
import { endDay } from '../src/engine/end.js';
import { hasAccess } from '../src/engine/dip/accessCore.js';

const W = getWorld();
const I = (t) => W.ownerIdx[t];
const GER = I('GER'), FRA = I('FRA'), ENG = I('ENG');

/** Německo válčí s Francií a Británií; Německo ovládá celou Francii; dvě francouzské divize stojí v Británii. */
function fall(player) {
  let s = createGame({ player, aiLevel: 2 });
  s = declareWar(declareWar(s, 'GER', 'FRA'), 'GER', 'ENG');
  const ctrl = s.ctrl.slice();
  for (let p = 1; p <= W.L; p++) if (ctrl[p] === FRA) ctrl[p] = GER;
  const divs = s.mil.divs.slice(), moved = [];
  const london = W.owners[ENG].cap;
  for (let id = 1; id < divs.length && moved.length < 2; id++) if (divs[id] && divs[id].o === FRA) { divs[id] = { ...divs[id], p: london, path: [], b: 0, army: 0 }; moved.push(id); }
  return { s: { ...s, ctrl, ownerVer: s.ownerVer + 1, mil: { ...s.mil, divs } }, moved };
}

describe('hráč pokračuje v exilu', () => {
  it('hráčova Francie odejde k Británii, zůstanou jí jednotky v Británii i lodě a bojuje dál', () => {
    const { s, moved } = fall('FRA');
    const fleets = s.nav.fleets.filter((f) => f && f.o === FRA).length;
    const t = capitulate(s, FRA);
    expect(exileHost(t, FRA)).toBe(ENG);
    for (const id of moved) expect(t.mil.divs[id] && t.mil.divs[id].o).toBe(FRA);
    expect(t.nav.fleets.filter((f) => f && f.o === FRA).length).toBe(fleets);
    const stateless = !t.stateOwner.some((x) => x === FRA);
    if (stateless) {   // bez území: exilová vláda bojuje dál po boku Británie
      expect(t.dip.cap[FRA]).toBe(0);
      expect(atWar(t.mil, FRA, GER)).toBe(true);
      expect(atWar(t.mil, FRA, ENG)).toBe(false);
    }
    expect(endDay({ ...t, tick: 24 * 1600 }).end).toBeFalsy();   // hra nekončí
    expect(hasAccess(t.dip, FRA, ENG)).toBe(true);
    expect(validateState(t)).toBeNull();
  });
  it('AI Francie se chová jako dřív (mimo blok s bojujícím spojencem do exilu nejde)', () => {
    const { s } = fall('GER');
    const t = capitulate(s, FRA);
    expect(exileHost(t, FRA)).toBe(0);
    expect(divisionCount(t, 'FRA')).toBe(0);
  });
  it('bez území a bez exilové vlády hra končí prohrou', () => {
    const { s } = fall('FRA');
    const t = capitulate(s, FRA);
    const gone = { ...t, stateOwner: t.stateOwner.map((x) => (x === FRA ? GER : x)), dip: { ...t.dip, exile: t.dip.exile.map((h, o) => (o === FRA ? 0 : h)) } };
    expect(endDay(gone).end.kind).toBe('lose');
  });
});
