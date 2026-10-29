// Výzkum (M20): sloty, dostupnost, průběh a předstih, úrovně výzbroje, odemykání jednotek, bonusy průmyslu, AI zemí, čistota a determinismus.
import { describe, it, expect } from 'vitest';
import { EQUIP_LEVEL_MULT } from '../src/data/army/index.js';
import {
  createGame, getWorld, advance, advanceHour, startResearch, cancelResearch, researchOf, techList, isUnlocked, isAvailable, techMods, slotCount, yearOf,
  createTemplate, TECHS, TECH_IDS, CATS, CAT_IDS, fxLines, RES, EQUIP, BATTALIONS, SUPPORT, deriveStats, industryOf, addLine, setLineEquip,
  build, slotsOf, slotsUsed, divisionView, templateView, GAME_VERSION,
} from '../src/engine/index.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const GER = idx('GER'), SWI = idx('SWI'), SOV = idx('SOV');
const day = (s, n = 1) => advance(s, 24 * n);
const give = (s, o, ids) => {
  const own = s.tech.own.slice();
  const done = { ...own[o].done };
  for (const id of ids) done[id] = 1;
  own[o] = { ...own[o], done };
  const lv = s.mil.lv.slice();
  for (const id of ids) for (const e in TECHS[id].fx.lv || {}) lv[o] = { ...(lv[o] || {}), [e]: Math.max((lv[o] || {})[e] || 1, TECHS[id].fx.lv[e]) };
  return { ...s, tech: { ...s.tech, own }, mil: { ...s.mil, lv } };
};

describe('data technologií', () => {
  it('předpoklady existují, nejsou cyklické a obory jsou známé', () => {
    for (const id of TECH_IDS) {
      const t = TECHS[id];
      expect(CAT_IDS).toContain(t.cat);
      expect(t.days).toBeGreaterThan(0);
      expect(t.year).toBeGreaterThanOrEqual(1936);
      for (const r of t.req) { expect(TECHS[r]).toBeTruthy(); expect(r).not.toBe(id); }
    }
    const seen = new Set();
    const visit = (id, path) => { expect(path.has(id)).toBe(false); if (seen.has(id)) return; seen.add(id); for (const r of TECHS[id].req) visit(r, new Set([...path, id])); };
    TECH_IDS.forEach((id) => visit(id, new Set()));
    for (const c of CAT_IDS) expect(TECH_IDS.some((id) => TECHS[id].cat === c)).toBe(true);
    expect(CATS.pesi.n).toBe('Pěchota');
  });

  it('každý zámek jednotky a výzbroje má odemykající technologii', () => {
    for (const u of [...Object.values(BATTALIONS), ...Object.values(SUPPORT), ...Object.values(EQUIP)]) if (u.unlock) expect(TECHS[u.unlock]).toBeTruthy();
    for (const id of TECH_IDS) for (const e in TECHS[id].fx.lv || {}) { expect(EQUIP[e]).toBeTruthy(); expect(TECHS[id].fx.lv[e]).toBeLessThanOrEqual(EQUIP_LEVEL_MULT.length); }
  });

  it('popis účinků je česky a neprázdný pro technologie s účinkem', () => {
    expect(fxLines('pusky2')[0]).toMatch(/úroveň 2/);
    expect(fxLines('org1')[0]).toMatch(/\+5 %/);
    expect(fxLines('lab1')[0]).toMatch(/slot/);
    expect(fxLines('mtank')).toEqual([]);
  });
});

describe('začátek a sloty', () => {
  const s = createGame({ player: 'GER' });
  it('stav je čistý JSON, verze 4 a každá země má prázdné sloty', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(4);
    expect(JSON.parse(JSON.stringify(s.tech))).toEqual(s.tech);
    expect(s.tech.own[GER].slots).toEqual([0, 0, 0]);
    expect(s.tech.own[SWI].slots).toEqual([0, 0]);
    expect(s.mil.lv[GER]).toBeNull();
  });
  it('sloty: velmoc 3, malý stát 2; laboratoře přidávají, nejvýš 5', () => {
    expect(slotCount({}, GER)).toBe(3);
    expect(slotCount({}, SWI)).toBe(2);
    expect(slotCount({ lab1: 1, lab2: 1 }, GER)).toBe(5);
    expect(slotCount({ lab1: 1, lab2: 1 }, SWI)).toBe(4);
    expect(RES.SLOTS_MAX).toBe(5);
  });
  it('techList: stavy a roky; zamčené mají chybějící předpoklady', () => {
    const l = techList(s, 'GER');
    expect(l).toHaveLength(TECH_IDS.length);
    expect(l.find((t) => t.id === 'pusky2').status).toBe('available');
    const m = l.find((t) => t.id === 'mtank');
    expect(m.status).toBe('locked');
    expect(m.missing).toEqual(['ltank2']);
    expect(m.ahead).toBeGreaterThan(1.5);
    expect(l.find((t) => t.id === 'pusky2').ahead).toBe(0);
  });
  it('yearOf: začátek 1936, po roce 1937', () => {
    expect(yearOf(0)).toBe(1936);
    expect(yearOf(8766)).toBeCloseTo(1937, 5);
  });
});

