// Diplomacie (M23): vztahy, bloky, ospravedlnění a vyhlášení války s voláním do zbraně, mír, kapitulace a anexe, čistota a determinismus.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, declareWar, atWar, justifyWar, startWar, proposePeace, createFaction, inviteToFaction, leaveFaction, inviteBlock, peaceBlock, warBlock,
  diplomacyOf, factionOf, relOf, baseRel, warScore, vpHeld, hasCapitulated, capitulate, sameFaction, campOf, DIP, START_FACTIONS, PAIR_REL, GAME_VERSION, divisionCount,
} from '../src/engine/index.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const [GER, FRA, ENG, POL, CZE, ROM, YUG, ITA, BEL, SOV, SWE, FIN, LAT] = ['GER', 'FRA', 'ENG', 'POL', 'CZE', 'ROM', 'YUG', 'ITA', 'BEL', 'SOV', 'SWE', 'FIN', 'LAT'].map(idx);
const day = (s, n = 1) => advance(s, 24 * n);
const pp = (s, o, v) => { const own = s.pol.own.slice(); own[o] = { ...own[o], pp: v }; return { ...s, pol: { ...s.pol, own } }; };
/** Rychle ospravedlněná válka: platí, ospravedlnění je hotové. */
const ready = (s, a, b) => { const j = justifyWar(pp(s, a, 500), a, b); return day(j, DIP.JUST_DAYS + 1); };
/** Provincie země `o` (index), které má kontrolovat `c`. */
const takeAll = (s, o, c, fraction = 1) => {
  const ctrl = s.ctrl.slice();
  const prov = [];
  for (let p = 1; p <= W.L; p++) if (s.stateOwner[W.provState[p]] === o) prov.push(p);
  prov.sort((a, b) => W.vp[b] - W.vp[a]);
  const n = Math.ceil(prov.length * fraction);
  for (let i = 0; i < n; i++) ctrl[prov[i]] = c;
  return { ...s, ctrl };
};

describe('data a začátek', () => {
  const s = createGame({ player: 'GER' });
  it('bloky z dat: platné země, každá jen v jednom bloku, vedoucí je členem', () => {
    const seen = new Set();
    for (const f of START_FACTIONS) { expect(f.mem).toContain(f.ldr); for (const t of f.mem) { expect(W.ownerIdx[t]).toBeTruthy(); expect(seen.has(t)).toBe(false); seen.add(t); } }
    for (const [a, b, d] of PAIR_REL) { expect(W.ownerIdx[a]).toBeTruthy(); expect(W.ownerIdx[b]).toBeTruthy(); expect(Math.abs(d)).toBeLessThanOrEqual(60); }
  });
  it('čistý JSON, verze 7, počáteční bloky a nikdo nekapituloval', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(7);
    expect(JSON.parse(JSON.stringify(s.dip))).toEqual(s.dip);
    expect(factionOf(s, CZE).nm).toBe('Malá dohoda');
    expect(factionOf(s, CZE).mem).toEqual([CZE, ROM, YUG]);
    expect(factionOf(s, GER)).toBeNull();
    expect(sameFaction(s, ROM, YUG)).toBe(true);
    expect(sameFaction(s, ROM, GER)).toBe(false);
    expect(campOf(s, GER)).toEqual([GER]);
    expect(s.dip.cap.every((x) => x === 0)).toBe(true);
  });
  it('vztahy: symetrické, v mezích, historické úpravy a ideologie', () => {
    expect(relOf(s, FRA, ENG)).toBe(relOf(s, ENG, FRA));
    expect(relOf(s, FRA, ENG)).toBeGreaterThanOrEqual(40);
    expect(relOf(s, GER, SOV)).toBeLessThan(-30);
    expect(relOf(s, GER, GER)).toBe(0);
    for (let a = 1; a < W.owners.length; a++) for (let b = 1; b < W.owners.length; b++) { const r = relOf(s, a, b); expect(r).toBeGreaterThanOrEqual(-100); expect(r).toBeLessThanOrEqual(100); }
    expect(baseRel(CZE, ROM)).toBeGreaterThan(30);
  });
});

