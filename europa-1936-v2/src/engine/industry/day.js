// Denní krok průmyslu (M19), pořadí: souhrn továren → linky zkrácené na dostupné továrny → obchod se surovinami → toky surovin → výroba → stavby.
import { getWorld } from '../world.js';
import { I } from './constants.js';
import { logAddMany } from '../log.js';
import { BUILDINGS, isShip } from '../../data/industry/index.js';
import { modsOf } from '../research/core.js';
import { polModsOf, outMult, consOf } from '../politics/core.js';
import { tallyOwners, factoryUse, trimAllLines, demandOf, resFlows, lineFactor, lineRate } from './core.js';

const warKey = (a, b) => (a < b ? a * 1000 + b : b * 1000 + a);

export function industryDay(state) {
  const ind = state.ind, w = getWorld();
  const nO = w.owners.length;
  const tally = tallyOwners(state);
  const wars = new Set(state.mil.wars.map(([a, b]) => warKey(a, b)));

  // 1) linky po zemích zkrácené na dostupné továrny; nominální poptávka po surovinách
  const linesBy = Array.from({ length: nO }, () => []);
  for (const l of ind.lines) linesBy[l.o].push(l);
  const use = new Array(nO), dem = new Array(nO);
  for (let o = 1; o < nO; o++) {
    use[o] = factoryUse(tally[o], consOf(state, o));
    linesBy[o] = trimAllLines(linesBy[o], use[o].milAvail, tally[o].dok);
    dem[o] = demandOf(linesBy[o], state.mil.lv[o]);
  }

  // 2) obchod: vývozce dodá nejvýš svůj přebytek (těžba − vlastní poptávka − už vyvezené); válka smlouvu přeruší
  const sold = Array.from({ length: nO }, () => ({}));
  const trade = ind.trade.map((d) => {
    let got = 0;
    if (!wars.has(warKey(d.from, d.to))) {
      const have = (tally[d.from].res[d.res] || 0) * (1 + modsOf(state, d.from).extract + polModsOf(state, d.from).extract) - (dem[d.from][d.res] || 0) - (sold[d.from][d.res] || 0);
      got = Math.max(0, Math.min(d.amt, have));
      got = Math.round(got * 1000) / 1000;
      sold[d.from][d.res] = (sold[d.from][d.res] || 0) + got;
    }
    return got === d.got ? d : { ...d, got };
  });

  // 3) výroba, růst efektivity a stavby po zemích
  let stock = state.mil.stock, stockOwn = false;
  let navPool = state.nav ? state.nav.pool : null, poolOwn = false;
  const lines = [];
  const progress = new Map();   // id stavby → nový postup
  const done = [];              // dokončené stavby
  const dropped = new Set();
  const buildBy = Array.from({ length: nO }, () => []);
  for (const b of ind.build) buildBy[b.o]?.push(b);

  for (let o = 1; o < nO; o++) {
    const mods = modsOf(state, o), lvo = state.mil.lv[o];
    const pm = polModsOf(state, o), out = outMult(state, o);
    const res = resFlows(tally[o], dem[o], trade, o, mods.extract + pm.extract);
    const cap = I.EFF_CAP + mods.effCap;
    for (const l of linesBy[o]) {
      const f = lineFactor(l, res);
      let acc = l.acc + lineRate(l, lvo) * f * out;
      const whole = Math.floor(acc);
      acc -= whole;
      if (whole > 0 && isShip(l.eq) && navPool) {
        if (!poolOwn) { navPool = navPool.slice(); poolOwn = true; }
        navPool[o] = { ...navPool[o], [l.eq]: (navPool[o][l.eq] || 0) + whole };
      } else if (whole > 0) {
        if (!stockOwn) { stock = stock.slice(); stockOwn = true; }
        stock[o] = { ...stock[o], [l.eq]: (stock[o][l.eq] || 0) + whole };
      }
      lines.push({ ...l, acc, f, out: whole, eff: l.eff + Math.max(0, cap - l.eff) * I.EFF_GROW });
    }
    // stavby: civilní továrny po odečtení spotřebního zboží a dovozu
    let imports = 0;
    for (const r in res) imports += res[r].imp;
    let pool = Math.max(0, use[o].civAfterCons - imports * I.TRADE_CIV * (1 + pm.imp)) * I.IC_PER_FAC * (1 + mods.build + pm.build) * out;
    for (const b of buildBy[o]) {
      if (state.stateOwner[b.s] !== o || state.ctrl[w.states[b.s].cap] !== o) { dropped.add(b.id); continue; }
      const B = BUILDINGS[b.k];
      const give = Math.min(B.cost / B.days, pool, B.cost - b.prog);
      pool -= give;
      const prog = b.prog + give;
      if (prog >= B.cost - 1e-9) done.push(b); else progress.set(b.id, prog);
    }
  }

  // 4) dokončené stavby
  let st = ind.st, inf = ind.inf, stOwn = false, infOwn = false;
  const doneIds = new Set();
  for (const b of done) {
    doneIds.add(b.id);
    if (b.k === 'inf') {
      if (!infOwn) { inf = inf.slice(); infOwn = true; }
      inf[b.s] = Math.min(I.INF_MAX, inf[b.s] + 1);
    } else {
      if (!stOwn) { st = st.slice(); stOwn = true; }
      st[b.s] = { ...st[b.s], [b.k]: (st[b.s][b.k] || 0) + 1 };
    }
  }
  const build = ind.build.filter((b) => !doneIds.has(b.id) && !dropped.has(b.id)).map((b) => (progress.has(b.id) ? { ...b, prog: progress.get(b.id) } : b));
  const next = { ...ind, st, inf, build, lines, trade, ver: ind.ver + (done.length || dropped.size ? 1 : 0) };
  const mil = stockOwn ? { ...state.mil, stock } : state.mil;
  const player = state.player ? w.ownerIdx[state.player] : 0;
  const nav = poolOwn ? { ...state.nav, pool: navPool, ver: state.nav.ver + 1 } : state.nav;
  return logAddMany({ ...state, mil, nav, ind: next }, done.filter((b) => b.o === player).map((b) => ({ k: 'built', o: b.o, s: b.s, x: b.k })));
}
