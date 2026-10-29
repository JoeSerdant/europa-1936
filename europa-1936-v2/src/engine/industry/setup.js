// Počáteční průmysl: rozmístění továren a těžby po státech, výchozí linky a obchodní smlouvy (deterministicky z `rng`).
import { nextRandom } from '../rng.js';
import { COUNTRIES } from '../../data/countries.js';
import { EQUIP } from '../../data/army/equipment.js';
import { IND_NATIONAL, TRADE_SEED, DEFAULT_SPLIT, RESOURCES } from '../../data/industry/index.js';
import { NAVY_NATIONAL } from '../../data/navy/ships.js';
import { I } from './constants.js';
import { categoryOf } from './core.js';

/** D'Hondtovo rozdělení `n` kusů mezi položky podle vah; `cap[i]` = nejvýš kusů na položku. */
export function apportion(weights, n, cap) {
  const got = new Array(weights.length).fill(0);
  for (let k = 0; k < n; k++) {
    let best = -1, bs = -1;
    for (let i = 0; i < weights.length; i++) {
      if (got[i] >= cap[i] || weights[i] <= 0) continue;
      const sc = weights[i] / (got[i] + 1);
      if (sc > bs) { bs = sc; best = i; }
    }
    if (best < 0) break;
    got[best]++;
  }
  return got;
}

export function createInd(w, rng) {
  const ind = {
    ver: 0, jn: 0,
    st: Array.from({ length: w.states.length }, (_, s) => (s ? { civ: 0, mil: 0, dok: 0, res: {} } : null)),
    inf: new Array(w.states.length).fill(0),
    cons: new Array(w.owners.length).fill(0),
    build: [], lines: [], trade: [],
  };
  let seed = rng;
  const rnd = () => { const [x, n] = nextRandom(seed); seed = n; return x; };

  const byOwner = Array.from({ length: w.owners.length }, () => []);
  for (let s = 1; s < w.states.length; s++) byOwner[w.stateOwner0[s]].push(s);
  const vpOf = (s) => w.states[s].v.reduce((a, p) => a + w.vp[p], 0);

  for (let o = 1; o < w.owners.length; o++) {
    const tag = w.owners[o].tag, nat = IND_NATIONAL[tag];
    const tier = COUNTRIES[tag]?.tier ?? 3;
    ind.cons[o] = nat && nat.cons != null ? nat.cons : I.CONS_TIER[tier];
    if (!nat) continue;
    const list = byOwner[o];
    if (!list.length) continue;
    const slots = list.map((s) => categoryOf(w.states[s].p).slots);
    const wt = list.map((s) => Math.pow(w.states[s].p, 0.8) * (1 + vpOf(s) / 60));
    // továrny: nejdřív civilní, pak vojenské; vojenské dávají přednost státům s vítěznými body
    const civ = apportion(wt, nat.civ, slots);
    const free = slots.map((c, i) => c - civ[i]);
    const wm = list.map((s, i) => wt[i] * (1 + vpOf(s) / 30));
    const mil = apportion(wm, nat.mil, free);
    list.forEach((s, i) => { ind.st[s].civ = civ[i]; ind.st[s].mil = mil[i]; });
    // domácí ocel aspoň na základní zbrojní výrobu (menší země těží i z drobných dolů, které v číslech nejsou)
    const natRes = { ...nat.res, ocel: Math.max(nat.res.ocel || 0, Math.round(nat.mil * 9) / 10) };
    // loděnice: ve státech s přístavem podle úrovně přístavu a volných slotů
    const nav = NAVY_NATIONAL[tag];
    if (nav && nav.docks > 0) {
      const portOf = (st) => w.states[st].v.reduce((a, p) => Math.max(a, w.portLevel[p] || 0), 0);
      const cand = list.map((st, i) => ({ st, i })).filter((x) => portOf(x.st) > 0).sort((a, b) => portOf(b.st) - portOf(a.st) || b.st - a.st);
      let left = nav.docks;
      for (const x of cand) {
        const free = slots[x.i] - ind.st[x.st].civ - ind.st[x.st].mil - ind.st[x.st].dok;
        const put = Math.min(left, free);
        if (put > 0) { ind.st[x.st].dok += put; left -= put; }
        if (!left) break;
      }
    }
    // těžba: ve třech státech podle váhy (jádra nebo rozloha), podíly 50 / 30 / 20 %
    for (const r in natRes) {
      const geoW = list.map((s) => (RESOURCES[r].geo === 'pop' ? w.states[s].p : Math.sqrt(w.states[s].a)) * (0.5 + rnd()));
      const picks = [];
      const wl = geoW.slice();
      for (let k = 0; k < Math.min(3, list.length); k++) {
        let best = 0;
        for (let i = 1; i < wl.length; i++) if (wl[i] > wl[best]) best = i;
        picks.push(best); wl[best] = -1;
      }
      const shares = [0.5, 0.3, 0.2].slice(0, picks.length);
      const sum = shares.reduce((a, b) => a + b, 0);
      let left = natRes[r];
      picks.forEach((i, k) => {
        const v = k === picks.length - 1 ? left : Math.round((natRes[r] * shares[k]) / sum * 10) / 10;
        const x = Math.round(v * 10) / 10;
        if (x > 0) ind.st[list[i]].res[r] = x;
        left -= x;
      });
    }
    // výchozí linky: vojenské továrny podle DEFAULT_SPLIT
    if (nat.mil > 0) {
      const eqs = Object.keys(DEFAULT_SPLIT).filter((e) => !EQUIP[e].unlock);
      const got = apportion(eqs.map((e) => DEFAULT_SPLIT[e]), nat.mil, eqs.map(() => I.LINE_MAX_FAC));
      eqs.forEach((e, i) => {
        if (got[i] > 0) ind.lines.push({ id: ++ind.jn, o, eq: e, fac: got[i], eff: I.EFF_INIT, acc: 0, f: 1, out: 0 });
      });
    }
  }
  for (const d of TRADE_SEED) {
    const from = w.ownerIdx[d.from], to = w.ownerIdx[d.to];
    if (from && to) ind.trade.push({ id: ++ind.jn, from, to, res: d.res, amt: d.amt, got: 0 });
  }
  return { ind };
}
