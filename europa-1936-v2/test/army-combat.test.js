// M18 – boj: trvání, převaha, terén, zakopání, zkušenosti, pancíř, šířka fronty, ústup, čistota funkcí.
import { describe, it, expect } from 'vitest';
import { advance, advanceHour, deriveStats, ARMY } from '../src/engine/index.js';
import { duel, runUntilBattleEnds, addDivision, emptyBattlefield, giveSides, neighbors, idx, W } from './armyKit.js';

const pct = (s, id) => { const d = s.mil.divs[id]; return d ? d.hp / deriveStats(s.mil.tpl[d.tpl]).hp : 0; };
const fight = (o) => { const d = duel(o); const r = runUntilBattleEnds(d.s); return { ...r, d }; };

function deepFreeze(x) {
  if (x && typeof x === 'object' && !Object.isFrozen(x) && !ArrayBuffer.isView(x)) {
    Object.freeze(x);
    for (const k of Object.keys(x)) deepFreeze(x[k]);
  }
  return x;
}

describe('boj', () => {
  const equal = fight({});

  it('vyrovnaný souboj pěchoty trvá dny, ne hodiny', () => {
    expect(equal.started).toBe(true);
    expect(equal.hours).toBeGreaterThan(40);
    expect(equal.hours).toBeLessThan(160);
    expect(equal.s.mil.battles).toEqual([]);
  });

  it('boj stojí lidské životy a vyčerpá organizaci poraženého', () => {
    const { s, d } = equal;
    expect(s.mil.cas[idx('GER')]).toBeGreaterThan(300);
    expect(s.mil.cas[idx('POL')]).toBeGreaterThan(300);
    const D = s.mil.divs[d.D[0]], A = s.mil.divs[d.A[0]];
    const lost = !D || D.org < 10 || !A || A.org < 10;
    expect(lost).toBe(true);
  });

  it('převaha rozhoduje: 2 : 1 skončí dřív a útočníci přijdou o méně', () => {
    const f = fight({ na: 2 });
    expect(f.hours).toBeLessThan(equal.hours);
    expect(pct(f.s, f.d.A[0])).toBeGreaterThan(pct(equal.s, equal.d.A[0]));
    expect(pct(f.s, f.d.A[0])).toBeGreaterThan(0.85);
  });

  it('poražený obránce ustoupí do sousední vlastní provincie a nějakou dobu neútočí', () => {
    const f = fight({ na: 2 });
    const D = f.s.mil.divs[f.d.D[0]];
    expect(D).toBeTruthy();
    expect(D.p).not.toBe(f.d.to);
    expect(f.s.ctrl[D.p]).toBe(idx('POL'));
    expect(neighbors(f.d.to)).toContain(D.p);
    expect(D.rt).toBeGreaterThan(0);
    expect(D.b).toBe(0);
  });

  it('po vítězství útočníci provincii obsadí', () => {
    const f = fight({ na: 3 });
    const s = advance(f.s, 48);
    expect(s.ctrl[f.d.to]).toBe(idx('GER'));
    const A = s.mil.divs[f.d.A[0]];
    expect(A.p).toBe(f.d.to);
    expect(A.path).toEqual([]);
  });

  it('hory a lesy chrání obránce', () => {
    const plain = fight({ na: 3, nd: 2, terr: 0 }), forest = fight({ na: 3, nd: 2, terr: 1 }), mount = fight({ na: 3, nd: 2, terr: 3 });
    expect(forest.hours).toBeGreaterThan(plain.hours);
    expect(mount.hours).toBeGreaterThan(plain.hours * 1.25);
    expect(pct(mount.s, mount.d.A[0])).toBeLessThan(pct(plain.s, plain.d.A[0]));
  });

  it('přechod řeky útočníky zdržuje', () => {
    const dry = fight({ na: 2 }), river = fight({ na: 2, river: true });
    expect(river.hours).toBeGreaterThan(dry.hours);
  });

  it('zakopaný obránce vydrží déle', () => {
    const a = fight({ na: 2, dig: 0 }), b = fight({ na: 2, dig: 5 });
    expect(b.hours).toBeGreaterThan(a.hours + 3);
  });

  it('zkušenější vojáci vyhrávají', () => {
    const vet = fight({ xpA: 0.9, xpD: 0.1 }), green = fight({ xpA: 0.1, xpD: 0.9 });
    expect(vet.hours).toBeLessThan(green.hours);
  });

  it('tanky prorazí pěchotu rychleji a pěchota proti tankům krvácí víc', () => {
    const tank = fight({ ka: 'tank' });
    expect(tank.hours).toBeLessThan(equal.hours * 0.75);
    const vsTank = fight({ kd: 'tank' });
    expect(vsTank.s.mil.cas[idx('GER')]).toBeGreaterThan(vsTank.s.mil.cas[idx('POL')]);
  });

  it('nedostatek zásob útočníky oslabuje', () => {
    const full = fight({ na: 2 }), lack = fight({ na: 2, supA: 0, sgA: 0 });
    expect(pct(lack.s, lack.d.A[0])).toBeLessThan(pct(full.s, full.d.A[0]));
  });

  it('šířka fronty omezuje počet bojujících divizí, ostatní čekají v záloze', () => {
    const d = duel({ na: 10, nd: 1, terr: 3 });
    let s = d.s;
    for (let i = 0; i < 6 && !s.mil.battles.length; i++) s = advanceHour(s);
    expect(s.mil.battles.length).toBe(1);
    const b = s.mil.battles[0];
    expect(b.att.length).toBe(10);
    expect(b.fa.length).toBeLessThan(10);
    expect(b.fa.length).toBeGreaterThanOrEqual(2);
    const w = b.fa.reduce((n, id) => n + deriveStats(s.mil.tpl[s.mil.divs[id].tpl]).width, 0);
    expect(w).toBeGreaterThanOrEqual(48);
  });

  it('obránce bez cesty ústupu je zničen', () => {
    const d = duel({ na: 3 });
    const ctrl = d.s.ctrl.slice();
    for (const q of neighbors(d.to)) if (q !== d.from) ctrl[q] = idx('GER');
    let s = { ...d.s, ctrl };
    const r = runUntilBattleEnds(s);
    expect(r.s.mil.divs[d.D[0]]).toBe(null);
    expect(r.s.mil.cas[idx('POL')]).toBeGreaterThan(1000);
  });

  it('poražený útočník se stáhne a nějakou dobu neútočí', () => {
    const f = fight({ na: 1, nd: 3, terr: 3, dig: 5 });
    const A = f.s.mil.divs[f.d.A[0]];
    expect(A).toBeTruthy();
    expect(A.path).toEqual([]);
    expect(A.hold).toBeGreaterThan(0);
    expect(A.p).toBe(f.d.from);
    expect(A.b).toBe(0);
  });

  it('druhý útočník z jiného směru se připojí k bitvě a rozšíří frontu', () => {
    const d = duel({ na: 1, nd: 3, terr: 0 });
    let s = d.s;
    const other = neighbors(d.to).find((q) => q !== d.from && W.landAdj && q > 0);
    const ctrl = s.ctrl.slice();
    ctrl[other] = idx('GER');
    s = { ...s, ctrl };
    let id2;
    [s, id2] = addDivision(s, 'GER', 'pesi', other, { path: [d.to] });
    for (let i = 0; i < 8 && !(s.mil.battles[0] && s.mil.battles[0].att.length === 2); i++) s = advanceHour(s);
    expect(s.mil.battles.length).toBe(1);
    expect(s.mil.battles[0].att.sort()).toEqual([d.A[0], id2].sort());
    expect(s.mil.battles[0].from.length).toBe(2);
  });
});

