// Mírová konference s body (M84, tahová dražba M95): hodnota státu, body vítězů, nároky menších vítězů (AI), nároky hráče jako hlavního i menšího vítěze, dokončení.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, declareWar, capitulate, validateState, DIP, stateValue, confClaims, confClaim, confClaimsDone, confAnnex, confSkip, confFor, bidCost,
} from '../src/engine/index.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const GER = idx('GER'), SOV = idx('SOV'), PLN = idx('POL'), LIT = idx('LIT');
const statesOf = (s, o) => { const out = []; for (let x = 1; x < W.states.length; x++) if (s.stateOwner[x] === o) out.push(x); return out; };
const valueOf = (s, list) => list.reduce((a, x) => a + stateValue(s, x), 0);

/**
 * Polsko ve válce s Německem a SSSR. Německo drží hlavní město a `gerShare` polských států (od západu), SSSR `sovN` států od východu,
 * zbytek zůstává Polsku. `player` = země hráče.
 */
function partition(player, gerShare = 0.5, sovN = 3) {
  let s = createGame({ player, aiLevel: 0 });
  s = declareWar(declareWar(s, 'GER', 'POL'), 'SOV', 'POL');
  const cx = (st) => W.land[W.states[st].cap].c[0];
  const pol = statesOf(s, PLN).sort((a, b) => cx(a) - cx(b));
  const capState = W.provState[W.owners[PLN].cap];
  const ger = new Set(pol.slice(0, Math.floor(pol.length * gerShare)).concat([capState]));
  const sov = new Set(pol.slice(pol.length - sovN).filter((x) => !ger.has(x)));
  const ctrl = s.ctrl.slice();
  for (const st of pol) { const o = ger.has(st) ? GER : sov.has(st) ? SOV : 0; if (o) for (const p of W.states[st].v) ctrl[p] = o; }
  return { s: { ...s, ctrl }, ger: [...ger], sov: [...sov], rest: pol.filter((x) => !ger.has(x) && !sov.has(x)) };
}

describe('hodnota a body', () => {
  it('hodnota státu roste s vítěznými body a továrnami', () => {
    const s = createGame({ player: null });
    const cap = W.provState[W.owners[PLN].cap];
    expect(stateValue(s, cap)).toBeGreaterThan(1);
    const st = s.ind.st.slice(); st[cap] = { ...st[cap], civ: (st[cap].civ || 0) + 3 };
    expect(stateValue({ ...s, ind: { ...s.ind, st } }, cap)).toBe(stateValue(s, cap) + 6);
    expect(DIP.CONF_SHARE).toBeGreaterThan(0);
  });
});

describe('AI vítězové', () => {
  it('dobyté státy si okupanti vydraží; menší vítěz si za zbylé body vezme sousední zbytek, o zbylém rozhodne hlavní vítěz', () => {
    const { s, ger, sov, rest } = partition(null);
    expect(rest.length).toBeGreaterThan(0);
    const t = capitulate(s, PLN);
    for (const x of ger) expect(t.stateOwner[x]).toBe(GER);
    for (const x of sov) expect(t.stateOwner[x]).toBe(SOV);
    const sovExtra = rest.filter((x) => t.stateOwner[x] === SOV);
    expect(valueOf(s, sovExtra)).toBeLessThanOrEqual(Math.floor(valueOf(s, sov) * DIP.CONF_SHARE) + DIP.CONF_BASE);
    expect(t.dip.conf).toHaveLength(0);
    expect(statesOf(t, PLN).length === 0 || t.dip.sub[PLN] === GER).toBe(true);   // zbytek anektován nebo loutka hlavního vítěze
    expect(validateState(t)).toBeNull();
  });
  it('bez dobytého území má účastník jen základní body', () => {
    const { s, rest } = partition(null, 0.5, 0);
    const t = capitulate(s, PLN);
    expect(valueOf(s, rest.filter((x) => t.stateOwner[x] === SOV))).toBeLessThanOrEqual(DIP.CONF_BASE);
  });
});

describe('ceny v dražbě', () => {
  it('okupovaný stát je pro okupanta levnější; vzdálený stát si vzít nelze', () => {
    const { s, ger } = partition('GER');
    const t = capitulate(s, PLN);
    const c = t.dip.conf[0];
    const own = ger[0];
    expect(bidCost(t, c, GER, own)).toBe(Math.max(1, Math.ceil(stateValue(t, own) * DIP.CONF_OCC)));
    expect(bidCost(t, c, GER, W.provState[W.owners[GER].cap])).toBeNull();   // stát, který poraženému nepatří
    expect(confFor(t, GER)).toBe(c);
  });
});

