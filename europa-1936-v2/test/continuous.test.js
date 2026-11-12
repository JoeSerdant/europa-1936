// Průběžné národní cíle (M85): data, podmínky, bonus, denní cena, ukončení běžným cílem, AI, stav.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, validateState, GAME_VERSION, packGame, unpackGame, polModsOf, startFocus, focusTree, NAT, NO_POL,
  CONT_FOCUSES, CONT_IDS, contBlock, setContinuous,
} from '../src/engine/index.js';

const W = getWorld();
const GER = W.ownerIdx.GER, LUX = W.ownerIdx.LUX;
const KEYS = Object.keys(NO_POL);
/** Hra, kde má země `o` splněné první cíle stromu a dost politické moci. */
function ready(o = GER, n = NAT.CONT_MIN, extra = {}) {
  const s = createGame({ player: null, aiLevel: 0, ...extra });
  const ids = focusTree(s, o).slice(0, n).map((f) => f.id);
  const own = s.nat.own.slice();
  own[o] = { ...own[o], done: Object.fromEntries(ids.map((id) => [id, 1])) };
  const pol = s.pol.own.slice(); pol[o] = { ...pol[o], pp: 100 };
  return { ...s, nat: { ...s.nat, own }, pol: { ...s.pol, own: pol } };
}

describe('data', () => {
  it('průběžné cíle mají název, popis a bonusy jen se známými klíči', () => {
    expect(CONT_IDS.length).toBeGreaterThanOrEqual(6);
    for (const id of CONT_IDS) {
      const C = CONT_FOCUSES[id];
      expect(C.n && C.info, id).toBeTruthy();
      for (const k in C.mod) expect(KEYS, `${id}.${k}`).toContain(k);
    }
  });
});

describe('podmínky a bonus', () => {
  it('otevřou se po CONT_MIN splněných cílech, bez rozpracovaného cíle a s politickou mocí', () => {
    const fresh = createGame({ player: null });
    expect(fresh.nat.own[GER].cont).toBe('');
    expect(contBlock(fresh, GER, 'vyroba')).toMatch(/splněných cílech/);
    const s = ready();
    expect(contBlock(s, GER, 'vyroba')).toBeNull();
    expect(contBlock(s, GER, 'nic')).toBeTruthy();
    const poor = { ...s, pol: { ...s.pol, own: s.pol.own.map((p, i) => (i === GER ? { ...p, pp: 0 } : p)) } };
    expect(contBlock(poor, GER, 'vyroba')).toMatch(/politická moc/);
    const free = focusTree(s, GER).find((f) => f.status === 'available');
    const busy = startFocus(s, GER, free.id);
    expect(contBlock(busy, GER, 'vyroba')).toMatch(/dokončete nebo přerušte/);
    expect(setContinuous(fresh, GER, 'vyroba')).toBe(fresh);
  });
  it('běžící průběžný cíl dává bonus; zrušení ho odebere; stejná volba stav nemění', () => {
    const s = ready();
    const a = setContinuous(s, GER, 'vyroba');
    expect(a.nat.own[GER].cont).toBe('vyroba');
    expect(polModsOf(a, GER).prod).toBeCloseTo(polModsOf(s, GER).prod + CONT_FOCUSES.vyroba.mod.prod, 9);
    expect(polModsOf(a, GER)).toBe(polModsOf(a, GER));
    expect(setContinuous(a, GER, 'vyroba')).toBe(a);
    const b = setContinuous(a, GER, 'veda');
    expect(polModsOf(b, GER).prod).toBeCloseTo(polModsOf(s, GER).prod, 9);
    expect(polModsOf(b, GER).research).toBeCloseTo(polModsOf(s, GER).research + CONT_FOCUSES.veda.mod.research, 9);
    const off = setContinuous(b, GER, '');
    expect(off.nat.own[GER].cont).toBe('');
    expect(polModsOf(off, GER).research).toBeCloseTo(polModsOf(s, GER).research, 9);
  });
  it('denně stojí politickou moc; běžný cíl ho ukončí', () => {
    const s = { ...setContinuous(ready(), GER, 'stavby'), player: 'GER' };
    const pp0 = s.pol.own[GER].pp;
    const t = advance(s, 24);
    expect(t.nat.own[GER].cont).toBe('stavby');
    expect(t.pol.own[GER].pp).toBeLessThan(pp0 + 2.01);
    expect(t.pol.own[GER].pp).toBeCloseTo(pp0 + 2 - NAT.CONT_PP, 6);
    const low = advance({ ...s, pol: { ...s.pol, own: s.pol.own.map((p, i) => (i === GER ? { ...p, pp: 0 } : p)) } }, 24);
    expect(low.nat.own[GER].cont).toBe('stavby');   // denní příjem politické moci přijde dřív než platba
    expect(low.pol.own[GER].pp).toBeCloseTo(2 - NAT.CONT_PP, 6);
    const free = focusTree(s, GER).find((f) => f.status === 'available');
    expect(startFocus(s, GER, free.id).nat.own[GER].cont).toBe('');
  });
});

describe('AI a stav', () => {
  it('AI s hotovým stromem si zvolí průběžný cíl', () => {
    let s = ready(LUX, 0, { aiLevel: 2 });
    const all = Object.fromEntries(focusTree(s, LUX).map((f) => [f.id, 1]));
    const own = s.nat.own.slice(); own[LUX] = { ...own[LUX], done: all };
    s = advance({ ...s, nat: { ...s.nat, own } }, 24);
    expect(CONT_IDS).toContain(s.nat.own[LUX].cont);
  });
  it('verze hry, kontrola stavu a uložení znají průběžný cíl', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(41);
    const s = setContinuous(ready(), GER, 'klid');
    expect(validateState(s)).toBeNull();
    const bad = { ...s, nat: { ...s.nat, own: s.nat.own.map((x, i) => (i === GER ? { ...x, cont: undefined } : x)) } };
    expect(validateState(bad)).toBeTruthy();
    expect(unpackGame(JSON.parse(JSON.stringify(packGame(s)))).state.nat.own[GER].cont).toBe('klid');
  });
});