describe('čistota a determinismus', () => {
  it('stejné vstupy dávají stejný výsledek', () => {
    const a = duel({ na: 3, nd: 2, terr: 2 }), b = duel({ na: 3, nd: 2, terr: 2 });
    expect(advance(a.s, 60)).toEqual(advance(b.s, 60));
  });

  it('simulace nemění původní stav (jde i s hluboce zmrazeným)', () => {
    const d = duel({ na: 2, nd: 2 });
    deepFreeze(d.s);
    expect(() => advance(d.s, 72)).not.toThrow();
  });

  it('rozdělení na kroky nemění výsledek', () => {
    const d = duel({ na: 2, nd: 1 });
    const one = advance(d.s, 48);
    let two = advance(d.s, 20);
    two = advance(two, 28);
    expect(two).toEqual(one);
  });

  it('stav se po cestě přes JSON chová stejně', () => {
    const d = duel({ na: 2, nd: 1 });
    const mid = advance(d.s, 30);
    const copy = JSON.parse(JSON.stringify(mid));
    expect(advance(copy, 40)).toEqual(advance(mid, 40));
  });

  it('klidný svět bez války se mění jen minimálně (stejný objekt, kde je to možné)', () => {
    const s = emptyBattlefield();
    const t = advanceHour(s);
    expect(t.tick).toBe(1);
    expect(t.mil).toBe(s.mil);
  });
});