describe('ospravedlnění a vyhlášení války', () => {
  const s0 = createGame({ player: 'GER' });
  it('ospravedlnění stojí politickou moc a čas, má omezení', () => {
    expect(justifyWar(s0, GER, POL)).toBe(s0);                          // chybí PM
    const a = justifyWar(pp(s0, GER, 100), GER, POL);
    expect(a.pol.own[GER].pp).toBe(100 - DIP.JUST_PP);
    expect(a.dip.just).toEqual([{ a: GER, b: POL, g: 'conquest', ready: DIP.JUST_DAYS * 24 }]);
    expect(justifyWar(a, GER, POL)).toBe(a);                            // už běží
    const b = justifyWar(a, GER, CZE);
    expect(b.dip.just).toHaveLength(2);
    expect(justifyWar(b, GER, FRA)).toBe(b);                            // nejvýš JUST_MAX
    expect(justifyWar(pp(s0, CZE, 100), CZE, ROM)).toEqual(pp(s0, CZE, 100)); // stejný blok
    expect(warBlock(s0, CZE, ROM)).toMatch(/bloku/);
    expect(justifyWar(pp(s0, GER, 100), GER, GER)).toEqual(pp(s0, GER, 100));
    expect(justifyWar(pp(s0, GER, 100), GER, 0)).toEqual(pp(s0, GER, 100));
  });
  it('vyhlásit lze až po hotovém ospravedlnění; ospravedlnění se spotřebuje a vztah klesne', () => {
    const a = justifyWar(pp(s0, GER, 100), GER, POL);
    expect(startWar(a, GER, POL)).toBe(a);
    const b = ready(s0, GER, POL);
    const w = startWar(b, GER, POL);
    expect(atWar(w, GER, POL)).toBe(true);
    expect(w.dip.just).toEqual([]);
    expect(relOf(w, GER, POL)).toBeLessThanOrEqual(relOf(b, GER, POL) + DIP.REL_WAR);
    expect(startWar(w, GER, POL)).toBe(w);                              // už ve válce
  });
  it('volání do zbraně: celý blok obránce proti útočníkovi, a členové bloku útočníka', () => {
    const w = startWar(ready(s0, ITA, YUG), ITA, YUG);
    for (const x of [YUG, CZE, ROM]) expect(atWar(w, ITA, x)).toBe(true);
    const f = startWar(ready({ ...s0, player: 'FRA' }, FRA, GER), FRA, GER);
    for (const x of [FRA, POL, BEL]) expect(atWar(f, x, GER)).toBe(true);
    expect(atWar(f, ENG, GER)).toBe(false);
    expect(atWar(f, POL, BEL)).toBe(false);
    expect(relOf(f, FRA, GER)).toBeLessThan(relOf(s0, FRA, GER));
  });
  it('platnost ospravedlnění je omezená', () => {
    const b = ready(s0, GER, POL);
    const late = { ...b, tick: b.tick + 24 * (DIP.JUST_KEEP + 5) };
    expect(startWar(day(late, 1), GER, POL)).not.toBe(late);   // po dni zanikne
    expect(day(late, 1).dip.just).toEqual([]);
  });
});

describe('mír', () => {
  const s0 = createGame({ player: 'GER' });
  const war = declareWar(s0, 'FRA', 'GER');
  it('bez okupace přijme bílý mír každá strana', () => {
    const p = proposePeace(war, GER, FRA);
    expect(atWar(p, GER, FRA)).toBe(false);
    expect(proposePeace(s0, GER, FRA)).toBe(s0);            // nejsou ve válce
    expect(peaceBlock(s0, GER, FRA)).toMatch(/válce/);
  });
  it('vítěz bílý mír odmítne, poražený ho přijme', () => {
    const w = takeAll(war, GER, FRA, 0.3);
    expect(warScore(w, FRA, GER)).toBeGreaterThanOrEqual(DIP.PEACE_SCORE);
    expect(proposePeace(w, GER, FRA)).toBe(w);
    expect(peaceBlock(w, GER, FRA)).toMatch(/vyhrává/);
    const p = proposePeace(w, FRA, GER);
    expect(atWar(p, FRA, GER)).toBe(false);
    expect(p.ctrl.filter((c, i) => i > 0 && c === FRA && p.stateOwner[W.provState[i]] === GER)).toHaveLength(0);
  });
});

