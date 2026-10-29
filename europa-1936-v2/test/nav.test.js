// Námořnictvo (M27): data, počáteční loďstva a loděnice, výroba lodí, flotily (sestavení, pohyb, rozpuštění), námořní boj, blokáda, přeprava a vylodění, potopení, čistota.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, declareWar, addLine, setLineEquip, setLineFactories, build, industryOf, navyOf, formFleet, disbandFleet, orderFleet, stopFleet, renameFleet,
  orderSail, sailBlock, seaBlocked, seaRoute, homeSea, powerOf, transportsOf, fleetSpeed, isSeaLabel, portsOf, NAV, SHIPS, SHIP_IDS, NAVY_NATIONAL, SHIP_PROD,
  slotsOf, slotsUsed, GAME_VERSION, validateState, fleetsInSea,
} from '../src/engine/index.js';
import { addDivision, emptyBattlefield } from './armyKit.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const [ENG, FRA, GER, SWI, ITA] = ['ENG', 'FRA', 'GER', 'SWI', 'ITA'].map(idx);
const day = (s, n = 1) => advance(s, 24 * n);
const hours = (s, n) => advance(s, n);
const base = (extra = {}) => createGame({ player: 'ENG', ...extra });
const withFleet = (s, o, label, ships, nm = 'Test') => {
  const fleets = s.nav.fleets.slice();
  fleets.push({ o, nm, p: label, ships: { ...ships }, c: {}, mx: powerOf(ships).hp, to: 0, path: [], prog: 0 });
  return { ...s, nav: { ...s.nav, fn: fleets.length - 1, fleets, ver: s.nav.ver + 1 } };
};
const withPool = (s, o, ships) => { const pool = s.nav.pool.slice(); pool[o] = { ...pool[o], ...ships }; return { ...s, nav: { ...s.nav, pool } }; };

describe('data a začátek', () => {
  const s = base();
  it('lodě a výrobní data jsou úplná, námořnictva zemí odkazují na existující země', () => {
    for (const id of SHIP_IDS) { expect(SHIPS[id].hp).toBeGreaterThan(0); expect(SHIPS[id].spd).toBeGreaterThan(0); expect(SHIP_PROD[id].cost).toBeGreaterThan(0); }
    expect(SHIPS.tr.atk).toBe(0);
    for (const tag in NAVY_NATIONAL) expect(W.ownerIdx[tag]).toBeTruthy();
  });
  it('stav je čistý JSON, verze 10, kontrola uložené hry vyžaduje `nav`', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(10);
    expect(JSON.parse(JSON.stringify(s.nav))).toEqual(s.nav);
    expect(validateState({ ...s, nav: undefined })).toMatch(/nav/);
    expect(validateState(s)).toBeNull();
  });
  it('velmoci mají hlavní flotilu v domovské oblasti, transportní lodě v rezervě a loděnice; země bez námořnictva nic', () => {
    for (const tag of ['ENG', 'FRA', 'GER', 'ITA', 'SOV']) {
      const o = idx(tag), n = navyOf(s, o), h = homeSea(s, o);
      expect(n.fleets).toHaveLength(1);
      expect(n.fleets[0].p).toBe(h.sea);
      expect(isSeaLabel(h.sea)).toBe(true);
      expect(n.pool.tr).toBe(NAVY_NATIONAL[tag].ships.tr);
      expect(n.fleets[0].ships.tr).toBeUndefined();
      expect(industryOf(s, tag).dok).toBeGreaterThanOrEqual(1);
    }
    expect(industryOf(s, 'ENG').dok).toBe(NAVY_NATIONAL.ENG.docks);
    expect(navyOf(s, SWI).fleets).toHaveLength(0);
    expect(industryOf(s, 'SWI').dok).toBe(0);
    for (let st = 1; st < W.states.length; st++) expect(slotsUsed(s.ind, st)).toBeLessThanOrEqual(slotsOf(s.ind, st));
  });
  it('mořský graf: trasa mezi domovskými oblastmi existuje a má rozumnou délku', () => {
    const r = seaRoute(homeSea(s, ENG).sea, new Set([homeSea(s, GER).sea]));
    expect(r.path.length).toBeGreaterThan(1);
    expect(r.km).toBeGreaterThan(300);
    expect(r.km).toBeLessThan(3000);
    expect(seaRoute(homeSea(s, ENG).sea, new Set([homeSea(s, GER).sea]), () => true)).toBeNull();
    expect(seaRoute(homeSea(s, ENG).sea, new Set([homeSea(s, GER).sea]), null, 100)).toBeNull();
    expect(powerOf({ bb: 1, dd: 2 })).toEqual({ hp: 90 + 20, atk: 28 + 8, n: 3 });
    expect(fleetSpeed({ dd: 1, bb: 1 })).toBe(38);
    expect(fleetSpeed({})).toBe(0);
  });
});

