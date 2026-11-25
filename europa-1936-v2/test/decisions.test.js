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

describe('W6: rozhodnutí jako v HOI4', () => {
  const s0 = withPp(createGame({ player: 'GER' }), GER, 500);
  const SOV = W.ownerIdx.SOV, USA = W.ownerIdx.USA, CAN = W.ownerIdx.CAN;
  it('data: kategorie existují, státy a země v podmínkách existují, cíle z podmínek existují', async () => {
    const { DECISION_CATS } = await import('../src/data/nat/decisions.js');
    const { FOCUS_BY_ID } = await import('../src/data/nat/focuses.js');
    const { focusIdFor } = await import('../src/engine/nat/decisions.js');
    for (const d of DECISIONS) {
      expect(DECISION_CATS[d.cat], d.id).toBeTruthy();
      for (const t of [...(d.when.tag || []), ...(d.when.notTag || []), ...(d.when.atWar || [])]) expect(W.ownerIdx[t], `${d.id}: ${t}`).toBeTruthy();
      for (const f of d.when.focus || []) for (const t of d.when.tag || ['GER', 'CAN', 'USA']) expect(FOCUS_BY_ID[focusIdFor(t, f)], `${d.id}: ${focusIdFor(t, f)}`).toBeTruthy();
    }
    expect(focusIdFor('CAN', '*_px_cmd')).toBe('can_px_cmd');
    expect(focusIdFor('SLO', '*_px_cmd')).toBe('def_px_cmd');   // vydaná země má výchozí strom
  });
  it('podmínky: rok, splněný cíl, válka s konkrétní zemí, „ne pro tuto zemi“', () => {
    expect(decisionBlock(s0, GER, 'ger_zapadni_val')).toMatch(/roku 1938/);
    const y38 = { ...s0, tick: 24 * 800 };
    expect(decisionBlock(y38, GER, 'ger_zapadni_val')).toMatch(/Návrat do Porýní/);
    const own = y38.nat.own.slice(); own[GER] = { ...own[GER], done: { ...own[GER].done, ger_rhine: 1 } };
    expect(decisionBlock({ ...y38, nat: { ...y38.nat, own } }, GER, 'ger_zapadni_val')).toBeNull();
    const sov = withPp(s0, SOV, 500);
    expect(decisionBlock(sov, SOV, 'sov_evakuace')).toMatch(/ve válce se zemí/);
    expect(decisionBlock(declareWar(sov, 'GER', 'SOV'), SOV, 'sov_evakuace')).toBeNull();
    expect(decisionBlock(s0, GER, 'mise_berlin')).toMatch(/zemi/);
    expect(decisionsOf(s0, GER).some((d) => d.id === 'mise_berlin')).toBe(false);
    expect(decisionsOf(s0, GER).some((d) => d.id === 'mise_londyn')).toBe(true);
    // obecné rozhodnutí odemčené cílem ve vlastním stromu země
    const war = withPp(declareWar(s0, 'GER', 'POL'), GER, 500);
    expect(decisionBlock(war, GER, 'velka_ofenziva')).toMatch(/Velitelský sbor/);
    const o2 = war.nat.own.slice(); o2[GER] = { ...o2[GER], done: { ...o2[GER].done, ger_px_cmd: 1 } };
    const ok = { ...war, nat: { ...war.nat, own: o2 } };
    expect(decisionBlock(ok, GER, 'velka_ofenziva')).toBeNull();
    const t = takeDecision(ok, GER, 'velka_ofenziva');
    expect(docMods(t, GER).atk).toBe(docMods(ok, GER).atk);   // bonus jde přes ducha, ne doktrínu
    expect(t.nat.own[GER].sp.d_ofenziva).toBe(t.tick + 60 * 24);   // dočasný duch na 60 dní
    void USA; void CAN;
  });
});
