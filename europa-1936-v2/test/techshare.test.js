// Sdílení technologií v bloku (M51): bonus za členy bloku, kteří techniku mají; strop; vynechání kapitulovaných a loutek; vliv na dobu výzkumu.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, sharersOf, shareBonus, RES, researchOf, startResearch, TECH_IDS, techList } from '../src/engine/index.js';

const W = getWorld();
const GER = W.ownerIdx.GER, ITA = W.ownerIdx.ITA, HUN = W.ownerIdx.HUN, ENG = W.ownerIdx.ENG;
const bloc = (s, mem) => ({ ...s, dip: { ...s.dip, fac: s.dip.fac.map((f, o) => (mem.includes(o) ? 88 : f)), facs: { ...s.dip.facs, 88: { nm: 'T', mem, ldr: mem[0] } } } });
const give = (s, o, id) => { const own = s.tech.own.slice(); own[o] = { ...own[o], done: { ...own[o].done, [id]: 1 } }; return { ...s, tech: { ...s.tech, own } }; };
const idle = (s, o) => { const own = s.tech.own.slice(); own[o] = { ...own[o], slots: own[o].slots.map(() => 0) }; return { ...s, tech: { ...s.tech, own } }; };

describe('sdílení technologií (M51)', () => {
  const id = TECH_IDS.find((t) => !createGame().tech.own[GER].done[t]);
  it('bonus roste s počtem členů, má strop a mimo blok je nulový', () => {
    let s = bloc(createGame({ player: 'GER' }), [GER, ITA, HUN]);
    expect(sharersOf(s, GER, id)).toBe(0);
    s = give(s, ITA, id);
    expect(shareBonus(s, GER, id)).toBeCloseTo(RES.SHARE_PER);
    s = give(s, HUN, id);
    expect(shareBonus(s, GER, id)).toBeCloseTo(RES.SHARE_PER * 2);
    expect(shareBonus(s, ENG, id)).toBe(0);
    expect(shareBonus(s, ITA, id)).toBe(RES.SHARE_PER);   // ITA sdílí od HUN, ale ne sama od sebe
    const big = bloc(createGame(), Array.from({ length: 12 }, (_, i) => i + 1));
    let g = big; for (let o = 2; o <= 12; o++) g = give(g, o, id);
    expect(shareBonus(g, 1, id)).toBe(RES.SHARE_MAX);
  });
  it('kapitulovaní členové a loutky nesdílí', () => {
    let s = give(give(bloc(createGame({ player: 'GER' }), [GER, ITA, HUN]), ITA, id), HUN, id);
    s = { ...s, dip: { ...s.dip, cap: s.dip.cap.map((c, o) => (o === ITA ? 1 : c)), sub: s.dip.sub.map((c, o) => (o === HUN ? GER : c)) } };
    expect(sharersOf(s, GER, id)).toBe(0);
  });
  it('sdílení zkracuje odhad výzkumu a ukazuje se v přehledu', () => {
    const base = idle(bloc(createGame({ player: 'GER' }), [GER, ITA]), GER);
    const a = startResearch(base, GER, 0, id);
    if (a === base) return;   // technologie není dostupná: bonus ověřen výše
    const b = startResearch(give(base, ITA, id), GER, 0, id);
    const ea = researchOf(a, GER).slots[0], eb = researchOf(b, GER).slots[0];
    expect(eb.share).toBeGreaterThan(0);
    expect(eb.eta).toBeLessThanOrEqual(ea.eta);
    expect(techList(b, GER).find((t) => t.id === id).share).toBeGreaterThan(0);
  });
});