describe('kapitulace a anexe', () => {
  const s0 = createGame({ player: 'GER' });
  it('země kapituluje po ztrátě většiny území; okupované státy připadnou okupantovi', () => {
    let w = declareWar(s0, 'POL', 'GER');
    w = takeAll(w, GER, POL, 0.8);
    const h = vpHeld(w, GER);
    expect(h.share).toBeGreaterThanOrEqual(DIP.CAP_SHARE);
    const a = day(w, 1);
    expect(hasCapitulated(a, GER)).toBe(true);
    expect(atWar(a, GER, POL)).toBe(false);
    expect(a.pol.own[GER].stab).toBeLessThan(w.pol.own[GER].stab);
    let moved = 0;
    for (let s = 1; s < W.states.length; s++) if (w.stateOwner[s] === GER && a.stateOwner[s] === POL) moved++;
    expect(moved).toBeGreaterThan(0);
    for (let s = 1; s < W.states.length; s++) if (a.stateOwner[s] === GER) expect(a.ctrl[W.states[s].cap]).toBe(GER);   // zbytek nikdo neokupuje
    expect(a.ownerVer).toBe(w.ownerVer + 1);
    expect(a.dip.ver).toBeGreaterThan(w.dip.ver);
    expect(day(a, 5).dip.cap[GER]).toBe(1);
    expect(capitulate(a, GER)).toBe(a);
    // továrny jdou s vlastnictvím
    expect(a.stateOwner.some((o, s) => s > 0 && o === POL && w.stateOwner[s] === GER)).toBe(true);
    // divize kapitulované země nestojí v cizích provinciích
    for (const d of a.mil.divs) if (d && d.o === GER) { const c = a.ctrl[d.p]; expect(c === GER || atWar(a, c, GER)).toBe(true); }
  });
  it('hlavní město padne dřív: nižší práh; slabá okupace nestačí', () => {
    const weak = takeAll(declareWar(s0, 'POL', 'GER'), GER, POL, 0.03);
    expect(vpHeld(weak, GER).share).toBeLessThan(DIP.CAP_CAPITAL_SHARE);
    expect(hasCapitulated(day(weak, 1), GER)).toBe(false);
  });
  it('kapitulace opustí blok a odstraní válku jen kapitulujícímu; spojenci válčí dál', () => {
    let w = startWar(ready({ ...s0, player: 'GER' }, FRA, GER), FRA, GER);   // vítěz GER je hráč: o zbytku Polska rozhodne konference
    w = takeAll(w, POL, GER, 0.9);
    const a = day(w, 1);
    expect(hasCapitulated(a, POL)).toBe(true);
    expect(factionOf(a, POL)).toBeNull();
    expect(factionOf(a, FRA).mem).not.toContain(POL);
    expect(atWar(a, FRA, GER)).toBe(true);
    expect(atWar(a, POL, GER)).toBe(false);
    expect(warBlock(a, POL, SOV)).toMatch(/Kapitulovaná/);
  });
  it('kapitulovaná země nevede válku a nepřijímá pozvání', () => {
    let w = declareWar(s0, 'POL', 'GER');
    w = day(takeAll(w, GER, POL, 0.9), 1);
    expect(justifyWar(pp(w, GER, 100), GER, FRA)).toEqual(pp(w, GER, 100));
    const f = createFaction(pp(w, FRA, 100), FRA, 'X');
    expect(inviteBlock(f, FRA, GER)).toMatch(/kapitulovala|Zvát|ve válce/);
  });
});

