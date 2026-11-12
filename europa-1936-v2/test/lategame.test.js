// Pozdní hra (M82): nové technologie do roku 1945, syntetické palivo, rakety, výroba a svržení atomové bomby, AI, stav a texty.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, declareWar, validateState, GAME_VERSION, packGame, unpackGame, TECHS, TECH_IDS, PLANES, AIR_PROD, AIR, grantTech, fuelDay, FUEL,
  nukeBlock, dropNuke, nukeView, nukeCarrier, nukeProduction, NUKE_TECH, setMission,
} from '../src/engine/index.js';
import { tallyOwners } from '../src/engine/industry/core.js';
import { aiAir } from '../src/engine/ai/air.js';
import { logLine, logImportant } from '../src/ui/logText.js';
import { popupFor } from '../src/ui/popups.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const GER = idx('GER'), PLN = idx('POL'), FRA = idx('FRA');
/** Přidá zemi křídlo přímo do stavu (bez ohledu na kapacitu letiště a rezervu). */
function addWing(s, o, t, n) {
  const base = s.air.wings.find((wg) => wg && wg.o === o).s, id = s.air.wings.length;
  return { ...s, air: { ...s.air, wn: id, wings: [...s.air.wings, { id, o, t, n, s: base, m: null, to: 0, c: 0, a: 0 }] } };
}
const withNuke = (s, o, n = 1) => { const nuke = s.air.nuke.slice(); nuke[o] = { n, p: 0 }; return { ...s, air: { ...s.air, nuke } }; };
/** Německo ve válce s Polskem, s bombou a křídlem strategických bombardérů. */
function armed() {
  let s = declareWar(createGame({ player: null, aiLevel: 0 }), 'GER', 'POL');
  s = withNuke(s, GER);
  s = addWing(s, GER, 'str', 40);
  s = { ...s, air: { ...s.air, wings: s.air.wings.map((wg) => (wg && wg.o === PLN ? { ...wg, m: null, to: 0 } : wg)) } };   // polské hlídky na zemi
  let target = 0, best = -1;
  for (let x = 1; x < W.states.length; x++) if (s.stateOwner[x] === PLN) { const e = s.ind.st[x], f = (e.civ || 0) + (e.mil || 0); if (f > best) { best = f; target = x; } }
  return { s, target };
}

describe('technologie', () => {
  it('nové technologie existují, mají platné předpoklady a roky do 1945', () => {
    for (const id of ['sti4', 'rakety', 'rakety2', 'jadro1', 'jadro2', 'jadro3', 'org4', 'tez3', 'vyz3', 'lab3', 'synt1', 'synt2']) {
      expect(TECHS[id], id).toBeTruthy();
      for (const r of TECHS[id].req) expect(TECHS[r], `${id}→${r}`).toBeTruthy();
    }
    expect(Math.max(...TECH_IDS.map((id) => TECHS[id].year))).toBe(1945);
    expect(TECH_IDS.length).toBeGreaterThanOrEqual(52);
    expect(TECHS.jadro3.req).toEqual(['jadro2', 'strbomb']);
  });
  it('syntetické palivo zvyšuje výrobu paliva', () => {
    const s = createGame({ player: null });
    const tally = tallyOwners(s), oil = new Array(W.owners.length).fill(0);
    const base = fuelDay(s, oil, tally).ind.fuel[GER].g;
    const t = grantTech(s, GER, 'synt1');
    expect(fuelDay(t, oil, tallyOwners(t)).ind.fuel[GER].g).toBeCloseTo(base * 1.25, 6);
    expect(FUEL.BASE).toBeGreaterThan(0);
  });
});

describe('rakety', () => {
  it('raketa je letoun pro bombardování, odemyká ji technologie a má výrobní cenu', () => {
    expect(PLANES.rak).toMatchObject({ rocket: true, unlock: 'rakety', roles: ['bomb'] });
    expect(AIR_PROD.rak.cost).toBeGreaterThan(0);
  });
  it('křídlo raket na misi nikdo nezastaví, ale denně se spotřebuje', () => {
    let s = declareWar(createGame({ player: null, aiLevel: 0 }), 'GER', 'POL');
    s = grantTech(grantTech(grantTech(s, GER, 'tac2'), GER, 'strbomb'), GER, 'rakety');
    s = addWing(s, GER, 'rak', 100);
    const id = s.air.wings.length - 1;
    let target = 0;
    for (let x = 1; x < W.states.length && !target; x++) if (s.stateOwner[x] === PLN) target = x;
    s = setMission(s, id, 'bomb', target);
    expect(s.air.wings[id].m).toBe('bomb');
    const ws0 = s.pol.own[PLN].ws;
    const t = advance(s, 24);
    expect(t.air.wings[id].n).toBe(100 - Math.floor(100 * AIR.ROCKET_USE));
    expect(t.pol.own[PLN].ws).toBeLessThan(ws0 + 0.01);
  });
});

