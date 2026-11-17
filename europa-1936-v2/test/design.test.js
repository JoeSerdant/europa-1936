// Návrhář výzbroje (M97): data modulů, násobky návrhu, příkaz setDesign (zkušenosti, přezbrojení linek), účinky na divize, cenu výroby, lodě a letadla, AI.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, validateState, DESIGN_TYPES, DESIGN_TYPE_IDS, DESIGN_CATS, MODULES, MODULE_IDS, TECHS, DESIGN,
  setDesign, designBlock, designCost, designMult, designOf, fits, ONE, packGame, unpackGame,
} from '../src/engine/index.js';
import { statsOf } from '../src/engine/army/unit.js';
import { itemCost } from '../src/engine/industry/core.js';
import { fleetPower } from '../src/engine/nav/core.js';
import { aiDesign, bestDesign } from '../src/engine/ai/design.js';
import { BATTALIONS } from '../src/data/army/index.js';

const W = getWorld();
const GER = W.ownerIdx.GER;
const rich = (s, o = GER) => { const own = s.doc.own.slice(); own[o] = { ...own[o], xp: { land: 200, air: 200, sea: 200 } }; return { ...s, doc: { ...s.doc, own } }; };
const withTech = (s, ids, o = GER) => { const own = s.tech.own.slice(); own[o] = { ...own[o], done: { ...own[o].done, ...Object.fromEntries(ids.map((x) => [x, 1])) } }; return { ...s, tech: { ...s.tech, own } }; };

describe('data', () => {
  it('moduly patří do slotů svých typů, odemykají je existující technologie, typy jsou tanky, lodě a letadla', () => {
    for (const id of MODULE_IDS) {
      const m = MODULES[id];
      expect(DESIGN_CATS[m.cat]).toBeTruthy();
      if (m.unlock) expect(TECHS[m.unlock], `${id}: ${m.unlock}`).toBeTruthy();
      expect(DESIGN_TYPE_IDS.some((t) => fits(t, m.slot, id))).toBe(true);
    }
    expect(DESIGN_TYPE_IDS).toEqual(expect.arrayContaining(['ltanky', 'mtanky', 'htanky', 'dd', 'ca', 'bb', 'ss', 'cv', 'sti', 'bit', 'tac', 'str', 'pal']));
    for (const t of DESIGN_TYPE_IDS) expect(DESIGN_TYPES[t].slots.length).toBeGreaterThanOrEqual(3);
  });
  it('násobky: bez návrhu 1, s návrhem 1 + součet účinků', () => {
    expect(designMult(null)).toBe(ONE);
    const d = designMult({ mods: { zbran: 'tk_kan_l', pancir: 'pan_nyt' } });
    expect(d.atk).toBeCloseTo(1.05, 6);
    expect(d.armor).toBeCloseTo(1.08, 6);
    expect(d.cost).toBeCloseTo(1.09, 6);
    expect(fits('ltanky', 'zbran', 'tk_kan_t')).toBe(false);   // těžký kanón jen do těžkého tanku
  });
});

describe('zavedení návrhu', () => {
  it('stojí zkušenosti, uloží návrh do úrovní výzbroje a přezbrojí linky; neplatný vstup stav nemění', () => {
    const s = rich(createGame({ player: 'GER' }));
    const mods = { zbran: 'tk_kan_l', pancir: 'pan_nyt' };
    expect(designBlock(s, GER, 'ltanky', mods)).toBeNull();
    const line = s.ind.lines.find((l) => l.o === GER && l.eq === 'ltanky');
    const t = setDesign(s, GER, 'ltanky', mods, 'Můj tank');
    expect(designOf(t.mil.lv[GER], 'ltanky')).toEqual({ nm: 'Můj tank', mods });
    expect(t.doc.own[GER].xp.land).toBe(200 - designCost(s, GER, 'ltanky', mods));
    if (line) expect(t.ind.lines.find((l) => l.id === line.id).eff).toBeCloseTo(line.eff * DESIGN.RETOOL, 6);
    expect(setDesign(t, GER, 'ltanky', mods)).toBe(t);   // beze změny
    expect(designBlock(t, GER, 'ltanky', mods)).toMatch(/neliší/);
    expect(setDesign(s, GER, 'ltanky', { zbran: 'tk_kan_s' })).toBe(s);   // chybí technologie
    expect(designBlock(s, GER, 'ltanky', { zbran: 'tk_kan_s' })).toMatch(/technologie/);
    expect(setDesign(s, GER, 'xx', mods)).toBe(s);
    expect(setDesign(createGame({ player: 'GER' }), GER, 'ltanky', { zbran: 'tk_kan_l', pancir: 'pan_nyt', dopl: null, motor: null }).doc.own[GER].xp.land).toBeLessThan(200);
    expect(validateState(t)).toBeNull();
    const r = unpackGame(JSON.parse(JSON.stringify(packGame(t))));
    expect(designOf(r.state.mil.lv[GER], 'ltanky').nm).toBe('Můj tank');
  });
  it('návrh mění útok a pancíř tankových divizí, cenu výroby, sílu lodí', () => {
    let s = rich(createGame({ player: null }));
    const id = s.mil.divs.findIndex((d) => d && d.o === GER && s.mil.tpl[d.tpl].reg.flat().some((b) => BATTALIONS[b] && BATTALIONS[b].kind === 'ltanky'));
    const before = id > 0 ? statsOf(s.mil, s.mil.divs[id]) : null;
    const c0 = itemCost('ltanky', s.mil.lv[GER]);
    s = setDesign(s, GER, 'ltanky', { zbran: 'tk_kan_l', pancir: 'pan_nyt' });
    if (before) {
      const after = statsOf(s.mil, s.mil.divs[id]);
      expect(after.hard).toBeGreaterThan(before.hard);
      expect(after.armor).toBeGreaterThan(before.armor);
    }
    expect(itemCost('ltanky', s.mil.lv[GER])).toBeCloseTo(c0 * 1.09, 6);
    expect(itemCost('pusky', s.mil.lv[GER])).toBe(itemCost('pusky', null));
    const ships = { dd: 5 };
    const p0 = fleetPower(s, GER, ships);
    s = setDesign(s, GER, 'dd', { vyzbroj: 'lv_tor', ochrana: 'lo_pas' });
    const p1 = fleetPower(s, GER, ships);
    expect(p1.atk).toBeCloseTo(p0.atk * 1.08, 6);
    expect(p1.hp).toBeCloseTo(p0.hp * 1.1, 6);
  });
});

describe('AI', () => {
  it('vybere nejlepší odemčené moduly a návrh zavede jen s rezervou zkušeností', () => {
    let s = withTech(rich(createGame({ player: null, aiLevel: 2 })), ['mtank', 'tank_rad', 'ltank2']);
    const best = bestDesign(s, GER, 'ltanky');
    expect(best.zbran).toBe('tk_kan_s');
    expect(best.dopl).toBe('tk_rad');
    const day = (o) => { for (let d = 0; d < DESIGN.AI_DAYS; d++) if ((d + o * 7) % DESIGN.AI_DAYS === 0) return d; return 0; };
    s = { ...s, tick: day(GER) * 24 };
    const t = aiDesign(s, GER);
    const types = s.ind.lines.filter((l) => l.o === GER && DESIGN_TYPES[l.eq]).map((l) => l.eq);
    if (types.length) expect(t).not.toBe(s);
    const poor = { ...s, doc: { ...s.doc, own: s.doc.own.map((x, i) => (i === GER ? { ...x, xp: { land: 5, air: 5, sea: 5 } } : x)) } };
    expect(aiDesign(poor, GER)).toBe(poor);
  });
});