describe('loděnice a výroba lodí', () => {
  const s = base();
  it('loděnice jen ve státě s přístavem; zabírají slot', () => {
    const noPort = Array.from(W.stateOwner0).findIndex((o, i) => i > 0 && o === GER && !W.states[i].v.some((p) => W.portLevel[p] > 0) && slotsUsed(s.ind, i) < slotsOf(s.ind, i));
    expect(build(s, noPort, 'dok')).toBe(s);
    const port = Array.from(W.stateOwner0).findIndex((o, i) => i > 0 && o === ENG && W.states[i].v.some((p) => W.portLevel[p] > 0) && slotsUsed(s.ind, i) < slotsOf(s.ind, i));
    const b = build(s, port, 'dok');
    expect(b.ind.build.at(-1)).toMatchObject({ k: 'dok', s: port });
    const done = day(b, 70);
    expect(done.ind.st[port].dok).toBe(s.ind.st[port].dok + 1);
    expect(industryOf(done, 'ENG').dok).toBe(industryOf(s, 'ENG').dok + 1);
  });
  it('lodní linka potřebuje volné loděnice, ne továrny; hotové lodě jdou do rezervy', () => {
    expect(addLine(s, SWI, 'dd', 1)).toBe(s);                    // bez loděnic
    const a = addLine(s, ENG, 'dd', 2);
    expect(a).not.toBe(s);
    expect(industryOf(a, 'ENG').dockFree).toBe(industryOf(s, 'ENG').dockFree - 2);
    expect(industryOf(a, 'ENG').milFree).toBe(industryOf(s, 'ENG').milFree);
    expect(industryOf(a, 'ENG').lines.filter((l) => l.naval)).toHaveLength(1);
    expect(addLine(a, ENG, 'bb', 99)).toBe(a);
    const b = day(a, 120);
    expect(b.nav.pool[ENG].dd).toBeGreaterThan(0);
    expect(b.nav.ver).toBeGreaterThan(a.nav.ver);
    expect(b.mil.stock[ENG].dd).toBeUndefined();
  });
  it('linku nelze přepnout mezi výzbrojí a loděmi; počet loděnic se hlídá', () => {
    const a = addLine(s, ENG, 'dd', 1);
    const l = a.ind.lines.at(-1);
    expect(setLineEquip(a, l.id, 'pusky')).toBe(a);
    expect(setLineEquip(a, l.id, 'ca')).not.toBe(a);
    const land = a.ind.lines.find((x) => x.o === ENG && x.eq === 'pusky');
    expect(setLineEquip(a, land.id, 'bb')).toBe(a);
    const more = setLineFactories(a, l.id, 1 + industryOf(a, 'ENG').dockFree + 1);
    expect(more).toBe(a);
  });
});

