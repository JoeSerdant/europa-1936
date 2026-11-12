// Zámořská pomoc (M79): data, podmínky zásilky, připsání výzbroje, letounů a paliva, denní krok, blokáda, texty.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, declareWar, validateState, aidBlock, deliverAid, overseasDay, OVERSEAS, OVERSEAS_AID, EQUIP, PLANES } from '../src/engine/index.js';
import { homeSea } from '../src/engine/nav/core.js';
import { logLine, logImportant } from '../src/ui/logText.js';
import { popupFor } from '../src/ui/popups.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const ENG = idx('ENG'), GER = idx('GER'), SOV = idx('SOV');
const A = OVERSEAS_AID.find((a) => a.id === 'lend_eng');
const at = (s, day) => ({ ...s, tick: day * 24 });
const war = () => declareWar(createGame({ player: null, aiLevel: 2 }), 'ENG', 'GER');

describe('data', () => {
  it('zásilky odkazují na existující země a známé druhy výzbroje, letounů nebo palivo', () => {
    expect(OVERSEAS.n).toBeTruthy();
    for (const a of OVERSEAS_AID) {
      expect(idx(a.to), a.id).toBeTruthy();
      for (const f of a.foes) expect(idx(f), f).toBeTruthy();
      expect(a.until).toBeGreaterThan(a.from);
      expect(a.every).toBeGreaterThan(0);
      for (const k in a.give) expect(!!EQUIP[k] || !!PLANES[k] || k === 'fuel', `${a.id}.${k}`).toBe(true);
    }
  });
});

describe('podmínky a připsání', () => {
  it('zásilka jde jen zemi, která válčí s uvedeným protivníkem a má volný přístav', () => {
    expect(aidBlock(createGame({ player: null, aiLevel: 2 }), A)).toMatch(/neválčí/);
    const s = war();
    expect(aidBlock(s, A)).toBeNull();
    const sea = homeSea(s, ENG).sea;
    const fleets = [...s.nav.fleets.map((f) => (f && f.o === ENG ? null : f)), { o: GER, nm: 'Blokáda', p: sea, ships: { dd: 4 }, c: {}, mx: 1, to: 0, path: [], prog: 0 }];
    expect(aidBlock({ ...s, nav: { ...s.nav, fleets } }, A)).toMatch(/zablokovaný/);
    const cap = { ...s, dip: { ...s.dip, cap: s.dip.cap.map((v, i) => (i === ENG ? 1 : v)) } };
    expect(aidBlock(cap, A)).toMatch(/neexistuje/);
  });
  it('deliverAid připíše výzbroj do skladu, letouny do rezervy a palivo do zásoby', () => {
    const s = war();
    const t = deliverAid(s, A);
    expect(t.mil.stock[ENG].pusky).toBe((s.mil.stock[ENG].pusky || 0) + A.give.pusky);
    expect(t.mil.stock[ENG].auta).toBe((s.mil.stock[ENG].auta || 0) + A.give.auta);
    expect(t.air.pool[ENG].sti).toBe((s.air.pool[ENG].sti || 0) + A.give.sti);
    expect(t.ind.fuel[ENG].s).toBe(s.ind.fuel[ENG].s + A.give.fuel);
    expect(s.mil.stock[ENG].pusky).not.toBe(t.mil.stock[ENG].pusky);
    expect(validateState(t)).toBeNull();
  });
});

describe('denní krok', () => {
  it('v den zásilky připíše dodávku a první zapíše celému světu; mimo dny nic', () => {
    const s = at(war(), A.from);
    const t = overseasDay(s);
    expect(t.mil.stock[ENG].pusky).toBe((s.mil.stock[ENG].pusky || 0) + A.give.pusky);
    expect(t.log.items.some((e) => e.k === 'aid' && e.o === ENG && e.y === 1)).toBe(true);
    expect(t.nat.own[ENG].flags[`aid_${A.id}`]).toBe(1);
    const next = overseasDay(at(t, A.from + A.every));
    expect(next.log.items.filter((e) => e.k === 'aid' && e.y === 2)).toHaveLength(1);
    const off = at(s, A.from + 1);
    expect(overseasDay(off)).toBe(off);
    const early = at(s, A.from - A.every);
    expect(overseasDay(early)).toBe(early);
  });
  it('bez války, bez historické AI nebo při blokádě zásilka nedorazí', () => {
    const peace = at(createGame({ player: null, aiLevel: 2 }), A.from);
    expect(overseasDay(peace)).toBe(peace);
    const nohist = at(declareWar(createGame({ player: null, aiLevel: 2, hist: false }), 'ENG', 'GER'), A.from);
    expect(overseasDay(nohist)).toBe(nohist);
    const s = at(war(), A.from);
    const sea = homeSea(s, ENG).sea;
    const fleets = [...s.nav.fleets.map((f) => (f && f.o === ENG ? null : f)), { o: GER, nm: 'Blokáda', p: sea, ships: { dd: 4 }, c: {}, mx: 1, to: 0, path: [], prog: 0 }];
    const b = overseasDay({ ...s, nav: { ...s.nav, fleets } });
    expect(b.mil.stock[ENG].pusky).toBe(s.mil.stock[ENG].pusky);
    expect(b.log.items.some((e) => e.k === 'aid' && e.y === 0)).toBe(true);
  });
});

describe('texty', () => {
  it('záznam aid má texty, první zásilka se hlásí všem a kartou příjemci', () => {
    expect(logLine({ k: 'aid', o: ENG, x: 'lend_eng', y: 1 }, SOV).text).toMatch(/Spojené státy/);
    expect(logLine({ k: 'aid', o: ENG, x: 'lend_eng', y: 2 }, ENG).text).toMatch(/zásilka/);
    expect(logLine({ k: 'aid', o: ENG, x: 'lend_eng', y: 0 }, ENG).tone).toBe('bad');
    expect(logImportant({ k: 'aid', o: ENG, y: 1 }, SOV)).toBe(true);
    expect(logImportant({ k: 'aid', o: ENG, y: 2 }, ENG)).toBe(false);
    expect(popupFor({ k: 'aid', o: ENG, y: 1 }, ENG)).toMatchObject({ kind: 'aid', sticky: true });
    expect(popupFor({ k: 'aid', o: ENG, y: 1 }, SOV)).toMatchObject({ kind: 'aid' });
    expect(popupFor({ k: 'aid', o: ENG, y: 2 }, ENG)).toBeNull();
    expect(popupFor({ k: 'aid', o: ENG, y: 0 }, ENG)).toMatchObject({ tone: 'bad' });
  });
});
