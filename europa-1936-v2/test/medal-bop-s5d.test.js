// S5d: vyznamenání divizí a rovnováha sil velmocí.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, GAME_VERSION, validateState, medalBlock, awardMedal, medalCap, medalBonus, MEDALS, MEDAL, takeDecision } from '../src/engine/index.js';
import { MECHS } from '../src/data/nat/mechanics.js';
import { mechDay } from '../src/engine/nat/mech.js';

const W = getWorld();
const GER = W.ownerIdx.GER, ITA = W.ownerIdx.ITA, FRA = W.ownerIdx.FRA;
const withCp = (s, o, v) => { const cp = s.cmd.cp.slice(); cp[o] = v; return { ...s, cmd: { ...s.cmd, cp } }; };
const withXp = (s, id, xp) => { const divs = s.mil.divs.slice(); divs[id] = { ...divs[id], xp }; return { ...s, mil: { ...s.mil, divs } }; };

describe('S5d: vyznamenání', () => {
  const s0 = withCp(createGame({ player: 'GER' }), GER, 100);
  const id = s0.mil.divs.findIndex((d) => d && d.o === GER);
  it('jen zkušená divize, za velitelskou moc, jedno na divizi; dává bonus v boji', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(62);
    expect(medalBlock(withXp(s0, id, 0), GER, id, 'statecnost')).toMatch(/Zkušení/);
    const s1 = withXp(s0, id, 0.9);
    expect(medalBlock(withCp(s1, GER, 0), GER, id, 'statecnost')).toMatch(/velitelská/);
    const s = awardMedal(s1, GER, id, 'statecnost');
    expect(s.mil.divs[id].md).toBe('statecnost');
    expect(s.cmd.cp[GER]).toBe(100 - MEDAL.CP);
    expect(medalBlock(s, GER, id, 'vytrvalost')).toMatch(/už/);
    expect(medalBonus(s.mil.divs[id]).atk).toBe(MEDALS.statecnost.atk);
    expect(medalCap(s.mil, GER)).toBeGreaterThanOrEqual(MEDAL.BASE);
    expect(validateState(s)).toBeNull();
  });
});

describe('S5d: rovnováha sil', () => {
  it('velmoci mají ukazatel s pásmy; historický krok (pád režimu v Itálii) přepne ducha', () => {
    const s0 = createGame({ player: null, aiLevel: 2 });
    for (const id of ['eng_bop', 'fra_bop', 'ger_bop', 'ita_bop']) expect(s0.nat.mech[id]).toBe(MECHS[id].start);
    let s = mechDay(s0);
    expect('rezim_strany' in s.nat.own[ITA].sp).toBe(true);
    s = mechDay({ ...s, tick: MECHS.ita_bop.hist[0][0] * 24 });
    expect('moc_koruny' in s.nat.own[ITA].sp).toBe(true);
    expect('rezim_strany' in s.nat.own[ITA].sp).toBe(false);
  });
  it('hráč posouvá rovnováhu rozhodnutím', () => {
    let s = createGame({ player: 'FRA' });
    const own = s.pol.own.slice(); own[FRA] = { ...own[FRA], pp: 200 }; s = { ...s, pol: { ...s.pol, own } };
    s = takeDecision(s, FRA, 'fra_bop_reformy');
    expect(s.nat.mech.fra_bop).toBe(MECHS.fra_bop.start + 15);
  });
});