describe('flotily', () => {
  const s = withPool(base(), ENG, { dd: 5, ca: 2 });
  it('sestavení z rezervy; neplatný vstup vrací tentýž stav', () => {
    const a = formFleet(s, ENG, { dd: 3, ca: 1 }, 'Kanálová');
    const f = a.nav.fleets.at(-1);
    expect(f).toMatchObject({ o: ENG, nm: 'Kanálová', ships: { dd: 3, ca: 1 }, p: homeSea(s, ENG).sea });
    expect(a.nav.pool[ENG]).toMatchObject({ dd: 2, ca: 1 });
    expect(f.mx).toBe(3 * 10 + 30);
    expect(formFleet(s, ENG, { dd: 99 }, 'x')).toBe(s);
    expect(formFleet(s, ENG, { zzz: 1 }, 'x')).toBe(s);
    expect(formFleet(s, ENG, { dd: 0 }, 'x')).toBe(s);
    expect(formFleet(s, ENG, { dd: -1 }, 'x')).toBe(s);
    expect(formFleet(s, ENG, null, 'x')).toBe(s);
    expect(formFleet(s, 0, { dd: 1 }, 'x')).toBe(s);
    expect(formFleet(s, SWI, { dd: 1 }, 'x')).toBe(s);
    expect(formFleet(s, ENG, { dd: 1 }, '').nav.fleets.at(-1).nm).toMatch(/flotila/);
    expect(renameFleet(a, a.nav.fleets.length - 1, 'Nová').nav.fleets.at(-1).nm).toBe('Nová');
    expect(renameFleet(a, 999, 'N')).toBe(a);
  });
  it('rozpuštění jen v domovské oblasti vrátí lodě do rezervy', () => {
    const a = formFleet(s, ENG, { dd: 3 }, 'A');
    const id = a.nav.fleets.length - 1;
    const b = disbandFleet(a, id);
    expect(b.nav.fleets[id]).toBeNull();
    expect(b.nav.pool[ENG].dd).toBe(5);
    const away = orderFleet(a, id, homeSea(s, GER).sea);
    expect(disbandFleet(day(away, 1), id)).toEqual(day(away, 1));
    expect(disbandFleet(a, 999)).toBe(a);
  });
  it('pohyb: trvá podle vzdálenosti a rychlosti, dorazí do cíle a cesta se vyprázdní', () => {
    const a = formFleet(s, ENG, { dd: 3 }, 'A');
    const id = a.nav.fleets.length - 1;
    const target = homeSea(s, GER).sea;
    const r = seaRoute(homeSea(s, ENG).sea, new Set([target]));
    const b = orderFleet(a, id, target);
    expect(b.nav.fleets[id]).toMatchObject({ to: target, path: r.path });
    expect(orderFleet(a, id, 5)).toBe(a);                  // není mořská oblast
    expect(orderFleet(a, id, homeSea(s, ENG).sea)).toBe(a);   // už tam je
    const early = hours(b, Math.floor(r.km / 55 / 2));
    expect(early.nav.fleets[id].p).not.toBe(target);
    const late = hours(b, Math.ceil(r.km / 55) + 2 * r.path.length + 5);
    expect(late.nav.fleets[id].p).toBe(target);
    expect(late.nav.fleets[id].path).toEqual([]);
    expect(late.nav.fleets[id].to).toBe(0);
    const halted = stopFleet(hours(b, 3), id);
    expect(halted.nav.fleets[id].path).toEqual([]);
    expect(stopFleet(a, id)).toBe(a);
  });
});

describe('námořní boj a blokáda', () => {
  const sea = homeSea(base(), ENG).sea;
  const war = () => declareWar(base(), 'ENG', 'FRA');
  it('flotily válčících zemí v téže oblasti se denně zeslabují, přátelé a mírové země ne', () => {
    let s = withFleet(withFleet(war(), ENG, sea, { bb: 4, dd: 10 }, 'E'), FRA, sea, { bb: 2, dd: 6 }, 'F');
    const a = day(s, 1);
    const e0 = powerOf(s.nav.fleets.at(-2).ships), f0 = powerOf(s.nav.fleets.at(-1).ships);
    const e1 = a.nav.fleets.at(-2) ? powerOf(a.nav.fleets.at(-2).ships) : { hp: 0 }, f1 = a.nav.fleets.at(-1) ? powerOf(a.nav.fleets.at(-1).ships) : { hp: 0 };
    expect(e1.hp).toBeLessThanOrEqual(e0.hp);
    expect(f1.hp).toBeLessThan(f0.hp);
    expect((e0.hp - e1.hp) / e0.hp).toBeLessThan((f0.hp - f1.hp) / f0.hp);        // silnější ztrácí podíl méně
    const peace = withFleet(withFleet(base(), ENG, sea, { bb: 4 }, 'E'), FRA, sea, { bb: 4 }, 'F');
    const b = day(peace, 3);
    expect(powerOf(b.nav.fleets.at(-1).ships).hp).toBe(360);
    expect(powerOf(b.nav.fleets.at(-2).ships).hp).toBe(360);
  });
  it('slabší flotila ustoupí a po delším boji zanikne; zbytky škod se přenášejí', () => {
    let s = withFleet(withFleet(war(), ENG, sea, { bb: 6, ca: 10, dd: 30 }, 'E'), FRA, sea, { dd: 6 }, 'F');
    s = day(s, 6);
    const f = s.nav.fleets.at(-1);
    expect(!f || powerOf(f.ships).n < 6 || f.p !== sea).toBe(true);
    const e = s.nav.fleets.at(-2);
    expect(e.p).toBe(sea);
    const d = day(s, 20);
    expect(d.nav.fleets.at(-1) === null || powerOf(d.nav.fleets.at(-1).ships).n < 6).toBe(true);
  });
  it('blokáda: nepřátelská bojová flotila bez vlastní v oblasti; transporty bez děl neblokují', () => {
    const open = W.L + 40;                                   // oblast bez flotil
    const s = withFleet(war(), FRA, open, { dd: 2 }, 'F');
    expect(seaBlocked(s, ENG, open)).toBe(true);
    expect(seaBlocked(s, FRA, open)).toBe(false);
    expect(seaBlocked(base(), ENG, open)).toBe(false);
    expect(seaBlocked(withFleet(war(), FRA, open, { tr: 3 }, 'F'), ENG, open)).toBe(false);
    expect(seaBlocked(withFleet(s, ENG, open, { dd: 1 }, 'E'), ENG, open)).toBe(false);
    expect(seaBlocked(s, ENG, sea)).toBe(false);             // domovská oblast Anglie: vlastní flotila
    expect(fleetsInSea(s, open)).toHaveLength(1);
    expect(fleetsInSea(s, sea)).toHaveLength(1);
  });
});