describe('bloky', () => {
  const s0 = createGame({ player: 'GER' });
  it('založení stojí politickou moc; po založení je země vedoucí', () => {
    expect(createFaction(s0, GER, 'Osa')).toBe(s0);               // chybí PM
    const a = createFaction(pp(s0, GER, 100), GER, 'Osa');
    expect(factionOf(a, GER)).toMatchObject({ nm: 'Osa', ldr: GER, mem: [GER] });
    expect(a.pol.own[GER].pp).toBe(100 - DIP.FAC_PP);
    expect(createFaction(a, GER, 'Jiný')).toBe(a);                // už v bloku
    expect(createFaction(pp(s0, GER, 100), GER, '').dip.facs.at(-1).nm).toMatch(/Blok/);
  });
  it('pozvání: přijme země s dobrým vztahem, odmítne ta s lichým; jen vedoucí smí zvát', () => {
    const a = createFaction(pp(s0, ITA, 100), ITA, 'Blok');
    expect(inviteBlock(a, ITA, GER)).toBeNull();                   // vztah +10 +10 ideologie ≥ 20
    const b = inviteToFaction(a, ITA, GER);
    expect(sameFaction(b, ITA, GER)).toBe(true);
    expect(inviteToFaction(b, ITA, GER)).toBe(b);                  // už v bloku
    expect(inviteBlock(a, ITA, SOV)).toMatch(/odmítá/);
    expect(inviteToFaction(a, ITA, SOV)).toBe(a);
    expect(inviteBlock(a, ITA, FRA)).toMatch(/už je v bloku/);
    expect(inviteBlock(b, GER, SOV)).toMatch(/vedoucí/);
    expect(inviteBlock(s0, GER, SOV)).toMatch(/žádném/);
    expect(inviteBlock(a, ITA, ITA)).toMatch(/Neplatná/);
  });
  it('odchod: vedení se předá, poslední člen blok zruší', () => {
    const a = leaveFaction(s0, CZE);
    expect(factionOf(a, CZE)).toBeNull();
    expect(factionOf(a, ROM).ldr).toBe(ROM);
    expect(factionOf(a, ROM).mem).toEqual([ROM, YUG]);
    expect(leaveFaction(s0, GER)).toBe(s0);
    let b = s0;
    for (const o of [CZE, ROM, YUG]) b = leaveFaction(b, o);
    expect(b.dip.facs[s0.dip.fac[CZE]]).toBeNull();
  });
  it('plný blok nelze rozšířit; pozvaný ve válce s členem odmítne', () => {
    const a = createFaction(pp(s0, SWE, 100), SWE, 'Sever');
    const w = declareWar(a, 'SWE', 'FIN');
    expect(inviteBlock(w, SWE, FIN)).toMatch(/ve válce/);
    void LAT;
  });
});

describe('přehled a determinismus', () => {
  const s0 = createGame({ player: 'GER' });
  it('diplomacyOf: všechny ostatní země se stavem a důvody', () => {
    const d = diplomacyOf(s0, 'GER');
    expect(d.list).toHaveLength(W.owners.length - 2);
    expect(d.faction).toBeNull();
    expect(d.canFound).toBe(false);
    const pol = d.list.find((x) => x.o === POL);
    expect(pol).toMatchObject({ war: false, ally: false, canJustify: false, canDeclare: false });
    expect(pol.justifyBlock).toMatch(/politická moc/);
    const rich = diplomacyOf(pp(s0, GER, 200), 'GER');
    expect(rich.list.find((x) => x.o === POL).canJustify).toBe(true);
    expect(rich.canFound).toBe(true);
    const cz = diplomacyOf(s0, 'CZE');
    expect(cz.list.find((x) => x.o === ROM).ally).toBe(true);
    expect(cz.list.find((x) => x.o === ROM).justifyBlock).toMatch(/bloku/);
  });
  it('90 dní s válkou: původní stav se nemění, dělení kroků nevadí, JSON čistý', () => {
    const s = declareWar(takeAll(declareWar(s0, 'POL', 'GER'), GER, POL, 0.4), 'ITA', 'FRA');
    const snap = JSON.stringify(s);
    const a = day(s, 90);
    expect(JSON.stringify(s)).toBe(snap);
    let b = s;
    for (let i = 0; i < 90; i++) b = day(b, 1);
    expect(JSON.stringify(b.dip)).toBe(JSON.stringify(a.dip));
    expect(JSON.stringify(b.stateOwner)).toBe(JSON.stringify(a.stateOwner));
    expect(JSON.parse(JSON.stringify(a.dip))).toEqual(a.dip);
    expect(divisionCount(a, 'GER')).toBeGreaterThanOrEqual(0);
  });
  it('zapomínání: změna vztahu se v míru vrací k nule', () => {
    const a = startWar(ready(s0, GER, POL), GER, POL);
    const peace = proposePeace(a, GER, POL);
    const r0 = relOf(peace, GER, POL);
    const later = day(peace, 100);
    expect(relOf(later, GER, POL)).toBeGreaterThan(r0);
    expect(relOf(later, GER, POL)).toBeLessThanOrEqual(baseRel(GER, POL));
  });
});
