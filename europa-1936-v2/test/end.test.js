import { describe, it, expect } from 'vitest';
import { createGame, getWorld, advance, standing, endDay, ackEnd, forceEnd, END, capitulate, runCheat, packGame, unpackGame, makePuppet } from '../src/engine/index.js';

const W = getWorld();
const GER = W.ownerIdx.GER, POL = W.ownerIdx.POL;
const g = () => createGame({ player: 'GER' });

describe('konec hry', () => {
  it('postavení hráče: podíl a pořadí jsou rozumná čísla', () => {
    const st = standing(g());
    expect(st.share).toBeGreaterThan(0.02);
    expect(st.share).toBeLessThan(0.5);
    expect(st.rank).toBeGreaterThanOrEqual(1);
    expect(st.rank).toBeLessThan(10);
    expect(standing(createGame()).me).toBe(0);
  });
  it('na začátku hra neskončí; pozorovatel konec nemá', () => {
    const s = advance(g(), 24 * 5);
    expect(s.end).toBe(null);
    expect(endDay(createGame())).toEqual(createGame());
  });
  it('porážka po kapitulaci hráče; loutka porážku nemá', () => {
    let s = capitulate({ ...g(), tick: 24 }, GER);
    s = endDay(s);
    expect(s.end).toMatchObject({ kind: 'lose', ack: 0 });
    expect(s.paused).toBe(true);
    const p = { ...g(), tick: 24 };
    const puppet = { ...p, dip: { ...p.dip, cap: p.dip.cap.map((c, i) => (i === GER ? 1 : c)) } };
    expect(endDay(makePuppet(puppet, POL, GER)).end).toBe(null);
  });
  it('vítězství při podílu světa nad hranicí a konec času s hodnocením', () => {
    const w = g();
    const ctrl = w.ctrl.map(() => GER);
    const win = endDay({ ...w, ctrl, tick: 24 });
    expect(win.end).toMatchObject({ kind: 'win' });
    expect(win.end.score).toBeGreaterThan(500);
    const time = endDay({ ...w, tick: END.TICK });
    expect(time.end).toMatchObject({ kind: 'time', rank: expect.any(Number) });
  });
  it('potvrzení umožní pokračovat a konec se nevyhodnocuje znovu', () => {
    const s = forceEnd(g(), 'time');
    expect(s.end.ack).toBe(0);
    const a = ackEnd(s);
    expect(a.end.ack).toBe(1);
    expect(ackEnd(a)).toBe(a);
    expect(forceEnd(s, 'win')).toBe(s);
    expect(forceEnd(g(), 'blabla').end).toBe(null);
    const later = advance({ ...a, paused: false }, 24 * 3);
    expect(later.end).toBe(a.end);
  });
  it('cheat end a uložení', () => {
    const s = runCheat(g(), 'end win').state;
    expect(s.end.kind).toBe('win');
    expect(runCheat(s, 'end lose').state).toBe(s);
    expect(unpackGame(JSON.parse(JSON.stringify(packGame(s)))).state.end.kind).toBe('win');
  });
});