describe('hráč jako hlavní vítěz', () => {
  const { s, ger } = partition('GER');
  const t = capitulate(s, PLN);
  const c = t.dip.conf[0];
  it('dražba čeká na hráče: body, pořadí podle bodů, seznam států s cenou', () => {
    expect(c).toMatchObject({ loser: PLN, top: GER, ph: 'bid', turn: GER, g: 'conquest' });
    expect(c.order[0]).toBe(GER);
    expect(c.order).toContain(SOV);
    expect(c.pts[GER]).toBeGreaterThanOrEqual(DIP.CONF_BASE + Math.floor(valueOf(s, ger) * DIP.CONF_SHARE));
    const rows = confClaims(t, c.id);
    expect(rows.length).toBe(statesOf(t, PLN).length);
    expect(rows.every((r) => (r.block === null) === (r.cost != null && r.cost <= c.pts[GER]))).toBe(true);
    for (const x of ger) expect(t.stateOwner[x]).toBe(PLN);   // okupované státy ještě nikomu nepatří
  });
  it('vezme si stát za body, pak táhnou AI a hráč je znovu na tahu; neplatný vstup stav nemění', () => {
    const row = confClaims(t, c.id).find((r) => !r.block);
    const u = confClaim(t, c.id, row.s);
    expect(u.stateOwner[row.s]).toBe(GER);
    const c2 = u.dip.conf[0];
    expect(c2.pts[GER]).toBe(c.pts[GER] - row.cost);
    expect(c2.turn).toBe(GER);
    expect(u.log.items.some((e) => e.k === 'take' && e.o === GER && e.x === PLN)).toBe(true);
    expect(confClaim(t, 999, row.s)).toBe(t);
    expect(confClaim(t, c.id, W.provState[W.owners[GER].cap])).toBe(t);
  });
  it('po pasu rozhodne hráč o zbytku jako dřív (anexe), zbylá okupovaná území se vrátí poraženému', () => {
    const passed = confClaimsDone(t, c.id);
    const r = passed.dip.conf[0];
    expect(r).toMatchObject({ ph: 'rump', victor: GER, loser: PLN });
    for (const x of statesOf(passed, PLN)) for (const p of W.states[x].v) expect(passed.ctrl[p]).toBe(PLN);
    const done = confAnnex(passed, r.id);
    expect(statesOf(done, PLN)).toHaveLength(0);
    expect(done.dip.conf).toHaveLength(0);
    expect(validateState(done)).toBeNull();
    expect(confAnnex(t, c.id)).toBe(t);   // během dražby se o zbytku nerozhoduje
  });
  it('když si vezme poslední stát, konference skončí sama', () => {
    let u = { ...t, dip: { ...t.dip, conf: t.dip.conf.map((x) => ({ ...x, pts: { ...x.pts, [GER]: 99999 } })) } };
    for (let k = 0; k < 200 && u.dip.conf.length; k++) {
      const row = confClaims(u, c.id).find((x) => !x.block);
      if (!row) break;
      u = confClaim(u, c.id, row.s);
    }
    expect(u.dip.conf.length === 0 || u.dip.conf[0].ph === 'rump').toBe(true);
  });
});

describe('hráč jako menší vítěz', () => {
  const { s, sov } = partition('SOV');
  const t = capitulate(s, PLN);
  const c = t.dip.conf[0];
  it('AI hlavní vítěz si nejdřív vezme okupované, pak je na tahu hráč; po pasu rozhodne o zbytku hlavní vítěz', () => {
    expect(c).toMatchObject({ loser: PLN, ph: 'bid', top: GER, turn: SOV });
    expect(c.pts[SOV]).toBeGreaterThanOrEqual(DIP.CONF_BASE + Math.floor(valueOf(s, sov) * DIP.CONF_SHARE));
    expect(t.dip.sub[PLN]).toBe(0);
    const row = confClaims(t, c.id).find((r) => !r.block);
    const u = row ? confClaim(t, c.id, row.s) : t;
    if (row) expect(u.stateOwner[row.s]).toBe(SOV);
    let done = u;
    for (let k = 0; k < 50 && done.dip.conf.length; k++) done = confClaimsDone(done, c.id);
    expect(done.dip.conf).toHaveLength(0);
    expect(statesOf(done, PLN).length === 0 || done.dip.sub[PLN] === GER).toBe(true);
    expect(confClaimsDone(done, c.id)).toBe(done);
    expect(validateState(done)).toBeNull();
  });
  it('„Nechat být“ během dražby znamená pas', () => {
    const u = confSkip(t, c.id);
    expect(u.dip.conf.every((x) => x.ph !== 'bid' || x.pass.includes(SOV))).toBe(true);
  });
  void LIT;
});