describe('příkazy', () => {
  const s = createGame({ player: 'GER' });
  it('zadání a zrušení výzkumu; neplatný vstup vrací tentýž stav', () => {
    const a = startResearch(s, GER, 0, 'pusky2');
    expect(a).not.toBe(s);
    expect(a.tech.own[GER].slots).toEqual(['pusky2', 0, 0]);
    expect(a.tech.ver).toBe(s.tech.ver + 1);
    expect(s.tech.own[GER].slots).toEqual([0, 0, 0]);
    expect(startResearch(a, GER, 1, 'pusky2')).toBe(a);     // už se zkoumá
    expect(startResearch(s, GER, 0, 'mtank')).toBe(s);       // chybí předpoklady
    expect(startResearch(s, GER, 3, 'pusky2')).toBe(s);      // slot neexistuje
    expect(startResearch(s, GER, -1, 'pusky2')).toBe(s);
    expect(startResearch(s, GER, 0, 'nic')).toBe(s);
    expect(startResearch(s, 0, 0, 'pusky2')).toBe(s);
    expect(startResearch(s, 999, 0, 'pusky2')).toBe(s);
    expect(cancelResearch(a, GER, 1)).toBe(a);
    expect(cancelResearch(a, GER, 0).tech.own[GER].slots).toEqual([0, 0, 0]);
  });
  it('přepsání slotu zachová rozpracované', () => {
    let a = startResearch(s, GER, 0, 'pusky2');
    a = day(a, 10);
    const p = a.tech.own[GER].prog.pusky2;
    expect(p).toBeGreaterThan(0.1);
    a = startResearch(a, GER, 0, 'dela2');
    expect(a.tech.own[GER].slots[0]).toBe('dela2');
    expect(a.tech.own[GER].prog.pusky2).toBe(p);
    a = startResearch(a, GER, 1, 'pusky2');
    expect(researchOf(a, 'GER').slots[1].p).toBe(p);
  });
});

describe('průběh', () => {
  const s0 = createGame({ player: 'GER' });
  it('technologie s rokem 1936 se dokončí za dny / rychlost, a postupně se hlásí postup', () => {
    let a = startResearch(s0, GER, 0, 'pusky2');   // 70 dní, GER ×1,1
    const r = researchOf(a, 'GER');
    expect(r.speed).toBeCloseTo(1.1, 5);
    expect(r.slots[0].eta).toBe(Math.ceil(70 / 1.1));
    a = day(a, 60);
    expect(a.tech.own[GER].done.pusky2).toBeUndefined();
    a = day(a, 6);
    expect(a.tech.own[GER].done.pusky2).toBe(1);
    expect(a.tech.own[GER].slots[0]).toBe(0);
    expect(a.tech.own[GER].prog.pusky2).toBeUndefined();
    expect(a.mil.lv[GER]).toEqual({ pusky: 2 });
    expect(a.mil.ver).toBeGreaterThan(s0.mil.ver);
    expect(isAvailable(a.tech.own[GER], 'pusky3')).toBe(true);
  });
  it('předstih zpomaluje: technologie z roku 1940 trvá mnohem déle než její délka', () => {
    const a = give(s0, GER, ['pusky2']);
    const b = startResearch(a, GER, 0, 'pusky3');   // 1940, 100 dní
    const r = researchOf(b, 'GER').slots[0];
    expect(r.ahead).toBeGreaterThan(3.5);
    expect(r.eta).toBeGreaterThan(100 / 1.1 * 4);
    // s přibývajícím časem se předstih zmenšuje
    const later = { ...b, tick: 24 * 365 * 3 };
    expect(researchOf(later, 'GER').slots[0].eta).toBeLessThan(r.eta);
  });
  it('rychlost: bonusy výzkumu a národní násobek', () => {
    const a = give(s0, GER, ['vyz1', 'vyz2']);
    expect(researchOf(a, 'GER').speed).toBeCloseTo(1.1 * 1.2, 5);
    expect(researchOf(s0, 'SWI').speed).toBeCloseTo(1.05, 5);
    expect(researchOf(s0, 'SOV').speed).toBeCloseTo(0.9, 5);
  });
  it('dokončená laboratoř přidá slot a dokončená technologie nezmění ostatní země', () => {
    const a0 = { ...give(s0, GER, ['vyz1']), tick: 24 * 365 * 3 };   // v roce 1939 už předstih nehrozí
    let a = startResearch(a0, GER, 0, 'lab1');
    a = day(a, 140);
    expect(a.tech.own[GER].done.lab1).toBe(1);
    expect(a.tech.own[GER].slots).toHaveLength(4);
    expect(a.tech.own[SOV].done.lab1).toBeUndefined();
  });
});

