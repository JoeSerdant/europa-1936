import { describe, it, expect } from 'vitest';
import { createGame, getWorld, runCheat, TECH_IDS } from '../src/engine/index.js';

const W = getWorld();
const GER = W.ownerIdx.GER;

describe('konzole cheatů', () => {
  const s0 = createGame({ player: 'GER' });
  it('pp, manpower, stab a ws mění hodnoty hráče', () => {
    expect(runCheat(s0, 'pp 500').state.pol.own[GER].pp).toBe(s0.pol.own[GER].pp + 500);
    expect(runCheat(s0, 'manpower 1000').state.mil.man[GER]).toBe(s0.mil.man[GER] + 1000);
    expect(runCheat(s0, 'stab 80').state.pol.own[GER].stab).toBeCloseTo(0.8);
    expect(runCheat(s0, 'ws 120').state.pol.own[GER].ws).toBe(1);
  });
  it('research all dokončí všechny technologie', () => {
    const r = runCheat(s0, 'research all').state;
    expect(TECH_IDS.every((id) => r.tech.own[GER].done[id])).toBe(true);
    expect(runCheat(r, 'research pusky2').state).toBe(r);
  });
  it('equip, tag, war a peace', () => {
    expect(runCheat(s0, 'equip pusky 10').state.mil.stock[GER].pusky).toBe(s0.mil.stock[GER].pusky + 10);
    expect(runCheat(s0, 'tag fra').state.player).toBe('FRA');
    const war = runCheat(s0, 'war POL').state;
    expect(war.mil.wars.length).toBe(s0.mil.wars.length + 1);
    expect(runCheat(war, 'peace POL').state.mil.wars.length).toBe(s0.mil.wars.length);
  });
  it('ic dokončí rozpracované stavby při dalším dni', () => {
    const b = { ...s0, ind: { ...s0.ind, build: [{ id: 99, o: GER, s: 1, k: 'civ', prog: 0 }] } };
    const r = runCheat(b, 'ic').state;
    expect(r.ind.build[0].prog).toBeGreaterThan(0);
  });
  it('neplatný vstup vrací tentýž stav s hláškou', () => {
    for (const t of ['', 'blabla', 'pp x', 'tag XXX', 'research nic', 'equip nic 5', 'speed 9', 'ai 7']) {
      const r = runCheat(s0, t);
      expect(r.state).toBe(s0);
    }
    expect(runCheat(s0, 'help').msg).toContain('research all');
    expect(runCheat({ ...s0, player: null }, 'pp 5').state.player).toBe(null);
  });
});