describe('výroba bomb', () => {
  it('bez technologie se nic nevyrábí; s ní přibude bomba po NUKE_DAYS dnech, nejvýš NUKE_MAX', () => {
    const s = createGame({ player: null });
    expect(s.air.nuke[GER]).toEqual({ n: 0, p: 0 });
    expect(nukeProduction(s)).toBeNull();
    let t = s;
    for (const id of ['vyz1', 'vyz2', 'jadro1', 'jadro2', 'tac2', 'strbomb', NUKE_TECH]) t = grantTech(t, GER, id);
    const p1 = nukeProduction(t);
    expect(p1.nuke[GER]).toEqual({ n: 0, p: 1 });
    expect(p1.ready).toEqual([]);
    const nuke = t.air.nuke.slice(); nuke[GER] = { n: 0, p: AIR.NUKE_DAYS - 1 };
    const p2 = nukeProduction({ ...t, air: { ...t.air, nuke } });
    expect(p2.nuke[GER]).toEqual({ n: 1, p: 0 });
    expect(p2.ready).toEqual([GER]);
    expect(nukeProduction(withNuke(t, GER, AIR.NUKE_MAX))).toBeNull();
    const day = advance({ ...t, player: 'GER' }, 24);
    expect(day.air.nuke[GER].p).toBe(1);
    expect(validateState(day)).toBeNull();
  });
});

describe('svržení bomby', () => {
  it('podmínky: bomba, válka, křídlo strategických bombardérů v dosahu a vzdušná převaha', () => {
    const { s, target } = armed();
    expect(nukeCarrier(s, GER, target)).toBeGreaterThan(0);
    expect(nukeBlock(s, GER, target)).toBeNull();
    expect(nukeBlock(withNuke(s, GER, 0), GER, target)).toMatch(/technologie|hotová/);
    let fr = 0;
    for (let x = 1; x < W.states.length && !fr; x++) if (s.stateOwner[x] === FRA) fr = x;
    expect(nukeBlock(s, GER, fr)).toMatch(/válčíte/);
    const noWing = { ...s, air: { ...s.air, wings: s.air.wings.map((wg) => (wg && wg.t === 'str' ? null : wg)) } };
    expect(nukeBlock(noWing, GER, target)).toMatch(/křídlo/);
    const pw = s.air.wings.findIndex((wg) => wg && wg.o === PLN);
    const wings = s.air.wings.slice();
    wings[pw] = { ...wings[pw], t: 'sti', n: 80, m: 'air', to: target };
    expect(nukeBlock({ ...s, air: { ...s.air, wings } }, GER, target)).toMatch(/převahu/);
    expect(dropNuke(noWing, GER, target)).toBe(noWing);
  });
  it('úder zničí část továren, oslabí divize ve státě, otřese zemí a zapíše se', () => {
    const { s, target } = armed();
    const before = s.ind.st[target];
    const inState = new Set(W.states[target].v);
    const div = s.mil.divs.findIndex((d) => d && inState.has(d.p));
    const t = dropNuke(s, GER, target);
    expect(t.air.nuke[GER].n).toBe(0);
    expect(t.ind.st[target].civ).toBe(Math.floor((before.civ || 0) * (1 - AIR.NUKE_FACTORY)));
    expect(t.ind.st[target].mil).toBe(Math.floor((before.mil || 0) * (1 - AIR.NUKE_FACTORY)));
    expect(t.pol.own[PLN].stab).toBeCloseTo(Math.max(0, s.pol.own[PLN].stab - AIR.NUKE_STAB), 6);
    expect(t.pol.own[PLN].ws).toBeCloseTo(Math.max(0, s.pol.own[PLN].ws - AIR.NUKE_WS), 6);
    if (div > 0) expect(t.mil.divs[div].hp).toBeCloseTo(s.mil.divs[div].hp * AIR.NUKE_UNITS, 6);
    expect(t.log.items.some((e) => e.k === 'nuke' && e.o === GER && e.x === target && e.b === PLN)).toBe(true);
    expect(validateState(t)).toBeNull();
    expect(dropNuke(t, GER, target)).toBe(t);
  });
  it('přehled pro rozhraní řadí cíle a AI hotovou bombu použije', () => {
    const { s, target } = armed();
    const v = nukeView(s, GER);
    expect(v.n).toBe(1);
    expect(v.targets.length).toBeGreaterThan(0);
    expect(v.targets[0].block).toBeNull();
    expect(v.targets.some((t) => t.s === target)).toBe(true);
    expect(nukeView(createGame({ player: null }), GER)).toMatchObject({ tech: false, n: 0, targets: [] });
    const ai = aiAir({ ...s, ai: { ...s.ai, level: 2 } }, GER);
    expect(ai.air.nuke[GER].n).toBe(0);
    expect(ai.log.items.some((e) => e.k === 'nuke')).toBe(true);
  });
});

describe('stav a texty', () => {
  it('verze hry, kontrola stavu, uložení a texty', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(39);
    const s = createGame({ player: null });
    expect(validateState({ ...s, air: { ...s.air, nuke: null } })).toMatch(/jaderné/);
    expect(unpackGame(JSON.parse(JSON.stringify(packGame(withNuke(s, GER, 2))))).state.air.nuke[GER].n).toBe(2);
    const e = { k: 'nuke', o: GER, x: 5, b: PLN };
    expect(logLine(e, PLN).text).toMatch(/atomovou bombu/);
    expect(logImportant(e, FRA)).toBe(true);
    expect(popupFor(e, PLN)).toMatchObject({ kind: 'nuke', sticky: true });
    expect(popupFor(e, FRA)).toMatchObject({ kind: 'nuke' });
    expect(popupFor({ k: 'nukeready', o: GER }, GER)).toMatchObject({ kind: 'nukeready' });
    expect(logLine({ k: 'nukeready', o: GER }, GER).tone).toBe('good');
  });
});