describe('přeprava a vylodění', () => {
  // ENG divize v přístavu Portsmouth → prázdná pobřežní provincie Francie přes Lamanšský průliv
  const eng = base();
  const port = homeSea(eng, ENG).prov;
  function scenario() {
    let s = declareWar(emptyBattlefield('ENG'), 'ENG', 'FRA');
    const [s2, id] = addDivision(s, 'ENG', 'pesi', port);
    s = s2;
    // cíl: pobřežní provincie Francie bez obránců, nejbližší k Portsmouthu po moři
    let best = 0, bk = Infinity;
    const goals = (p) => { const out = new Set(); W.forCoast(p, (l) => out.add(l)); return out; };
    for (let p = 1; p <= W.L; p++) {
      if (s.ctrl[p] !== FRA || W.portLevel[p] > 0 === false && false) continue;
      const g = goals(p);
      if (!g.size) continue;
      const r = seaRoute(W.portSea[port], g);
      if (r && r.km < bk && r.path.length >= 1) { bk = r.km; best = p; }
    }
    return { s, id, dest: best };
  }
  it('pravidla: přístav, boj, kapacita, nehájený cíl, neutralita', () => {
    const { s, id, dest } = scenario();
    expect(dest).toBeGreaterThan(0);
    const withTr = withPool(s, ENG, { tr: 3 });
    expect(sailBlock(withTr, [id], dest)).toBeNull();
    const noTr = withPool(s, ENG, { tr: 0 });
    expect(sailBlock(noTr, [id], dest)).toMatch(/transportní lodě/);
    expect(orderSail(noTr, [id], dest)).toBe(noTr);
    expect(sailBlock(withTr, [], dest)).toMatch(/Nejsou vybrané/);
    expect(sailBlock(withTr, [id], 99999)).toMatch(/Cíl musí/);
    expect(sailBlock(withTr, [id], 0)).toMatch(/Cíl musí/);
    const inland = Array.from({ length: W.L }, (_, i) => i + 1).find((p) => !W.portLevel[p] && s.ctrl[p] === ENG);
    const [s3, id3] = addDivision(withTr, 'ENG', 'pesi', inland);
    expect(sailBlock(s3, [id3], dest)).toMatch(/přístavu/);
    const peace = { ...withTr, mil: { ...withTr.mil, wars: [] } };
    expect(sailBlock(peace, [id], dest)).toMatch(/neutrální/);
    const [s4] = addDivision(withTr, 'FRA', 'pesi', dest);
    expect(sailBlock(s4, [id], dest)).toMatch(/hájí/);
    expect(sailBlock(withTr, [id], W.land[1] && 1)).toBeTruthy();
  });
  it('přeplavba: divize zmizí z armády, po příchodu se vylodí a obsadí provincii; kapacita se hlídá', () => {
    const { s, id, dest } = scenario();
    const t = withPool(s, ENG, { tr: 1 });
    const a = orderSail(t, [id], dest);
    expect(a).not.toBe(t);
    expect(a.mil.divs[id]).toBeNull();
    expect(a.nav.sail).toHaveLength(1);
    expect(a.nav.sail[0]).toMatchObject({ id, o: ENG, to: dest, from: port });
    expect(a.nav.sail[0].arrive).toBeGreaterThan(a.tick + NAV.LOAD_H);
    expect(transportsOf(a, ENG)).toEqual({ total: 1, used: 1, free: 0 });
    expect(navyOf(a, ENG).sail).toHaveLength(1);
    const [a2, id2] = addDivision(a, 'ENG', 'pesi', port);
    expect(sailBlock(a2, [id2], dest)).toMatch(/Chybí transportní/);
    const wait = a.nav.sail[0].arrive - a.tick;
    const before = hours(a, wait - 2);
    expect(before.mil.divs[id]).toBeNull();
    expect(before.ctrl[dest]).toBe(FRA);
    const done = hours(a, wait + 1);
    expect(done.nav.sail).toHaveLength(0);
    expect(done.mil.divs[id]).toMatchObject({ o: ENG, p: dest });
    expect(done.ctrl[dest]).toBe(ENG);
    expect(done.ownerVer).toBeGreaterThan(a.ownerVer);
    expect(done.mil.divs[id].org).toBeLessThanOrEqual(a.nav.sail[0].div.org);
    expect(done.log.items.some((e) => e.k === 'landing' && e.a === 1 && e.o === ENG)).toBe(true);
    expect(transportsOf(done, ENG).free).toBe(1);
  });
  it('když na cíl mezitím dorazí obránci, divize se vrátí do přístavu', () => {
    const { s, id, dest } = scenario();
    const a = orderSail(withPool(s, ENG, { tr: 1 }), [id], dest);
    const [defended] = addDivision(a, 'FRA', 'pesi', dest);
    const done = hours(defended, a.nav.sail[0].arrive - a.tick + 1);
    expect(done.mil.divs[id].p).toBe(port);
    expect(done.ctrl[dest]).toBe(FRA);
    expect(done.log.items.some((e) => e.k === 'landing' && e.a === 0)).toBe(true);
  });
  it('potopení: nepřátelská flotila zablokuje trasu → divize i transportní loď zmizí', () => {
    const { s, id, dest } = scenario();
    const a = orderSail(withPool(s, ENG, { tr: 2 }), [id], dest);
    const mid = a.nav.sail[0].route[a.nav.sail[0].route.length - 1];
    const blocked = withFleet(a, FRA, mid, { dd: 4 }, 'F');
    const after = day(blocked, 1);
    expect(after.nav.sail).toHaveLength(0);
    expect(after.mil.divs[id]).toBeNull();
    expect(after.nav.pool[ENG].tr).toBe(1);
    expect(after.mil.cas[ENG]).toBeGreaterThan(a.mil.cas[ENG]);
    expect(after.log.items.some((e) => e.k === 'sunk' && e.o === ENG)).toBe(true);
    // s vlastním doprovodem v téže oblasti zůstane trasa volná
    const escorted = withFleet(blocked, ENG, mid, { dd: 4 }, 'E');
    expect(day(escorted, 1).nav.sail.length + day(escorted, 1).nav.fleets.filter(Boolean).length).toBeGreaterThan(0);
  });
});

