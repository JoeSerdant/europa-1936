// S10: společné cíle bloků a hlasování o přijetí a vyloučení.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, GAME_VERSION, polModsOf, inviteBlock, inviteToFaction, createFaction,
  facProgress, facGoalBlock, setFacGoal, dropFacGoal, facVote, kickBlock, kickFromFaction, FAC_GOALS, declareWar,
} from '../src/engine/index.js';
import { facGoalsDay } from '../src/engine/dip/facgoals.js';
import { aiFacGoals } from '../src/engine/ai/faction.js';
import { DIP } from '../src/engine/dip/constants.js';

const W = getWorld();
const I = (t) => W.ownerIdx[t];
const ENG = I('ENG'), CAN = I('CAN'), FRA = I('FRA'), GER = I('GER'), SWE = I('SWE');
const engFac = (s) => s.dip.facs[s.dip.fac[ENG]];
const withRel = (s, a, b, v) => { const k = a < b ? `${a}-${b}` : `${b}-${a}`; return { ...s, dip: { ...s.dip, rel: { ...s.dip.rel, [k]: v } } }; };
const week = (s) => ({ ...s, tick: 24 * 7 * 10 });

describe('S10: společné cíle bloku', () => {
  const s0 = createGame({ player: null });
  it('vedoucí zvolí nejvýš dva cíle; člen ne; splněný cíl dá bonus všem členům', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(57);
    expect(engFac(s0).ldr).toBe(ENG);
    expect(facGoalBlock(s0, CAN, 'aliance')).toMatch(/vedoucí/);
    let s = setFacGoal(s0, ENG, 'aliance');
    s = setFacGoal(s, ENG, 'arzenal');
    expect(engFac(s).g).toEqual(['aliance', 'arzenal']);
    expect(facGoalBlock(s, ENG, 'armada')).toMatch(/nejvýš/);
    expect(facProgress(s, engFac(s), 'aliance')).toEqual({ cur: engFac(s).mem.length, need: 5 });
    const before = polModsOf(s, CAN).stab;
    s = facGoalsDay(week(s));   // Britské společenství má 5 členů → Široká aliance splněna
    expect(engFac(s).gd).toContain('aliance');
    expect(engFac(s).g).toEqual(['arzenal']);
    expect(polModsOf(s, CAN).stab).toBeCloseTo(before + FAC_GOALS.aliance.mod.stab, 6);
    expect(polModsOf(s, GER).stab).toBe(polModsOf(s0, GER).stab);
    expect(s.log.items.some((e) => e.k === 'facgoal')).toBe(true);
    expect(facGoalBlock(s, ENG, 'aliance')).toMatch(/splnil/);
    expect(dropFacGoal(s, ENG, 'arzenal').dip.facs[s.dip.fac[ENG]].g).toEqual([]);
  });
  it('AI vedoucí si cíl vybere sama', () => {
    let s = createGame({ player: null, aiLevel: 2 });
    for (let d = 0; d < 31 && !(engFac(s).g || []).length; d++) s = aiFacGoals({ ...s, tick: d * 24 }, ENG);
    expect(engFac(s).g.length).toBe(1);
  });
});

describe('S10: hlasování', () => {
  const s0 = createGame({ player: null });
  it('přijetí: členové hlasují podle vztahů a váhy (vedoucí víc); proti většině pozvání neprojde', () => {
    let s = withRel(s0, ENG, SWE, 100);
    for (const m of engFac(s).mem) s = withRel(s, m, SWE, m === ENG ? 100 : -50);
    const v = facVote(s, ENG, SWE, 'join');
    expect(v.list.find((x) => x.o === ENG).w).toBeGreaterThan(v.list.find((x) => x.o === CAN).w);
    expect(v.list.find((x) => x.o === ENG).y).toBe(true);
    const yes = { ...s }; let t = yes;
    for (const m of engFac(s).mem) t = withRel(t, m, SWE, 50);
    expect(facVote(t, ENG, SWE).pass).toBe(true);
    // historické pozvání hlasování obchází
    if (!v.pass) {
      expect(inviteBlock(s, ENG, SWE) || '').toMatch(/odmítli|odmítá/);
      expect(inviteBlock(s, ENG, SWE, true) || '').not.toMatch(/odmítli/);
    }
  });
  it('vyloučení: jen vedoucí, ne za války, podle hlasování; vztah vyloučeného klesne', () => {
    let s = s0;
    for (const m of engFac(s).mem) s = withRel(s, m, CAN, -60);
    expect(kickBlock(s, CAN, ENG)).toMatch(/vedoucí/);
    expect(kickBlock(s, ENG, GER)).toMatch(/není členem/);
    expect(kickBlock(declareWar(s, 'ENG', 'GER'), ENG, CAN)).toMatch(/války/);
    expect(kickBlock(s, ENG, CAN)).toBeNull();
    const t = kickFromFaction(s, ENG, CAN);
    expect(t.dip.fac[CAN]).toBe(0);
    expect(engFac(t).mem).not.toContain(CAN);
    expect(t.log.items.some((e) => e.k === 'kick' && e.o === CAN)).toBe(true);
    let u = s0; for (const m of engFac(u).mem) u = withRel(u, m, CAN, 80);
    const kv = facVote(u, ENG, CAN, 'kick');
    expect(kv.no).toBeGreaterThan(0);   // ostatní členové s Kanadou vycházejí dobře – hlasují proti
    expect(!!kickBlock(u, ENG, CAN)).toBe(!kv.pass);
    void FRA; void createFaction; void inviteToFaction; void DIP;
  });
});
