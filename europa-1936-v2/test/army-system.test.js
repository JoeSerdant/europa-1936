// M18 – celá simulace: invarianty během velkých válek, determinismus, výkon.
import { describe, it, expect } from 'vitest';
import { createGame, advance, declareWar, setPlan, deriveStats, atWar, ARMY, EQUIP_IDS } from '../src/engine/index.js';
import { W, idx, neighbors } from './armyKit.js';

/** Provincie `a`, které sousedí s provincií držitele `b` (hranice po souši). */
function frontOf(s, a, b) {
  const own = [], foe = [];
  for (let p = 1; p <= W.L; p++) {
    if (s.ctrl[p] === idx(a) && neighbors(p).some((q) => s.ctrl[q] === idx(b))) own.push(p);
    if (s.ctrl[p] === idx(b) && neighbors(p).some((q) => s.ctrl[q] === idx(a))) foe.push(p);
  }
  return { own, foe };
}

function war(seed = 1936) {
  let s = createGame({ player: 'GER', seed });
  s = declareWar(s, 'GER', 'POL');
  s = declareWar(s, 'FRA', 'ITA');
  s = declareWar(s, 'SOV', 'FIN');
  for (const [a, b] of [['GER', 'POL'], ['FRA', 'ITA'], ['SOV', 'FIN']]) {
    const f = frontOf(s, a, b);
    for (let id = 1; id < s.mil.armies.length; id++) {
      const arm = s.mil.armies[id];
      if (arm && arm.o === idx(a) && f.own.length) s = setPlan(s, id, { k: 'front', line: f.own, to: f.foe, mode: 'rush' });
    }
  }
  return s;
}

function checkInvariants(s, label) {
  const m = s.mil;
  const battleIds = new Set(m.battles.map((b) => b.id));
  const where = new Map();
  for (let id = 1; id < m.divs.length; id++) {
    const d = m.divs[id];
    if (!d) continue;
    const st = deriveStats(m.tpl[d.tpl]);
    const at = `${label}: divize ${id}`;
    if (!(d.hp > 0 && d.hp <= st.hp + 1e-6)) throw new Error(`${at} hp ${d.hp}/${st.hp}`);
    if (!(d.org >= 0 && d.org <= st.org + 1e-6)) throw new Error(`${at} org ${d.org}/${st.org}`);
    if (!(d.xp >= 0 && d.xp <= 1)) throw new Error(`${at} xp ${d.xp}`);
    if (!(d.dig >= 0 && d.dig <= ARMY.DIG_MAX + 1e-9)) throw new Error(`${at} dig ${d.dig}`);
    if (!(d.sup >= 0 && d.sup <= 1 + 1e-9)) throw new Error(`${at} sup ${d.sup}`);
    if (!(d.sg >= 0 && d.sg <= ARMY.SUP_GRACE)) throw new Error(`${at} sg ${d.sg}`);
    if (!(d.prog >= 0 && d.prog < 100)) throw new Error(`${at} prog ${d.prog}`);
    if (!W.isLand(d.p)) throw new Error(`${at} není na souši`);
    if (d.path.length && !neighbors(d.p).includes(d.path[0])) throw new Error(`${at} cesta nenavazuje`);
    if (d.b && !battleIds.has(d.b)) throw new Error(`${at} bitva ${d.b} neexistuje`);
    if (d.army && !(m.armies[d.army] && m.armies[d.army].o === d.o)) throw new Error(`${at} armáda`);
    const list = where.get(d.p) || [];
    list.push(id);
    where.set(d.p, list);
  }
  for (const b of m.battles) {
    if (!b.att.length || !b.dep.length) throw new Error(`${label}: bitva ${b.id} je prázdná`);
    for (const id of [...b.att, ...b.dep]) {
      const d = m.divs[id];
      if (!d) throw new Error(`${label}: bitva ${b.id} odkazuje na zaniklou divizi ${id}`);
    }
    for (const id of b.att) { const d = m.divs[id]; if (d.p === b.p) throw new Error(`${label}: útočník ${id} už stojí v cíli`); }
    for (const id of b.dep) { const d = m.divs[id]; if (d.p !== b.p) throw new Error(`${label}: obránce ${id} nestojí v bitvě`); }
  }
  // nepřátelé spolu ve stejné provincii smějí být jen v bitvě
  for (const [p, ids] of where) {
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const a = m.divs[ids[i]], b = m.divs[ids[j]];
      if (atWar(s, a.o, b.o) && !(a.b && a.b === b.b)) throw new Error(`${label}: nepřátelé ${ids[i]} a ${ids[j]} v provincii ${p} mimo bitvu`);
    }
  }
  for (let o = 1; o < W.owners.length; o++) {
    if (!(m.man[o] >= 0)) throw new Error(`${label}: lidská síla ${o}`);
    for (const e of EQUIP_IDS) if (!(m.stock[o][e] >= 0)) throw new Error(`${label}: sklad ${o}/${e}`);
  }
  for (let p = 1; p <= W.L; p++) if (!(s.ctrl[p] >= 1 && s.ctrl[p] < W.owners.length)) throw new Error(`${label}: kontrola provincie ${p}`);
}

describe('velká válka', () => {
  const start = war();

  it('po celých 45 dní drží invarianty a stav zůstává čistým JSONem', () => {
    let s = start;
    const t0 = Date.now();
    for (let day = 1; day <= 45; day++) {
      s = advance(s, 24);
      if (day % 3 === 0) checkInvariants(s, `den ${day}`);
    }
    expect(Date.now() - t0).toBeLessThan(20000);
    expect(s.mil.battles.length + s.mil.cas.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });

  it('válka mění mapu: útočníci někde obsadili provincie', () => {
    const s = advance(start, 24 * 30);
    let taken = 0;
    for (let p = 1; p <= W.L; p++) if (s.ctrl[p] !== W.provOwner0[p]) taken++;
    expect(taken).toBeGreaterThan(3);
    expect(s.ownerVer).toBeGreaterThan(start.ownerVer);
  });

  it('je deterministická a nezávisí na dělení kroků', () => {
    const a = advance(start, 24 * 5);
    const b = advance(advance(start, 24 * 2 + 5), 24 * 3 - 5);
    expect(b).toEqual(a);
    expect(advance(war(), 24 * 5)).toEqual(a);
  });

  it('jiné zrno dává jiný průběh', () => {
    const a = advance(start, 24 * 10), b = advance(war(77), 24 * 10);
    expect(JSON.stringify(a.mil.divs)).not.toBe(JSON.stringify(b.mil.divs));
  });

  it('výcvik a doplňování běží i za války: sklady se spotřebovávají', () => {
    const s = advance(start, 24 * 20);
    const used = EQUIP_IDS.some((e) => s.mil.stock[idx('GER')][e] < start.mil.stock[idx('GER')][e]);
    expect(used).toBe(true);
    expect(s.mil.man[idx('GER')]).not.toBe(start.mil.man[idx('GER')]);
  });
});

describe('měsíční přírůstek lidské síly', () => {
  it('první den měsíce zásoba vzroste', () => {
    let s = createGame();
    const feb1 = 31 * 24;
    s = advance(s, feb1 - 1);
    const before = s.mil.man[idx('POL')];
    s = advance(s, 1);
    expect(s.mil.man[idx('POL')]).toBeGreaterThan(before);
    const after = s.mil.man[idx('POL')];
    s = advance(s, 24 * 10);
    expect(s.mil.man[idx('POL')]).toBe(after);
  });
});
