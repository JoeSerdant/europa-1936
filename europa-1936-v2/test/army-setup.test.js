// M18 – počáteční armády, statistiky divizí, šablony.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, deriveStats, validateTemplate, divisionName, allCountries, supplyFlow, ARMY, BATTALIONS, SUPPORT, TPL_KINDS, EQUIP_IDS,
} from '../src/engine/index.js';
import { NATIONAL } from '../src/data/army/index.js';

const W = getWorld();

describe('počáteční armády', () => {
  const s = createGame({ player: 'GER' });
  const m = s.mil;

  it('všechny odkazy jsou platné a patří téže zemi', () => {
    for (let id = 1; id < m.divs.length; id++) {
      const d = m.divs[id];
      expect(d, `divize ${id}`).toBeTruthy();
      const tpl = m.tpl[d.tpl];
      expect(tpl && tpl.o, `šablona divize ${id}`).toBe(d.o);
      expect(s.ctrl[d.p], `provincie divize ${id}`).toBe(d.o);
      expect(W.isLand(d.p)).toBe(true);
      if (d.army) { expect(m.armies[d.army].o).toBe(d.o); }
      expect(d.org).toBeGreaterThan(0);
      expect(d.hp).toBeGreaterThan(0);
      expect(d.path).toEqual([]);
      expect(d.b).toBe(0);
    }
    for (let id = 1; id < m.armies.length; id++) {
      const a = m.armies[id];
      expect(a.cmd).toBeGreaterThan(0);
      expect(m.gens[a.cmd].o).toBe(a.o);
      if (a.grp) expect(m.groups[a.grp].o).toBe(a.o);
      expect(m.divs.filter((d) => d && d.army === id).length).toBeLessThanOrEqual(ARMY.ARMY_CAP);
    }
    for (let id = 1; id < m.groups.length; id++) {
      const g = m.groups[id];
      expect(m.gens[g.cmd].r).toBe('M');
      expect(m.armies.filter((a) => a && a.grp === id).length).toBeLessThanOrEqual(ARMY.GROUP_CAP);
    }
  });

  it('žádný velitel nevelí dvakrát', () => {
    const seen = new Set();
    for (const a of m.armies) if (a) { expect(seen.has(a.cmd)).toBe(false); seen.add(a.cmd); }
    for (const g of m.groups) if (g) { expect(seen.has(g.cmd)).toBe(false); seen.add(g.cmd); }
  });

  it('počty divizí odpovídají národním sestavám', () => {
    for (const c of allCountries()) {
      const nat = NATIONAL[c.tag];
      const want = nat ? Object.values(nat.divs).reduce((a, b) => a + b, 0) : 0;
      const have = m.divs.filter((d) => d && d.o === c.idx).length;
      expect(have, c.tag).toBe(want);
    }
  });

  it('sklady a lidská síla nejsou záporné a odpovídají zemím', () => {
    for (const c of allCountries()) {
      expect(m.man[c.idx], c.tag).toBeGreaterThan(0);
      for (const e of EQUIP_IDS) expect(m.stock[c.idx][e]).toBeGreaterThanOrEqual(0);
    }
  });

  it('divize stojí tam, kde je zásobování (aspoň na jednu divizi v provincii)', () => {
    const per = new Map();
    for (const d of m.divs) if (d) per.set(d.o * 4096 + d.p, (per.get(d.o * 4096 + d.p) || 0) + 1);
    let short = 0;
    for (const d of m.divs) {
      if (!d) continue;
      const cap = supplyFlow(s.ctrl, d.o)[d.p] * ARMY.SUP_CAPACITY;
      if (cap < 0.6 * per.get(d.o * 4096 + d.p)) short++;
    }
    expect(short).toBeLessThanOrEqual(4);
  });

  it('je čistý JSON a vzniká deterministicky', () => {
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    expect(createGame({ player: 'GER' })).toEqual(s);
    expect(createGame({ player: 'GER', seed: 7 }).mil.gens).not.toEqual(s.mil.gens);
  });
});

