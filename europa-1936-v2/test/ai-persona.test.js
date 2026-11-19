// F3 – AI méně opakující se: styly velení zemí (složení armády, výroba, převaha k útoku, zálohy, způsob útoku) a promíchané pořadí
// národních cílů ve volné historii.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, advance } from '../src/engine/index.js';
import { PERSONAS, PERSONA_IDS, HIST_PERSONA } from '../src/data/ai/personas.js';
import { personaId, personaOf } from '../src/engine/ai/persona.js';
import { desiredMix } from '../src/engine/ai/army.js';
import { demandSplit } from '../src/engine/ai/industry.js';
import { TPL_KINDS } from '../src/data/army/templates.js';
import { EQUIP } from '../src/data/army/equipment.js';
import { AI } from '../src/engine/ai/constants.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const GER = idx('GER'), SOV = idx('SOV'), FRA = idx('FRA'), ITA = idx('ITA');
const free = (seed) => createGame({ player: null, aiLevel: 2, hist: false, seed });

describe('data stylů velení', () => {
  it('klíče složení jsou druhy divizí, výroby výzbroj; způsob útoku je známý', () => {
    for (const id of PERSONA_IDS) {
      const p = PERSONAS[id];
      expect(p.n.length).toBeGreaterThan(3);
      for (const k in p.mix) expect(TPL_KINDS[k], `${id}.mix.${k}`).toBeTruthy();
      for (const e in p.prod) expect(EQUIP[e], `${id}.prod.${e}`).toBeTruthy();
      expect(['broad', 'focus', 'wide', 'methodical', 'weak']).toContain(p.op);
      expect(p.reserve).toBeGreaterThanOrEqual(0);
    }
    for (const t in HIST_PERSONA) { expect(idx(t)).toBeGreaterThan(0); expect(PERSONAS[HIST_PERSONA[t]]).toBeTruthy(); }
  });
});

describe('volba stylu', () => {
  it('historický režim: styl podle dějin, ostatní vyvážení; bez AI vždy vyvážený', () => {
    const s = createGame({ player: null, aiLevel: 2 });
    expect(personaId(s, GER)).toBe('mobilni');
    expect(personaId(s, SOV)).toBe('masova');
    expect(personaId(s, FRA)).toBe('obranna');
    expect(personaId(s, ITA)).toBe('vyvazena');
    expect(personaId(createGame({ player: null }), GER)).toBe('vyvazena');
  });
  it('volná historie: styl se losuje podle semínka hry – v jedné hře stálý, mezi hrami různý', () => {
    const seen = new Set();
    for (let seed = 1; seed <= 40; seed++) seen.add(personaId(free(seed), GER));
    expect(seen.size).toBeGreaterThanOrEqual(4);
    const s = free(5);
    expect(personaId(advance(s, 24 * 3), GER)).toBe(personaId(s, GER));
  });
});

describe('účinky stylu', () => {
  /** Hra ve volné historii, kde má země `o` styl `id`. */
  const withPersona = (o, id) => { for (let seed = 1; seed < 400; seed++) { const s = free(seed); if (personaId(s, o) === id) return s; } throw new Error(`styl ${id} nenalezen`); };
  it('pohyblivá válka chce víc tanků, masová armáda víc pěchoty', () => {
    const base = desiredMix(withPersona(GER, 'vyvazena'), GER);
    const mob = desiredMix(withPersona(GER, 'mobilni'), GER);
    const mas = desiredMix(withPersona(GER, 'masova'), GER);
    expect(mob.tank).toBeGreaterThan(base.tank);
    expect(mas.pesi).toBeGreaterThan(base.pesi);
    for (const m of [base, mob, mas]) expect(Object.values(m).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
  });
  it('palebná převaha vyrábí víc děl', () => {
    const a = demandSplit(withPersona(GER, 'vyvazena'), GER, true), b = demandSplit(withPersona(GER, 'palebna'), GER, true);
    expect(b.dela).toBeGreaterThan(a.dela);
    expect(Object.values(b).reduce((x, y) => x + y, 0)).toBeCloseTo(1, 6);
  });
  it('převaha k útoku a zálohy podle stylu; konstanty způsobů útoku', () => {
    expect(PERSONAS.masova.atk).toBeLessThan(1);
    expect(PERSONAS.obranna.atk).toBeGreaterThan(1);
    expect(PERSONAS.obranna.reserve).toBeGreaterThan(0);
    expect(AI.OP_FOCUS_MULT).toBeGreaterThan(1);
    expect(AI.OP_WIDE_MULT).toBeLessThan(1);
    expect(personaOf(createGame({ player: null, aiLevel: 2 }), SOV)).toBe(PERSONAS.masova);
  });
});

describe('národní cíle ve volné historii', () => {
  it('pořadí cílů se mezi hrami liší (aspoň u některých zemí), s historickou AI je stejné', () => {
    const firstFocus = (s) => { const a = advance(s, 24 * 2); return a.nat.own.map((x) => (x && x.cur ? x.cur.id : '')).join(','); };
    const runs = [1, 2, 3].map((seed) => firstFocus(free(seed)));
    expect(new Set(runs).size).toBeGreaterThan(1);
    const h1 = firstFocus(createGame({ player: null, aiLevel: 2, seed: 1 })), h2 = firstFocus(createGame({ player: null, aiLevel: 2, seed: 2 }));
    expect(h1).toBe(h2);
  });
});
