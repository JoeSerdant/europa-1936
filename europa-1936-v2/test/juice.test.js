// Odezva hry (M101): velký pruh pro hráče, noviny ze světa, ilustrace událostí, události po změně vlády alternativní cestou.
import { describe, it, expect } from 'vitest';
import { getWorld, EVENTS, EVENT_BY_ID, FOCUS_BY_ID, createGame, applyFx } from '../src/engine/index.js';
import { bannerFor, newsFor, artFor } from '../src/ui/juice.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const [GER, POL, FRA, LUX, BEL] = ['GER', 'POL', 'FRA', 'LUX', 'BEL'].map(idx);

describe('velký pruh', () => {
  it('splněný cíl, výzkum, válka a mír hráče; cizí válka ne', () => {
    const f = bannerFor({ id: 1, k: 'focus', x: 'ger_plan' }, GER);
    expect(f.title).toBe('Národní cíl splněn');
    expect(f.text).toBe(FOCUS_BY_ID.ger_plan.n);
    expect(f.chips.length).toBeGreaterThan(0);
    expect(f.sound).toBe('fanfare');
    expect(bannerFor({ id: 2, k: 'tech', x: 'pusky2' }, GER).sound).toBe('chime');
    expect(bannerFor({ id: 3, k: 'war', a: GER, b: POL }, GER).tone).toBe('bad');
    expect(bannerFor({ id: 4, k: 'war', a: GER, b: POL }, POL).title).toBe('Napadla nás');
    expect(bannerFor({ id: 5, k: 'war', a: GER, b: POL }, FRA)).toBeNull();
    expect(bannerFor({ id: 6, k: 'peace', a: GER, b: POL }, POL).tone).toBe('good');
    expect(bannerFor({ id: 7, k: 'focus', x: 'ger_plan' }, 0)).toBeNull();
  });
});

describe('noviny ze světa', () => {
  it('válka velmoci, kapitulace a převrat ano; válka malých zemí bez hráče ne; text je stálý', () => {
    const war = newsFor({ id: 11, k: 'war', a: GER, b: POL }, FRA);
    expect(war.art).toBe('war');
    expect(war.headline).toMatch(/Německo|Polsk/);
    expect(newsFor({ id: 11, k: 'war', a: GER, b: POL }, FRA)).toEqual(war);   // stejný záznam = stejné noviny
    expect(newsFor({ id: 12, k: 'war', a: LUX, b: BEL }, FRA)).toBeNull();
    expect(newsFor({ id: 12, k: 'war', a: LUX, b: BEL }, LUX)).not.toBeNull();   // vlastní válka hráče ano
    expect(newsFor({ id: 13, k: 'cap', o: POL }, FRA).art).toBe('surrender');
    expect(newsFor({ id: 14, k: 'gov', o: BEL, x: 'communism' }, FRA).headline).toMatch(/Belgi/);
    expect(newsFor({ id: 15, k: 'tech', x: 'pusky2' }, FRA)).toBeNull();
    for (const k of ['war', 'cap', 'gov', 'nuke', 'restore', 'exile', 'faction']) {
      const n = newsFor({ id: 20, k, a: GER, b: POL, o: GER, x: k === 'faction' ? 'Osa' : POL, y: 3 }, FRA);
      expect(n && n.headline && n.paper, k).toBeTruthy();
    }
  });
  it('ilustrace události podle textu', () => {
    expect(artFor({ n: 'Stávka v průmyslu', text: 'Dělníci v továrnách' })).toBe('industry');
    expect(artFor({ n: 'Dobrá úroda', text: 'sklizeň' })).toBe('farm');
    expect(artFor({ n: 'Nic', text: '' })).toBe('flag');
    for (const ev of EVENTS) expect(typeof artFor(ev)).toBe('string');
  });
});

describe('události po změně vlády', () => {
  it('každý cíl s účinkem gov má událost „Nová vláda“ se třemi volbami a platnými účinky', () => {
    const govs = Object.values(FOCUS_BY_ID).filter((f) => f.fx.some((e) => e.t === 'gov'));
    expect(govs.length).toBeGreaterThan(100);
    for (const f of govs) {
      const ev = EVENT_BY_ID[`alt_${f.id}`];
      expect(ev, f.id).toBeTruthy();
      expect(ev.cond.focus).toBe(f.id);
      expect(ev.opts).toHaveLength(3);
    }
    const s = createGame({ player: null });
    const ev = EVENT_BY_ID.alt_ger_alt_dem2;
    for (const o of ev.opts) expect(applyFx(s, GER, o.fx)).not.toBe(s);
  });
});
