import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, takeDecision, decisionBlock, decisionsOf, DECISIONS, DECISION_BY_ID, declareWar, packGame, unpackGame, industryOf, docMods,
} from '../src/engine/index.js';

const W = getWorld();
const GER = W.ownerIdx.GER, FRA = W.ownerIdx.FRA;
const withPp = (s, o, pp) => ({ ...s, pol: { ...s.pol, own: s.pol.own.map((x, i) => (i === o ? { ...x, pp } : x)) } });

describe('rozhodnutí', () => {
  const s0 = withPp(createGame({ player: 'GER' }), GER, 500);
  it('data: unikátní id, cena a obnovení kladné, účinky neprázdné', () => {
    expect(new Set(DECISIONS.map((d) => d.id)).size).toBe(DECISIONS.length);
    for (const d of DECISIONS) { expect(d.cost).toBeGreaterThan(0); expect(d.cd).toBeGreaterThan(0); expect(d.fx.length).toBeGreaterThan(0); }
  });
  it('použití zaplatí politickou moc, provede účinky a spustí obnovení', () => {
    const before = industryOf(s0, GER).mil;
    const s = takeDecision(s0, GER, 'zbrojni_pujcka');
    expect(s.pol.own[GER].pp).toBe(500 - DECISION_BY_ID.zbrojni_pujcka.cost);
    expect(industryOf(s, GER).mil).toBe(before + 1);
    expect(s.pol.own[GER].stab).toBeLessThan(s0.pol.own[GER].stab);
    expect(decisionBlock(s, GER, 'zbrojni_pujcka')).toMatch(/Dostupné za 180/);
    expect(takeDecision(s, GER, 'zbrojni_pujcka')).toBe(s);
    const later = advance(s, 24 * 181);
    expect(decisionBlock(withPp(later, GER, 500), GER, 'zbrojni_pujcka')).toBeNull();
  });
  it('podmínky: válka / mír, ideologie, země, politická moc', () => {
    expect(decisionBlock(s0, GER, 'sbirka_kovu')).toMatch(/války/);
    expect(decisionBlock(s0, GER, 'volby')).toMatch(/ideolog/i);
    expect(decisionBlock(s0, GER, 'sov_petiletka')).toMatch(/zemi/);
    expect(decisionBlock(withPp(s0, GER, 5), GER, 'propaganda')).toMatch(/politická moc/);
    const war = declareWar(s0, 'GER', 'POL');
    expect(decisionBlock(war, GER, 'velke_manevry')).toMatch(/míru/);
    expect(decisionBlock(war, GER, 'sbirka_kovu')).toBeNull();
    expect(takeDecision(s0, GER, 'neexistuje')).toBe(s0);
    expect(takeDecision(s0, 0, 'propaganda')).toBe(s0);
  });
  it('xp rozhodnutí přidají zkušenosti; jednorázové národní se označí jako použité', () => {
    const s = takeDecision(s0, GER, 'velke_manevry');
    expect(s.doc.own[GER].xp.land).toBeGreaterThan(s0.doc.own[GER].xp.land + 39);
    const n = takeDecision(s0, GER, 'nem_remilitarizace');
    expect(decisionsOf(n, GER).find((d) => d.id === 'nem_remilitarizace').used).toBe(true);
    expect(decisionsOf(s0, GER).some((d) => d.id === 'sov_petiletka')).toBe(false);
    expect(docMods(s0, GER).atk).toBe(0);
  });
  it('AI používá rozhodnutí; stav je deterministický a uložitelný', () => {
    let s = createGame({ player: 'GER', aiLevel: 2 });
    s = withPp(advance(s, 24 * 6), FRA, 400);
    const a = advance(s, 24 * 2), b = advance(s, 24 * 2);
    expect(Object.keys(a.nat.own[FRA].dec).length).toBeGreaterThan(0);
    expect(JSON.stringify(a.nat)).toBe(JSON.stringify(b.nat));
    expect(unpackGame(JSON.parse(JSON.stringify(packGame(a)))).error).toBeUndefined();
  });
});
