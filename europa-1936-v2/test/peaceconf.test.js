// Mírová konference s body (M84): hodnota státu, body vítězů, nároky menších vítězů (AI), nároky hráče jako hlavního i menšího vítěze, dokončení.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, declareWar, capitulate, validateState, DIP, stateValue, confClaims, confClaim, confClaimsDone, confAnnex, confSkip,
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
  it('dobyté státy připadnou tomu, kdo je dobyl; menší vítěz si za body vezme sousední zbytek, o zbylém rozhodne hlavní vítěz', () => {
    const { s, ger, sov, rest } = partition(null);
    expect(rest.length).toBeGreaterThan(0);
    const t = capitulate(s, PLN);
    for (const x of ger) expect(t.stateOwner[x]).toBe(GER);
    for (const x of sov) expect(t.stateOwner[x]).toBe(SOV);
    const sovExtra = rest.filter((x) => t.stateOwner[x] === SOV);
    expect(valueOf(s, sovExtra)).toBeLessThanOrEqual(Math.floor(valueOf(s, sov) * DIP.CONF_SHARE));
    expect(t.dip.conf).toHaveLength(0);
    expect(statesOf(t, PLN).length === 0 || t.dip.sub[PLN] === GER).toBe(true);   // zbytek anektován nebo loutka hlavního vítěze
    expect(validateState(t)).toBeNull();
  });
  it('bez dobytého území nemá vítěz žádné body a nic navíc nedostane', () => {
    const { s, rest } = partition(null, 0.5, 0);
    const t = capitulate(s, PLN);
    expect(rest.some((x) => t.stateOwner[x] === SOV)).toBe(false);
  });
});

describe('hráč jako hlavní vítěz', () => {
  const { s, ger, rest } = partition('GER');
  const t = capitulate(s, PLN);
  const c = t.dip.conf[0];
  it('dostane konferenci s body a seznamem států, které si může vzít', () => {
    expect(c).toMatchObject({ loser: PLN, victor: GER, g: 'conquest' });
    expect(c.pts).toBe(Math.floor(valueOf(s, ger) * DIP.CONF_SHARE));
    const rows = confClaims(t, c.id);
    expect(rows.length).toBe(statesOf(t, PLN).length);
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1].value).toBeGreaterThanOrEqual(rows[i].value);
    expect(rows.every((r) => (r.block === null) === (r.value <= c.pts))).toBe(true);
    void rest;
  });
  it('vezme si stát za body; na dražší nemá a neplatný vstup stav nemění', () => {
    const rows = confClaims(t, c.id);
    const cheap = rows.filter((r) => !r.block).pop();
    expect(cheap).toBeTruthy();
    const u = confClaim(t, c.id, cheap.s);
    expect(u.stateOwner[cheap.s]).toBe(GER);
    expect(u.dip.conf[0].pts).toBe(c.pts - cheap.value);
    expect(u.log.items.some((e) => e.k === 'take' && e.o === GER && e.x === PLN)).toBe(true);
    const dear = rows.find((r) => r.block);
    if (dear) expect(confClaim(t, c.id, dear.s)).toBe(t);
    expect(confClaim(t, 999, cheap.s)).toBe(t);
    expect(confClaim(t, c.id, W.provState[W.owners[GER].cap])).toBe(t);
    const done = confAnnex(u, c.id);   // se zbytkem naloží jako dřív
    expect(statesOf(done, PLN)).toHaveLength(0);
    expect(done.dip.conf).toHaveLength(0);
    expect(validateState(done)).toBeNull();
  });
  it('když si vezme poslední stát, konference skončí sama', () => {
    let u = { ...t, dip: { ...t.dip, conf: t.dip.conf.map((x) => ({ ...x, pts: 99999 })) } };
    for (const st of statesOf(u, PLN)) u = confClaim(u, c.id, st);
    expect(statesOf(u, PLN)).toHaveLength(0);
    expect(u.dip.conf).toHaveLength(0);
  });
});

describe('hráč jako menší vítěz', () => {
  const { s, sov } = partition('SOV');
  const t = capitulate(s, PLN);
  const c = t.dip.conf[0];
  it('vybírá si první; hlavní vítěz rozhodne o zbytku až po něm', () => {
    expect(c).toMatchObject({ loser: PLN, victor: SOV, ph: 'claims', top: GER });
    expect(c.pts).toBe(Math.floor(valueOf(s, sov) * DIP.CONF_SHARE));
    expect(statesOf(t, PLN).length).toBeGreaterThan(0);
    expect(t.dip.sub[PLN]).toBe(0);
    const row = confClaims(t, c.id).filter((r) => !r.block).pop();
    const u = row ? confClaim(t, c.id, row.s) : t;
    if (row) expect(u.stateOwner[row.s]).toBe(SOV);
    const done = confClaimsDone(u, c.id);
    expect(done.dip.conf).toHaveLength(0);
    expect(statesOf(done, PLN).length === 0 || done.dip.sub[PLN] === GER).toBe(true);
    expect(confClaimsDone(done, c.id)).toBe(done);
    expect(confSkip(t, c.id).dip.conf).toHaveLength(0);
    expect(validateState(done)).toBeNull();
  });
  void LIT;
});