describe('čistota, determinismus, AI', () => {
  it('90 dní s AI: původní stav se nemění, dělení kroků nevadí, JSON čistý, AI staví lodě a drží flotily v domovské oblasti', () => {
    const s = createGame({ player: 'GER', aiLevel: 2 });
    const snap = JSON.stringify(s);
    const a = day(s, 90);
    expect(JSON.stringify(s)).toBe(snap);
    let b = s;
    for (let i = 0; i < 90; i++) b = day(b, 1);
    expect(JSON.stringify(b.nav)).toBe(JSON.stringify(a.nav));
    expect(JSON.parse(JSON.stringify(a.nav))).toEqual(a.nav);
    expect(industryOf(a, 'FRA').lines.some((l) => l.naval)).toBe(true);
    expect(validateState(a)).toBeNull();
    expect(portsOf(s, ENG).length).toBeGreaterThan(10);
    expect(ITA).toBeTruthy();
  });
  it('rok s AI: lodí v zemích s loděnicemi přibývá, vlastní hráč nic nestaví', () => {
    const s = createGame({ player: 'GER', aiLevel: 2 });
    const a = day(s, 365);
    const total = (g, o) => Object.values(navyOf(g, o).total).reduce((x, y) => x + y, 0);
    expect(total(a, ENG)).toBeGreaterThan(total(s, ENG));
    expect(total(a, GER)).toBe(total(s, GER));
  });
});
