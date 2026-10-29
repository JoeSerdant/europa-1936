// Velitelská moc a schopnosti armád (M53): přírůstek, použití, vypršení, vliv na bonusy, AI, cheat.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, advance, useAbility, abilityBlock, abilityOf, abilityMods, ABILITIES, CMD, runCheat, validateState, aiCommand, declareWar } from '../src/engine/index.js';
import { modsOf } from '../src/engine/army/unit.js';
import { openCtx } from '../src/engine/army/ctx.js';

const W = getWorld();
const GER = W.ownerIdx.GER;
const game = () => createGame({ player: 'GER' });
const armyOf = (s) => { for (let i = 1; i < s.mil.armies.length; i++) if (s.mil.armies[i] && s.mil.armies[i].o === GER && s.mil.divs.some((d) => d && d.army === i)) return i; return 0; };

describe('velitelská moc (M53)', () => {
  it('začíná na CMD.START a denně roste až do stropu', () => {
    let s = game();
    expect(s.cmd.cp[GER]).toBe(CMD.START);
    s = advance(s, 24 * 10);
    expect(s.cmd.cp[GER]).toBeCloseTo(CMD.START + 10 * CMD.PER_DAY);
    s = advance({ ...s, cmd: { ...s.cmd, cp: s.cmd.cp.map((v, o) => (o ? CMD.MAX - 0.5 : 0)) } }, 24 * 3);
    expect(s.cmd.cp[GER]).toBe(CMD.MAX);
    expect(validateState(s)).toBeNull();
  });
  it('schopnost stojí moc, platí zadaný čas, nejde dvakrát a pak vyprší', () => {
    const s = game(), a = armyOf(s);
    expect(a).toBeGreaterThan(0);
    const t = useAbility(s, GER, a, 'force_attack');
    expect(t.cmd.cp[GER]).toBe(CMD.START - ABILITIES.force_attack.cost);
    expect(abilityOf(t, a)).toBeTruthy();
    expect(abilityBlock(t, GER, a, 'last_stand')).toMatch(/aktivní/);
    expect(useAbility(t, GER, a, 'last_stand')).toBe(t);
    const u = advance(t, 24 * (ABILITIES.force_attack.days + 1));
    expect(abilityOf(u, a)).toBeNull();
    expect(u.cmd.ab.length).toBe(0);
  });
  it('neplatné vstupy vrací tentýž stav', () => {
    const s = game(), a = armyOf(s);
    expect(useAbility(s, GER, a, 'nic')).toBe(s);
    expect(useAbility(s, GER, 99999, 'force_attack')).toBe(s);
    expect(useAbility(s, W.ownerIdx.FRA, a, 'force_attack')).toBe(s);
    const poor = { ...s, cmd: { ...s.cmd, cp: s.cmd.cp.map(() => 0) } };
    expect(abilityBlock(poor, GER, a, 'force_attack')).toMatch(/Chybí/);
    expect(useAbility(poor, GER, a, 'force_attack')).toBe(poor);
  });
  it('schopnost mění bonusy divizí armády', () => {
    const s = game(), a = armyOf(s);
    const d = s.mil.divs.findIndex((x) => x && x.army === a);
    const t = useAbility(s, GER, a, 'force_attack');
    const before = modsOf(openCtx(s), s.mil.divs[d]), after = modsOf(openCtx(t), t.mil.divs[d]);
    expect(after.atk - before.atk).toBeCloseTo(ABILITIES.force_attack.mods.atk);
    expect(after.def - before.def).toBeCloseTo(ABILITIES.force_attack.mods.def);
    expect(abilityMods(t, a)).toBe(ABILITIES.force_attack.mods);
    expect(abilityMods(s, a)).toBeNull();
  });
  it('cheat cp a AI v míru nic nedělá', () => {
    const s = game();
    const r = runCheat(s, 'cp 30');
    expect(r.state.cmd.cp[GER]).toBe(CMD.START + 30);
    expect(runCheat(s, 'cp x').state).toBe(s);
    expect(aiCommand(s, W.ownerIdx.FRA)).toBe(s);
  });
  it('dlouhá hra s AI ve válce doběhne s platným stavem', () => {
    let s = declareWar(createGame({ player: null, aiLevel: 2 }), 'GER', 'POL');
    s = advance(s, 24 * 60);
    expect(validateState(s)).toBeNull();
    expect(s.cmd.cp.every((v) => v >= 0 && v <= CMD.MAX)).toBe(true);
  });
});
