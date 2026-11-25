// W2: historie celého světa – posádky v koloniích, kolonie exilové vlády, data kolejí Asie a Pacifiku, dárce zámořské pomoci.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld } from '../src/engine/index.js';
import { NATIONAL } from '../src/data/army/index.js';
import { HIST_WARS, HIST_ENTRY, HIST_FACTIONS } from '../src/data/ai/plans.js';
import { HIST_STRATEGIES } from '../src/data/ai/strategies.js';
import { HIST_PACTS } from '../src/data/dip/pacts.js';
import { OVERSEAS_AID } from '../src/data/dip/overseas.js';
import { SPIRITS } from '../src/data/nat/spirits.js';
import { SCENARIOS } from '../src/data/scenarios.js';
import { exileColonies } from '../src/engine/dip/exile.js';
import { aidBlock } from '../src/engine/dip/overseas.js';
import { demandSpec, demandBlock, demand, lordBacks } from '../src/engine/dip/demand.js';
import { HIST_DEMANDS } from '../src/data/dip/demands.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const stateId = (n) => W.states.findIndex((s) => s && s.n === n);

describe('W2: posádky mimo jádro', () => {
  const s = createGame({ player: null });
  it('jmenované státy existují a patří zemi; divize v nich stojí', () => {
    for (const tag in NATIONAL) {
      for (const pl of NATIONAL[tag].place || []) {
        for (const n of pl.states) { const id = stateId(n); expect(id, `${tag}: ${n}`).toBeGreaterThan(0); expect(W.states[id].o, `${tag}: ${n}`).toBe(idx(tag)); }
        const want = Object.values(pl.divs).reduce((a, b) => a + b, 0);
        const ids = new Set(pl.states.map(stateId));
        const have = s.mil.divs.filter((d) => d && d.o === idx(tag) && ids.has(W.provState[d.p])).length;
        expect(have, `${tag} ${pl.states[0]}`).toBeGreaterThanOrEqual(want);
      }
    }
  });
  it('Itálie má armádu ve východní Africe, Japonsko v Koreji', () => {
    const inState = (tag, n) => s.mil.divs.filter((d) => d && d.o === idx(tag) && W.states[W.provState[d.p]].n === n).length;
    expect(inState('ITA', 'Eritrea') + inState('ITA', 'Danakil')).toBeGreaterThan(0);
    expect(inState('JAP', 'Keidžó') + inState('JAP', 'Heidžó') + inState('JAP', 'Severní Korea')).toBeGreaterThan(0);
  });
});

describe('W2: kolonie exilové vlády', () => {
  it('neobsazené kolonie převezme hostitel, obsazené a jádro zůstanou', () => {
    const s = createGame({ player: null });
    const HOL = idx('HOL'), ENG = idx('ENG'), GER = idx('GER');
    const bat = stateId('Batávie'), med = stateId('Medan'), home = stateId('Severní Holandsko');
    const ctrl = s.ctrl.slice();
    ctrl[W.states[med].v[0]] = GER;   // část Medanu drží nepřítel
    const t = exileColonies({ ...s, ctrl }, HOL, ENG);
    expect(t.stateOwner[bat]).toBe(ENG);
    expect(W.states[bat].v.every((p) => t.ctrl[p] === ENG)).toBe(true);
    expect(t.stateOwner[med]).toBe(HOL);
    expect(t.stateOwner[home]).toBe(HOL);
    expect(t.ownerVer).toBe(s.ownerVer + 1);
    expect(exileColonies(s, idx('SWI'), ENG)).toBe(s);   // bez kolonií beze změny
  });
});

