// S4: mechaniky jednotlivých zemí – ukazatele, pásma jako národní duchové, historické kroky AI a rozhodnutí hráče.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, GAME_VERSION, validateState, takeDecision, decisionBlock } from '../src/engine/index.js';
import { MECHS, MECH_IDS } from '../src/data/nat/mechanics.js';
import { SPIRITS } from '../src/data/nat/spirits.js';
import { DECISIONS } from '../src/data/nat/decisions.js';
import { mechDay, mechsOf, mechBand, shiftMech } from '../src/engine/nat/mech.js';

const W = getWorld();
const I = (t) => W.ownerIdx[t];
const at = (s, day) => ({ ...s, tick: day * 24 });
const withPp = (s, o, pp) => { const own = s.pol.own.slice(); own[o] = { ...own[o], pp }; return { ...s, pol: { ...s.pol, own } }; };

describe('S4: data mechanik', () => {
  it('země existují, pásma odkazují na duchy, každá mechanika má rozhodnutí hráče', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(58);
    for (const id of MECH_IDS) {
      const M = MECHS[id];
      expect(I(M.tag), id).toBeTruthy();
      for (const b of M.bands) if (b.spirit) expect(SPIRITS[b.spirit], `${id}: ${b.spirit}`).toBeTruthy();
      expect(M.bands[M.bands.length - 1].min).toBe(0);
      expect(DECISIONS.some((d) => d.fx.some((e) => e.t === 'mech' && e.id === id)), id).toBe(true);
      expect(DECISIONS.filter((d) => d.fx.some((e) => e.t === 'mech')).every((d) => !d.ai)).toBe(true);
    }
  });
});

describe('S4: ukazatel a pásma', () => {
  const s0 = createGame({ player: null, aiLevel: 2 });
  const SOV = I('SOV'), USA = I('USA');
  it('ukazatel je ve stavu; duch odpovídá pásmu a s ukazatelem se mění', () => {
    expect(s0.nat.mech.purge).toBe(MECHS.purge.start);
    expect(validateState(s0)).toBeNull();
    let s = mechDay(s0);
    expect('cistky' in s.nat.own[SOV].sp).toBe(true);
    s = mechDay(shiftMech(s, 'purge', 30));
    expect('velky_teror' in s.nat.own[SOV].sp).toBe(true);
    expect('cistky' in s.nat.own[SOV].sp).toBe(false);
    s = mechDay(shiftMech(s, 'purge', -80));
    expect(mechBand('purge', s.nat.mech.purge).spirit).toBe('');
    expect('velky_teror' in s.nat.own[SOV].sp || 'cistky' in s.nat.own[SOV].sp).toBe(false);
    expect(mechsOf(s, SOV)[0]).toMatchObject({ id: 'purge', active: true });
  });
  it('historický krok AI nastane v daný den; hráčova země ho nedostane', () => {
    const [d, dv] = MECHS.usa_iso.hist[0];
    const s = mechDay(at(s0, d));
    expect(s.nat.mech.usa_iso).toBe(MECHS.usa_iso.start + dv);
    const p = mechDay(at(createGame({ player: 'USA', aiLevel: 2 }), d));
    expect(p.nat.mech.usa_iso).toBe(MECHS.usa_iso.start);
    expect('izolacionismus' in mechDay(s0).nat.own[USA].sp).toBe(true);
  });
  it('rozhodnutí hráče posune ukazatel', () => {
    const CHI = I('CHI');
    let s = withPp(createGame({ player: 'CHI' }), CHI, 200);
    expect(decisionBlock(s, CHI, 'chi_jednotna_fronta')).toBeNull();
    s = takeDecision(s, CHI, 'chi_jednotna_fronta');
    expect(s.nat.mech.chi_unity).toBe(MECHS.chi_unity.start + 15);
  });
});
