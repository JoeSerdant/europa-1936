// S5c: speciální jednotky (výsadkáři, námořní pěchota) – strop počtu, nájezdy, vylodění námořní pěchoty.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, GAME_VERSION, validateState, declareWar, BATTALIONS, RAID, raidBlock, orderRaid, cancelRaid, raidChance,
  isSpecial, isMarine, sfCap, sfUsed, sfBlock, sailBlock, homeSea,
} from '../src/engine/index.js';
import { raidDay } from '../src/engine/raid/raids.js';
import { recruit } from '../src/engine/army/commands.js';
import { deriveStats } from '../src/engine/army/stats.js';

const W = getWorld();
const ENG = W.ownerIdx.ENG, FRA = W.ownerIdx.FRA, GER = W.ownerIdx.GER;

/** Přidá zemi `o` divizi ze šablony `reg` do provincie `p`; vrací [stav, id divize, id šablony]. */
function addSpecial(s, o, reg, p) {
  const tpl = { o, nm: 'Speciální', short: 'speciální divize', reg, sup: [] };
  const tplId = s.mil.tpl.length, st = deriveStats(tpl), id = s.mil.divs.length;
  const div = { o, tpl: tplId, nr: id, p, org: st.org, hp: st.hp, xp: 0.6, army: 0, path: [], prog: 0, b: 0, rt: 0, dig: 0, sup: 1, sg: 72, hold: 0 };
  return [{ ...s, mil: { ...s.mil, tpl: [...s.mil.tpl, tpl], divs: [...s.mil.divs, div] } }, id, tplId];
}
/** Stát země `t` s letištěm nejblíž provincii `p`. */
function nearAfb(s, t, p) {
  let best = 0, bk = Infinity;
  for (let x = 1; x < W.states.length; x++) {
    if (s.stateOwner[x] !== t || !(s.ind.st[x].afb > 0)) continue;
    const k = W.kmBetween(W.land[p].c[0], W.land[p].c[1], W.land[W.states[x].cap].c[0], W.land[W.states[x].cap].c[1]);
    if (k < bk) { bk = k; best = x; }
  }
  return best;
}

describe('S5c: speciální jednotky', () => {
  it('data: výsadkáři a námořní pěchota jsou speciální; strop speciálních divizí', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(61);
    expect(BATTALIONS.vysad.sf).toBe(true);
    expect(BATTALIONS.namor.marine).toBe(true);
    const s0 = createGame({ player: 'GER' });
    expect(sfCap(s0.mil, GER)).toBeGreaterThanOrEqual(RAID.SF_BASE);
    let s = s0, tplId = 0;
    for (let i = 0; i < RAID.SF_BASE; i++) { let id; [s, id, tplId] = addSpecial(s, GER, [['vysad', 'vysad', 'vysad']], W.owners[GER].cap); void id; }
    expect(sfUsed(s.mil, GER)).toBe(RAID.SF_BASE);
    const cap = sfCap(s.mil, GER);
    if (sfUsed(s.mil, GER) >= cap) {
      expect(sfBlock(s.mil, tplId)).toMatch(/nejvýš/);
      expect(recruit(s, tplId, W.owners[GER].cap, 1)).toBe(s);
    }
    expect(validateState(s)).toBeNull();
  });
  it('námořní pěchota se vylodí bez přípravy; běžná divize ne', () => {
    let s = declareWar(createGame({ player: 'ENG' }), 'ENG', 'FRA');
    s = { ...s, nav: { ...s.nav, pool: s.nav.pool.map((x, i) => (i === ENG ? { ...x, tr: 5000 } : x)) } };
    const port = homeSea(s, ENG).prov;
    let mar, inf;
    [s, mar] = addSpecial(s, ENG, [['namor', 'namor', 'namor']], port);
    [s, inf] = addSpecial(s, ENG, [['pesi', 'pesi', 'pesi']], port);
    expect(isMarine(s.mil, s.mil.divs[mar])).toBe(true);
    expect(isSpecial(s.mil, s.mil.divs[inf])).toBe(false);
    let dest = 0;
    for (let p = 1; p <= W.L && !dest; p++) if (s.ctrl[p] === FRA && W.portLevel[p] && !s.mil.divs.some((d) => d && d.p === p)) dest = p;
    expect(sailBlock(s, [inf], dest) || '').toMatch(/připravené/);
    expect(sailBlock(s, [mar], dest) || '').not.toMatch(/připravené/);
  });
});

describe('S5c: nájezdy', () => {
  const base = declareWar(createGame({ player: 'GER' }), 'GER', 'FRA');
  const tgt = nearAfb(base, FRA, W.owners[GER].cap);
  const km = (a, b) => W.kmBetween(W.land[a].c[0], W.land[a].c[1], W.land[b].c[0], W.land[b].c[1]);
  let p0 = 0;   // německá provincie nejblíž cíli (nájezd má dosah RAID.KM)
  for (let p = 1; p <= W.L; p++) if (base.ctrl[p] === GER && (!p0 || km(p, W.states[tgt].cap) < km(p0, W.states[tgt].cap))) p0 = p;
  it('nájezd jen speciální divizí, na nepřítele v dosahu; po přípravě se vyhodnotí', () => {
    let [s, id] = addSpecial(base, GER, [['vysad', 'vysad', 'vysad']], p0);
    let [s2, inf] = addSpecial(s, GER, [['pesi', 'pesi', 'pesi']], p0);
    s = s2;
    expect(raidBlock(s, inf, 'afb', tgt)).toMatch(/speciální/);
    const own = W.provState[p0];
    expect(raidBlock(s, id, 'afb', own)).toMatch(/nepřítele/);
    const why = raidBlock(s, id, 'afb', tgt);
    expect(why).toBeNull();
    const c = raidChance(s, s.mil.divs[id], 'afb', tgt);
    expect(c).toBeGreaterThanOrEqual(RAID.MIN);
    expect(c).toBeLessThanOrEqual(RAID.MAX);
    s = orderRaid(s, id, 'afb', tgt);
    expect(s.mil.raids).toHaveLength(1);
    expect(raidBlock(s, id, 'afb', tgt)).toMatch(/už/);
    expect(cancelRaid(s, s.mil.raids[0].id).mil.raids).toHaveLength(0);
    const org = s.mil.divs[id].org;
    s = raidDay({ ...s, tick: s.tick + RAID.PREP * 24 });
    expect(s.mil.raids).toHaveLength(0);
    expect(s.mil.divs[id].org).toBeLessThan(org);
    expect(s.log.items.some((e) => e.k === 'raid')).toBe(true);
    expect(validateState(s)).toBeNull();
  });
  it('úspěšný nájezd na sklady zničí část výzbroje nepřítele', () => {
    let [s, id] = addSpecial(base, GER, [['vysad', 'vysad', 'vysad']], p0);
    s = { ...s, mil: { ...s.mil, raids: [{ id: 1, o: GER, d: id, k: 'depot', s: tgt, at: s.tick }] } };
    let ok = null;
    for (let h = 0; h < 200 && ok === null; h++) {   // najde hodinu, kdy hash dá úspěch
      const t = { ...s, tick: s.tick + h, mil: { ...s.mil, raids: [{ id: 1, o: GER, d: id, k: 'depot', s: tgt, at: s.tick + h }] } };
      const r = raidDay(t);
      if (r.log.items.some((e) => e.k === 'raid' && e.y === 1)) ok = [t, r];
    }
    expect(ok).not.toBeNull();
    const [t, r] = ok;
    expect(r.mil.stock[FRA].pusky).toBeLessThan(t.mil.stock[FRA].pusky);
  });
});