describe('účinky technologií', () => {
  const s0 = createGame({ player: 'GER' });
  it('úroveň výzbroje zvedne statistiky šablon a pohledy na divize/šablony', () => {
    const tpl = s0.mil.tpl.findIndex((t) => t && t.o === GER);
    const base = templateView(s0, tpl).stats;
    const s1 = give(s0, GER, ['pusky2', 'dela2']);
    const up = templateView(s1, tpl).stats;
    expect(up.soft).toBeGreaterThan(base.soft);
    expect(up.def).toBeGreaterThan(base.def);
    expect(up.hp).toBe(base.hp);
    expect(up.men).toBe(base.men);
    const div = s1.mil.divs.findIndex((d) => d && d.o === GER);
    expect(divisionView(s1, div).stats.soft).toBeGreaterThan(divisionView(s0, div).stats.soft);
    // stejná úroveň = tatáž statistika (mezipaměť podle objektu úrovní)
    expect(templateView(s1, tpl).stats).toBe(templateView(s1, tpl).stats);
    // jiná země nedotčena
    const fr = s1.mil.divs.findIndex((d) => d && d.o === idx('FRA'));
    expect(divisionView(s1, fr).stats.soft).toBe(divisionView(s0, fr).stats.soft);
    expect(deriveStats(s0.mil.tpl[tpl], { pusky: 2 }).soft).toBeGreaterThan(deriveStats(s0.mil.tpl[tpl]).soft);
  });

  it('odemykání: mtank odemkne prapor i výzbroj; bez něj šablona i linka neprojdou', () => {
    const tank = { nm: 'Střední tanková', reg: [['mtank', 'mtank'], ['mtank']], sup: [] };
    expect(createTemplate(s0, 'GER', tank)).toBe(s0);
    const s1 = give(s0, GER, ['ltank2', 'mtank']);
    expect(isUnlocked(s1, GER, 'mtank')).toBe(true);
    expect(isUnlocked(s0, GER, 'mtank')).toBe(false);
    expect(isUnlocked(s0, GER, null)).toBe(true);
    expect(createTemplate(s1, 'GER', tank)).not.toBe(s1);
    // linka na střední tanky
    const line = s0.ind.lines.find((l) => l.o === GER && l.eq === 'pusky');
    expect(setLineEquip(s0, line.id, 'mtanky')).toBe(s0);
    expect(setLineEquip(s1, line.id, 'mtanky')).not.toBe(s1);
    const free = { ...s1, ind: { ...s1.ind, lines: s1.ind.lines.filter((l) => l.o !== GER) } };
    expect(addLine(free, GER, 'mtanky', 2)).not.toBe(free);
    expect(addLine({ ...s0, ind: free.ind }, GER, 'mtanky', 2).ind.lines.length).toBe(free.ind.lines.length);
  });

  it('vyšší úroveň zdražuje výrobu kusu', () => {
    const s1 = give(s0, GER, ['pusky2', 'pusky3']);
    const a = industryOf(s0, 'GER').lines.find((l) => l.eq === 'pusky');
    const b = industryOf(s1, 'GER').lines.find((l) => l.eq === 'pusky');
    expect(b.cost).toBeGreaterThan(a.cost);
    expect(b.rate).toBeLessThan(a.rate);
  });

  it('bonusy průmyslu: strop efektivity, body stavby, těžba', () => {
    const s1 = give(s0, GER, ['org1', 'org2', 'stav1', 'tez1']);
    expect(techMods(s1.tech.own[GER].done)).toMatchObject({ effCap: 0.1, build: 0.1, extract: 0.1, research: 0 });
    expect(industryOf(s1, 'GER').effCap).toBeCloseTo(0.6, 9);
    expect(industryOf(s1, 'GER').points).toBeCloseTo(industryOf(s0, 'GER').points * 1.1, 6);
    expect(industryOf(s1, 'GER').res.ocel.ext).toBeCloseTo(industryOf(s0, 'GER').res.ocel.ext * 1.1, 6);
    // linky rostou nad původní strop
    let a = s1;
    for (let i = 0; i < 400; i++) a = day(a, 1);
    const l = a.ind.lines.find((x) => x.o === GER && x.eq === 'pusky');
    expect(l.eff).toBeGreaterThan(0.5);
    expect(l.eff).toBeLessThanOrEqual(0.6 + 1e-9);
  });

  it('techMods je nulové pro zemi bez technologií a se stejným `done` vrací tentýž objekt', () => {
    const d = s0.tech.own[GER].done;
    expect(techMods(d)).toBe(techMods(d));
    expect(techMods(d).effCap).toBe(0);
    expect(techMods(null).build).toBe(0);
  });
});