describe('statistiky divize', () => {
  const pesi = { o: 1, nm: 'Test', reg: TPL_KINDS.pesi.reg, sup: TPL_KINDS.pesi.sup };

  it('součty a průměry odpovídají praporům', () => {
    const st = deriveStats(pesi);
    const nb = 9;
    expect(st.width).toBe(nb * BATTALIONS.pesi.w);
    expect(st.hp).toBe(nb * BATTALIONS.pesi.hp + SUPPORT.ing.hp + SUPPORT.del.hp);
    expect(st.men).toBe(nb * BATTALIONS.pesi.men + SUPPORT.ing.men + SUPPORT.del.men);
    expect(st.org).toBe(BATTALIONS.pesi.org);
    expect(st.speed).toBe(BATTALIONS.pesi.spd);
    expect(st.cls).toBe('inf');
    expect(st.need.pusky).toBe(nb * BATTALIONS.pesi.need.pusky + SUPPORT.ing.need.pusky);
    expect(st.need.dela).toBe(SUPPORT.del.need.dela);
    expect(st.days).toBe(Math.max(BATTALIONS.pesi.days, SUPPORT.ing.days, SUPPORT.del.days));
  });

  it('tanková divize je pancéřová, rychlá a má průraz i pancíř', () => {
    const t = { o: 1, nm: 'Tank', reg: TPL_KINDS.tank.reg, sup: TPL_KINDS.tank.sup };
    const st = deriveStats(t), inf = deriveStats(pesi);
    expect(st.cls).toBe('arm');
    expect(st.speed).toBeGreaterThan(inf.speed);
    expect(st.armor).toBeGreaterThan(0);
    expect(st.pierce).toBeGreaterThan(inf.pierce);
    expect(st.hardness).toBeGreaterThan(inf.hardness);
    expect(st.sup).toBeGreaterThan(inf.sup);
  });

  it('nejpomalejší prapor určuje rychlost, ale podpora ji neomezuje', () => {
    const mixed = { o: 1, nm: 'Mix', reg: [['pesi', 'ltank']], sup: ['ing', 'del'] };
    expect(deriveStats(mixed).speed).toBe(BATTALIONS.pesi.spd);
  });

  it('úroveň výzbroje násobí bojové hodnoty příslušného druhu', () => {
    const base = deriveStats(pesi), up = deriveStats(pesi, { pusky: 2 });
    expect(up.soft).toBeGreaterThan(base.soft);
    expect(up.def).toBeGreaterThan(base.def);
    expect(up.hp).toBe(base.hp);
  });

  it('výsledek je pro stejnou šablonu stejný objekt (mezipaměť)', () => {
    expect(deriveStats(pesi)).toBe(deriveStats(pesi));
  });

  it('jména divizí', () => {
    expect(divisionName(TPL_KINDS.pesi, 3)).toBe('3. pěší divize');
    expect(divisionName({ nm: 'Moje Divize' }, 12)).toBe('12. moje divize');
  });
});

describe('kontrola šablon', () => {
  const ok = { nm: 'Pěchota', reg: [['pesi', 'pesi'], ['pesi']], sup: ['del'] };
  it('správná šablona projde', () => expect(validateTemplate(ok)).toBeNull());
  it('odmítne špatné tvary', () => {
    expect(validateTemplate(null)).toBeTruthy();
    expect(validateTemplate({ ...ok, nm: '  ' })).toBeTruthy();
    expect(validateTemplate({ ...ok, reg: [] })).toBeTruthy();
    expect(validateTemplate({ ...ok, reg: [[]] })).toBeTruthy();
    expect(validateTemplate({ ...ok, reg: Array.from({ length: 6 }, () => ['pesi']) })).toBeTruthy();
    expect(validateTemplate({ ...ok, reg: [Array.from({ length: 6 }, () => 'pesi')] })).toBeTruthy();
    expect(validateTemplate({ ...ok, reg: [['neexistuje']] })).toBeTruthy();
    expect(validateTemplate({ ...ok, sup: ['del', 'del', 'del', 'del', 'del', 'del'] })).toBeTruthy();
    expect(validateTemplate({ ...ok, sup: ['neexistuje'] })).toBeTruthy();
  });
  it('odmítne prapory čekající na výzkum', () => {
    expect(validateTemplate({ ...ok, reg: [['mtank']] })).toMatch(/odemčen/);
    expect(validateTemplate({ ...ok, sup: ['spoj'] })).toMatch(/odemčen/);
  });
});
