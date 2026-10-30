// Uvolnění národů (M70): Vichy, Slovensko a Chorvatsko vznikají jako loutky vítěze z poražené země (konference AI, volba hráče, ultimátum na zbytek Česka).
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, validateState, declareWar, capitulate, isDormant, hasCapitulated, divisionCount, overlordOf, atWar,
  releaseIds, releaseBlock, releaseNation, RELEASES, confRelease, confAnnex, demand, demandSpec, DEMAND_BY_ID, countryTable, packGame, unpackGame,
} from '../src/engine/index.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const GER = idx('GER'), FRA = idx('FRA'), CZE = idx('CZE'), YUG = idx('YUG'), VIC = idx('VIC'), SLO = idx('SLO'), CRO = idx('CRO'), ITA = idx('ITA');
const base = (o = {}) => createGame({ player: null, aiLevel: 2, ...o });
const owned = (s, o) => { let n = 0; for (let i = 1; i < s.stateOwner.length; i++) if (s.stateOwner[i] === o) n++; return n; };
const stateIds = (names) => names.map((n) => { for (let i = 1; i < W.states.length; i++) if (W.states[i].n === n) return i; return 0; });
const withPp = (s, o, pp) => { const own = s.pol.own.slice(); own[o] = { ...own[o], pp }; return { ...s, pol: { ...s.pol, own } }; };

/** Okupuje všechny provincie států `o`, které nejsou ve `keep`, vítězem `by`, a kapituluje `o` (jako po válce). */
function defeat(s0, by, o, keepNames) {
  let s = declareWar(s0, W.owners[by].tag, W.owners[o].tag);
  const keep = new Set(stateIds(keepNames));
  const ctrl = s.ctrl.slice();
  for (let p = 1; p <= W.L; p++) { const st = W.provState[p]; if (s.stateOwner[st] === o && !keep.has(st)) ctrl[p] = by; }
  return capitulate({ ...s, ctrl }, o);
}

describe('data', () => {
  it('pravidla uvolnění odkazují na existující státy a rezervní země', () => {
    for (const [tag, r] of Object.entries(RELEASES)) {
      expect(idx(tag), tag).toBeTruthy();
      expect(W.owners[idx(r.tag)].dyn, r.tag).toBe(true);
      if (r.states) for (const n of r.states) expect(stateIds([n])[0], n).toBeGreaterThan(0);
    }
  });
});

describe('uvolnění národa', () => {
  it('releaseIds: všechny zbylé státy (Francie) nebo vyjmenované (Československo)', () => {
    const s = base();
    expect(releaseIds(s, FRA).length).toBe(owned(s, FRA));
    expect(releaseIds(s, CZE).sort()).toEqual(stateIds(RELEASES.CZE.states).sort());
    expect(releaseIds(s, GER)).toEqual([]);
  });
  it('blokace: země bez pravidla, existující nová země, neexistující vítěz', () => {
    const s = base();
    expect(releaseBlock(s, GER, ITA)).toMatch(/nedá/);
    expect(releaseBlock(s, GER, FRA)).toBeNull();
    const t = releaseNation(s, GER, CZE);
    expect(releaseBlock(t, GER, CZE)).toMatch(/existuje|žádn/);   // Slovensko už existuje
    expect(releaseNation(s, GER, ITA)).toBe(s);
  });
  it('releaseNation: státy a divize přejdou na loutku vítěze, zásoby se rozdělí, hra běží', () => {
    const s0 = base();
    const t = releaseNation(s0, GER, CZE);
    expect(t).not.toBe(s0);
    for (const st of stateIds(RELEASES.CZE.states)) expect(t.stateOwner[st]).toBe(SLO);
    expect(overlordOf(t, SLO)).toBe(GER);
    expect(isDormant(t, SLO)).toBe(false);
    expect(hasCapitulated(t, SLO)).toBe(false);
    expect(countryTable(t).some((r) => r.tag === 'SLO')).toBe(true);
    expect(divisionCount(t, SLO) + divisionCount(t, CZE)).toBe(divisionCount(s0, CZE));
    for (const d of t.mil.divs) if (d && d.o === SLO) { expect(t.ctrl[d.p]).toBe(SLO); expect(t.mil.tpl[d.tpl].o).toBe(SLO); }
    expect(t.log.items.some((e) => e.k === 'release' && e.x === SLO && e.y === CZE && e.o === GER)).toBe(true);
    expect(atWar(t, 'SLO', 'CZE')).toBe(false);
    expect(validateState(advance(t, 24 * 20))).toBeNull();
  }, 60000);
});