describe('W2: data historie světa', () => {
  it('země z kolejí existují, duchové jsou definovaní', () => {
    for (const r of HIST_WARS) { expect(idx(r.tag), r.tag).toBeTruthy(); expect(idx(r.target), r.target).toBeTruthy(); if (r.with) expect(idx(r.with)).toBeTruthy(); }
    for (const r of HIST_ENTRY) expect(idx(r.tag)).toBeTruthy();
    for (const f of HIST_FACTIONS) for (const t of f.invite) expect(idx(t), t).toBeTruthy();
    for (const p of HIST_PACTS) { expect(idx(p.tag)).toBeTruthy(); expect(idx(p.target)).toBeTruthy(); }
    for (const r of HIST_STRATEGIES) {
      expect(idx(r.tag), r.id).toBeTruthy();
      if (r.spirit) expect(SPIRITS[r.spirit], r.id).toBeTruthy();
      for (const k of ['war', 'needWar', 'armistice', 'invade', 'at', 'noEnter', 'spareCap']) if (r[k]) expect(idx(r[k]), `${r.id}.${k}`).toBeTruthy();
    }
    expect(new Set(HIST_STRATEGIES.map((r) => r.id)).size).toBe(HIST_STRATEGIES.length);
  });
  it('klíčové milníky mimo Evropu mají kolej: Čína, Pearl Harbor, kapitulace Japonska', () => {
    expect(HIST_WARS.some((r) => r.tag === 'JAP' && r.target === 'CHI' && r.force)).toBe(true);
    expect(HIST_WARS.some((r) => r.tag === 'JAP' && r.target === 'USA' && r.force)).toBe(true);
    expect(HIST_WARS.some((r) => r.tag === 'SOV' && r.target === 'JAP')).toBe(true);
    const surr = HIST_STRATEGIES.find((r) => r.id === 'jap_surrender');
    expect(surr).toMatchObject({ tag: 'JAP', armistice: 'USA', force: 3514, conf: true });
    expect(HIST_ENTRY.find((r) => r.tag === 'JAP')).toMatchObject({ from: 2167, skip: ['SOV'] });
  });
  it('scénář 1939: Etiopie patří Itálii, dominia jsou ve válce, Japonsko válčí s Čínou', () => {
    const s = createGame({ player: null, scenario: '1939' });
    expect(s.stateOwner[stateId('Šoa')]).toBe(idx('ITA'));
    const at = (a, b) => s.mil.wars.some(([x, y]) => (x === idx(a) && y === idx(b)) || (x === idx(b) && y === idx(a)));
    expect(at('JAP', 'CHI')).toBe(true);
    for (const t of ['CAN', 'AST', 'NZL', 'SAF']) expect(at(t, 'GER'), t).toBe(true);
    expect(SCENARIOS['1936'].wars).toBeUndefined();   // leden 1936 začíná v míru (Habeš je kolej)
  });
  it('zámořská pomoc má dárce: kapitulovaný nebo hráčem řízený dárce nic neposílá', () => {
    expect(OVERSEAS_AID.every((a) => a.src === 'USA')).toBe(true);
    const a = OVERSEAS_AID.find((x) => x.id === 'lend_chi');
    const s = createGame({ player: null });
    const cap = s.dip.cap.slice(); cap[idx('USA')] = 1;
    expect(aidBlock({ ...s, dip: { ...s.dip, cap } }, a)).toMatch(/Dárce/);
    expect(aidBlock({ ...createGame({ player: 'USA' }) }, a)).toMatch(/Dárce/);
  });
});

describe('W2: ultimátum loutce přes spojeneckého pána (Indočína)', () => {
  it('loutka ustoupí, když je její pán v bloku požadující země; jinak ultimátum nejde', () => {
    let s = createGame({ player: null });
    const JAP = idx('JAP'), GER = idx('GER'), FRA = idx('FRA');
    const d = HIST_DEMANDS.find((x) => x.id === 'indochina_n');
    const sub = s.dip.sub.slice(); sub[FRA] = GER;   // Francie jako loutka Německa (místo Vichy)
    s = { ...s, dip: { ...s.dip, sub } };
    const spec = demandSpec(s, { ...d, target: 'FRA' }, FRA);
    expect(spec.states.length).toBe(1);
    expect(demandBlock(s, JAP, FRA, spec)).toMatch(/Loutkový/);   // pán není spojenec Japonska
    const fac = s.dip.fac.slice(), facs = [...s.dip.facs, { nm: 'Osa', ldr: GER, mem: [GER, JAP] }];
    fac[GER] = facs.length - 1; fac[JAP] = facs.length - 1;
    s = { ...s, dip: { ...s.dip, fac, facs } };
    const own = s.pol.own.slice(); own[JAP] = { ...own[JAP], pp: 500 };
    s = { ...s, pol: { ...s.pol, own } };
    expect(lordBacks(s, JAP, FRA, spec)).toBe(true);
    expect(demandBlock(s, JAP, FRA, spec)).toBeNull();
    const t = demand(s, JAP, FRA, spec);
    expect(t.stateOwner[stateId('Tonkin')]).toBe(JAP);
  });
});