describe('země bez hráče', () => {
  it('AI si sama plní sloty technologiemi, jejichž čas nastal, a časem je dokončí', () => {
    const s = createGame({ player: 'GER' });
    let a = day(s, 1);
    expect(a.tech.own[SOV].slots.every(Boolean)).toBe(true);
    for (const id of a.tech.own[SOV].slots) expect(TECHS[id].year).toBeLessThanOrEqual(1936);
    expect(a.tech.own[GER].slots).toEqual([0, 0, 0]);   // hráč si řídí sám
    a = day(a, 120);
    expect(Object.keys(a.tech.own[SOV].done).length).toBeGreaterThanOrEqual(2);
    for (const id in a.tech.own[SOV].done) expect(TECHS[id].year).toBeLessThanOrEqual(1936);
  });
  it('pozorovatel: všechny země se zlepšují', () => {
    const a = day(createGame({ player: null }), 1);
    expect(a.tech.own[GER].slots.every(Boolean)).toBe(true);
  });
});

describe('čistota a determinismus', () => {
  it('výzkum o půlnoci; ostatní hodiny nemění objekt `tech`', () => {
    const a = day(createGame({ player: 'GER' }), 1);
    expect(advanceHour(a).tech).toBe(a.tech);
  });
  it('90 dní: původní stav se nemění, dělení kroků nevadí, JSON zůstává čistý', () => {
    let s = createGame({ player: 'GER' });
    s = startResearch(startResearch(s, GER, 0, 'pusky2'), GER, 1, 'org1');
    const snap = JSON.stringify(s);
    const a = advance(s, 24 * 90);
    expect(JSON.stringify(s)).toBe(snap);
    let b = s;
    for (let i = 0; i < 90; i++) b = advance(b, 24);
    expect(JSON.stringify(b.tech)).toBe(JSON.stringify(a.tech));
    expect(JSON.stringify(b.mil.lv)).toBe(JSON.stringify(a.mil.lv));
    expect(JSON.parse(JSON.stringify(a.tech))).toEqual(a.tech);
    expect(a.mil.lv[GER].pusky).toBe(2);
  });
  it('stavy: po dokončení a zahájení se hra drží invariantů slotů a postupu', () => {
    let s = createGame({ player: 'GER' });
    s = advance(s, 24 * 365);
    for (let o = 1; o < s.tech.own.length; o++) {
      const e = s.tech.own[o];
      expect(e.slots).toHaveLength(slotCount(e.done, o));
      expect(new Set(e.slots.filter(Boolean)).size).toBe(e.slots.filter(Boolean).length);
      for (const id of e.slots.filter(Boolean)) { expect(e.done[id]).toBeUndefined(); expect(isAvailable(e, id)).toBe(true); }
      for (const id in e.prog) { expect(e.prog[id]).toBeGreaterThanOrEqual(0); expect(e.prog[id]).toBeLessThan(1); }
      for (const id in e.done) for (const r of TECHS[id].req) expect(e.done[r]).toBe(1);
    }
    expect(s.tech.ver).toBeGreaterThan(0);
  });
});