describe('mírová konference', () => {
  it('AI vítěz po pádu Francie vytvoří Vichy z nedobytých států a Francie zanikne', () => {
    const south = ['Provence', 'Azurové pobřeží', 'Languedoc', 'Roussillon', 'Toulouse', 'Rouergue', 'Auvergne', 'Limousin'];
    const keep = [...south, 'Oran', 'Alžír', 'Constantine', 'Tunis', 'Casablanca-Rabat', 'Fès', 'Marrákeš'];
    const t = defeat(base(), GER, FRA, keep);
    expect(isDormant(t, VIC)).toBe(false);
    expect(overlordOf(t, VIC)).toBe(GER);
    expect(owned(t, VIC)).toBe(keep.length);
    expect(owned(t, FRA)).toBe(0);
    for (const n of south) expect(t.stateOwner[stateIds([n])[0]]).toBe(VIC);
    expect(t.dip.conf.length).toBe(0);
    expect(validateState(t)).toBeNull();
  });
  it('AI vítěz po pádu Jugoslávie vytvoří Chorvatsko ze států podle pravidla, zbytek zůstane loutce', () => {
    const t = defeat(base(), ITA, YUG, ['Záhřeb', 'Lika', 'Bosna', 'Hercegovina', 'Dalmácie', 'Srem-Slavonie', 'Bělehrad', 'Šumadija', 'Niš']);
    expect(owned(t, CRO)).toBe(6);
    expect(overlordOf(t, CRO)).toBe(ITA);
    expect(owned(t, YUG) + (overlordOf(t, YUG) ? 0 : 0)).toBeGreaterThanOrEqual(0);
    expect(validateState(t)).toBeNull();
  });
  it('bez nedobytých států se nic neuvolní (vše okupováno)', () => {
    const t = defeat(base(), GER, FRA, []);
    expect(isDormant(t, VIC)).toBe(true);
  });
  it('hráč jako vítěz dostane v konferenci volbu uvolnit národ; potvrzením vznikne loutka a zbytek se anektuje', () => {
    const s0 = createGame({ player: 'GER', aiLevel: 2 });
    const t = defeat(s0, GER, CZE, ['Západní Slovensko', 'Střední Slovensko', 'Východní Slovensko', 'Podkarpatská Rus']);
    expect(t.dip.conf.length).toBe(1);
    expect(t.dip.conf[0].rel).toBe(1);
    const done = confRelease(t, t.dip.conf[0].id);
    expect(overlordOf(done, SLO)).toBe(GER);
    expect(owned(done, SLO)).toBe(3);
    expect(owned(done, CZE)).toBe(0);
    expect(owned(done, GER)).toBeGreaterThan(owned(s0, GER));
    expect(done.dip.conf.length).toBe(0);
    // volba „Anektovat“ Slovensko nevytvoří
    const annexed = confAnnex(t, t.dip.conf[0].id);
    expect(isDormant(annexed, SLO)).toBe(true);
  });
});

describe('ultimátum na zbytek Česka', () => {
  it('po přijetí ultimáta Německo anektuje zemi, ale Slovensko vznikne jako loutka', () => {
    let s = withPp(base(), GER, 100);
    const divs = s.mil.divs.slice();
    const mine = divs.map((d, i) => (d && d.o === GER ? i : 0)).filter(Boolean);
    for (let k = 0; k < 200; k++) divs.push({ ...divs[mine[k % mine.length]], army: 0 });
    s = { ...s, mil: { ...s.mil, divs, ver: s.mil.ver + 1 }, tick: 24 * 1200 };
    const t = demand(s, GER, CZE, demandSpec(s, DEMAND_BY_ID.cze_rump, CZE));
    expect(t.dip.ult.find((u) => u.id === 'cze_rump').ok).toBe(1);
    expect(overlordOf(t, SLO)).toBe(GER);
    expect(owned(t, SLO)).toBe(3);
    expect(owned(t, CZE)).toBe(0);
    expect(validateState(advance(t, 24 * 5))).toBeNull();
  }, 60000);
});

describe('uložení', () => {
  it('uvolněná země přežije uložení a načtení', () => {
    const t = releaseNation(base(), GER, CZE);
    const back = unpackGame(JSON.parse(JSON.stringify(packGame(t))));
    expect(back.error).toBeUndefined();
    expect(back.state.dip.sub[SLO]).toBe(GER);
  });
});
