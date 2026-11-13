// Národní duchové (M74): data, počáteční duchové, bonusy v politice, přidání a vypršení, účinky cílů a rozhodnutí, převrat a vítězství, stav a rozhraní.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, validateState, GAME_VERSION, packGame, unpackGame, polModsOf, politicsOf, applyFx, decisionBlock, takeDecision, changeGov, declareWar, capitulate,
  SPIRITS, SPIRIT_IDS, SPIRIT_START, addSpirit, removeSpirit, spiritsOf, spiritMods, expireSpirits, NO_POL, POL, DIP, fxText,
} from '../src/engine/index.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const GER = idx('GER'), FRA = idx('FRA'), ENG = idx('ENG'), LUX = idx('LUX'), POLAND = idx('POL');
const base = () => createGame({ player: null, aiLevel: 0 });
const KEYS = Object.keys(NO_POL);

describe('data', () => {
  it('každý duch má název, popis, tón a bonusy jen se známými klíči', () => {
    expect(SPIRIT_IDS.length).toBeGreaterThanOrEqual(15);
    for (const id of SPIRIT_IDS) {
      const s = SPIRITS[id];
      expect(s.n && s.info, id).toBeTruthy();
      expect(['good', 'bad', 'mixed']).toContain(s.tone);
      for (const k in s.mod) expect(KEYS, `${id}.${k}`).toContain(k);
    }
  });
  it('počáteční duchové odkazují na existující země a duchy', () => {
    for (const tag in SPIRIT_START) {
      expect(idx(tag), tag).toBeTruthy();
      for (const id of SPIRIT_START[tag]) expect(SPIRITS[id], id).toBeTruthy();
    }
  });
});

describe('stav a bonusy', () => {
  it('země začínají se svými duchy (trvalými) a země bez dat s prázdným seznamem', () => {
    const s = base();
    expect(s.nat.own[GER].sp).toEqual({ zbrojni_horecka: 0, revize_smluv: 0, ukolova_taktika: 0 });
    expect(s.nat.own[LUX].sp).toEqual({});
    expect(spiritsOf(s, GER).map((x) => x.id)).toEqual(['zbrojni_horecka', 'revize_smluv', 'ukolova_taktika']);
    expect(spiritsOf(s, GER)[0].days).toBe(0);
  });
  it('bonusy duchů se sčítají do polModsOf a mění cíl stability a podpory války', () => {
    const s = base();
    const none = { ...s, nat: { ...s.nat, own: s.nat.own.map((x, i) => (i === GER ? { ...x, sp: {} } : x)) } };
    expect(polModsOf(s, GER).prod).toBeCloseTo(polModsOf(none, GER).prod + SPIRITS.zbrojni_horecka.mod.prod, 6);
    expect(polModsOf(s, GER).ws).toBeCloseTo(polModsOf(none, GER).ws + SPIRITS.revize_smluv.mod.ws, 6);
    expect(politicsOf(s, GER).target.ws).toBeCloseTo(politicsOf(none, GER).target.ws + 0.05, 6);
    expect(polModsOf(s, GER)).toBe(polModsOf(s, GER));   // mezipaměť
    expect(spiritMods({})).toBe(spiritMods(undefined));
  });
  it('addSpirit a removeSpirit jsou čisté; trvalého ducha dočasný nepřepíše a delší trvání nahradí kratší', () => {
    const s = base();
    const a = addSpirit(s, FRA, 'valecne_usili', 30);
    expect(a.nat.own[FRA].sp.valecne_usili).toBe(s.tick + 30 * 24);
    expect(s.nat.own[FRA].sp.valecne_usili).toBeUndefined();
    expect(addSpirit(a, FRA, 'valecne_usili', 10)).toBe(a);
    expect(addSpirit(a, FRA, 'valecne_usili', 60).nat.own[FRA].sp.valecne_usili).toBe(s.tick + 60 * 24);
    expect(addSpirit(a, FRA, 'valecne_usili', 0).nat.own[FRA].sp.valecne_usili).toBe(0);
    expect(addSpirit(s, FRA, 'rozstepena_republika', 20)).toBe(s);
    expect(addSpirit(s, FRA, 'nic')).toBe(s);
    expect(addSpirit(s, 999, 'valecne_usili')).toBe(s);
    expect(removeSpirit(s, FRA, 'nic')).toBe(s);
    expect(removeSpirit(a, FRA, 'valecne_usili').nat.own[FRA].sp.valecne_usili).toBeUndefined();
  });
  it('dočasný duch po uplynutí času zanikne (i během hry) a s ním jeho bonus', () => {
    let s = addSpirit(base(), FRA, 'valecne_usili', 3);
    const withIt = polModsOf(s, FRA).prod;
    expect(spiritsOf(s, FRA).find((x) => x.id === 'valecne_usili').days).toBe(3);
    s = advance(s, 24 * 2);
    expect(s.nat.own[FRA].sp.valecne_usili).toBeGreaterThan(0);
    s = advance(s, 24 * 2);
    expect(s.nat.own[FRA].sp.valecne_usili).toBeUndefined();
    expect(polModsOf(s, FRA).prod).toBeCloseTo(withIt - SPIRITS.valecne_usili.mod.prod, 6);
    expect(expireSpirits(s)).toBe(s);
  });
});

describe('zdroje duchů', () => {
  it('účinky spirit a unspirit fungují v cílech a událostech a mají popis', () => {
    const s = base();
    const a = applyFx(s, ENG, [{ t: 'spirit', id: 'vitezna_nalada', days: 90 }, { t: 'unspirit', id: 'usmirovani' }]);
    expect(a.nat.own[ENG].sp.vitezna_nalada).toBe(s.tick + 90 * 24);
    expect(a.nat.own[ENG].sp.usmirovani).toBeUndefined();
    expect(fxText({ t: 'spirit', id: 'vitezna_nalada', days: 90 })).toMatch(/Vítězná nálada \(90 dní\)/);
    expect(fxText({ t: 'unspirit', id: 'usmirovani' })).toMatch(/usmiřování/);
  });
  it('rozhodnutí Válečná výrobní kampaň dá za války dočasného ducha', () => {
    let s = base();
    const own = s.pol.own.slice(); own[GER] = { ...own[GER], pp: 200 };
    s = { ...s, pol: { ...s.pol, own } };
    expect(decisionBlock(s, GER, 'vyrobni_kampan')).toBe('Jen za války.');
    s = declareWar(s, 'GER', 'LUX');
    expect(decisionBlock(s, GER, 'vyrobni_kampan')).toBeNull();
    const t = takeDecision(s, GER, 'vyrobni_kampan');
    expect(t.nat.own[GER].sp.valecne_usili).toBe(s.tick + 120 * 24);
  });
  it('převrat přinese Porevoluční chaos a kapitulace protivníka Vítěznou náladu', () => {
    const s = base();
    const coup = changeGov(s, FRA, 'fascism');
    expect(coup.nat.own[FRA].sp.porevolucni_chaos).toBe(s.tick + POL.COUP_CHAOS_DAYS * 24);
    let w = declareWar(s, 'GER', 'LUX');
    const ctrl = w.ctrl.slice();
    for (let p = 1; p <= W.L; p++) if (ctrl[p] === LUX) ctrl[p] = GER;
    w = capitulate({ ...w, ctrl }, LUX);
    expect(w.nat.own[GER].sp.vitezna_nalada).toBe(s.tick + DIP.VICTORY_DAYS * 24);
  });
});

describe('uložení a kontrola', () => {
  it('verze hry, kontrola stavu a uložení znají duchy', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(33);
    const s = base();
    expect(validateState(s)).toBeNull();
    const bad = { ...s, nat: { ...s.nat, own: s.nat.own.map((x, i) => (i === GER ? { ...x, sp: undefined } : x)) } };
    expect(validateState(bad)).toMatch(/duchové/);
    const back = unpackGame(JSON.parse(JSON.stringify(packGame(addSpirit(s, POLAND, 'valecne_usili', 5)))));
    expect(back.state.nat.own[POLAND].sp.valecne_usili).toBe(5 * 24);
  });
});
