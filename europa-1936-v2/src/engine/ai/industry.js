// AI: průmysl (M24). Používá stejné příkazy jako hráč: build, addLine, setLineFactories.
import { getWorld } from '../world.js';
import { DEFAULT_SPLIT, EQUIP_PROD, PROD } from '../../data/industry/index.js';
import { deriveStats } from '../army/stats.js';
import { desiredMix, tplOfKind, targetDivs } from './army.js';
import { EQUIP } from '../../data/army/equipment.js';
import { hasWar } from '../army/war.js';
import { build, addLine, setLineFactories, setLineEquip } from '../industry/commands.js';
import { industryOf, producibleEquip } from '../industry/selectors.js';
import { slotsOf, slotsUsed } from '../industry/core.js';
import { I } from '../industry/constants.js';
import { isUnlocked } from '../research/core.js';
import { AI } from './constants.js';
import { personaOf } from './persona.js';

const WAR_SPLIT = { pusky: 0.4, dela: 0.2, auta: 0.15, podpora: 0.1, pdela: 0.06, ltanky: 0.05, vozy: 0.04 };

/**
 * Rozdělení výroby podle potřeby (M65): výrobní body na výzbroj úměrné tomu, kolik jí žádané složení armády potřebuje na jednu divizi (kusy × cena),
 * aby se divize dokončovaly vyváženě; druh, kterého je ve skladu dost, dostane míň, druh, kterého je málo, víc. Vrací { výzbroj → podíl } (součet 1).
 * M93: s toky surovin `res` (z `industryOf`) dostane výzbroj, které chybí její nejvzácnější surovina, míň – továrny by jinak jen spotřebovaly ocel
 * ostatním linkám (Německo 1942: lehké tanky bez chromu a gumy).
 */
export function demandSplit(state, o, war, res = null) {
  const mix = desiredMix(state, o), kinds = tplOfKind(state, o), lv = state.mil.lv[o] || null;
  const need = {};
  for (const k in mix) {
    const t = kinds[k] && state.mil.tpl[kinds[k]];
    if (!t) continue;
    const st = deriveStats(t, lv);
    for (const e in st.need) need[e] = (need[e] || 0) + mix[k] * st.need[e];
  }
  const base = war ? WAR_SPLIT : DEFAULT_SPLIT;
  const pp = personaOf(state, o).prod;   // F3: priority výroby podle stylu velení
  const stock = state.mil.stock[o] || {};
  const w = {};
  let sum = 0;
  for (const e in need) {
    const cost = EQUIP_PROD[e] ? EQUIP_PROD[e].cost : 1;
    const cover = (stock[e] || 0) / (need[e] * AI.STOCK_DIVS);
    const f = cover > 2 ? 0.25 : cover > 1 ? 0.6 : cover < 0.3 ? 1.6 : 1;
    let avail = 1;
    if (res && PROD[e]) for (const r in PROD[e].res) avail = Math.min(avail, res[r] ? res[r].f : 0);
    w[e] = need[e] * cost * f * Math.max(AI.RES_AVAIL_MIN, avail) * (pp[e] || 1);
    sum += w[e];
  }
  const out = {};
  let bs = 0;
  for (const e in base) bs += base[e] * (pp[e] || 1);
  for (const e in base) out[e] = (1 - AI.DEMAND_BLEND) * base[e] * (pp[e] || 1) / (bs || 1);
  if (sum > 0) for (const e in w) out[e] = (out[e] || 0) + AI.DEMAND_BLEND * w[e] / sum;
  return out;
}

/** Tlak zbrojení 0–1: jak daleko je armáda od cílového počtu divizí (mezera / max(5, 30 % cíle)). */
export function armyPressure(state, o) {
  let n = 0;
  for (let i = 1; i < state.mil.divs.length; i++) { const d = state.mil.divs[i]; if (d && d.o === o) n++; }
  const t = targetDivs(state, o);
  return Math.max(0, Math.min(1, (t - n - state.mil.queue.filter((q) => q.o === o).length) / Math.max(5, t * 0.3)));
}

/** Stát země `o` s volným slotem (hlavní stát první, jinak nejvíc volných slotů); 0 = žádný. */
function freeState(state, o) {
  const w = getWorld();
  const cap = w.provState[w.owners[o].cap];
  let best = 0, bf = 0;
  for (let s = 1; s < w.states.length; s++) {
    if (state.stateOwner[s] !== o || state.ctrl[w.states[s].cap] !== o) continue;
    const free = slotsOf(state.ind, s) - slotsUsed(state.ind, s);
    if (free <= 0) continue;
    if (s === cap) return s;
    if (free > bf) { bf = free; best = s; }
  }
  return best;
}

/** Stát, ve kterém má smysl vylepšit infrastrukturu (hlavní stát, jinak největší vlastní). */
function infraState(state, o) {
  const w = getWorld();
  const cap = w.provState[w.owners[o].cap];
  const pending = (s) => state.ind.build.some((b) => b.s === s && b.k === 'inf') || (state.ind.inf[s] || 0) >= I.INF_MAX;
  if (state.stateOwner[cap] === o && !pending(cap)) return cap;
  let best = 0;
  for (let s = 1; s < w.states.length; s++) if (state.stateOwner[s] === o && !pending(s) && state.ctrl[w.states[s].cap] === o && (!best || w.states[s].p > w.states[best].p)) best = s;
  return best;
}

export function aiIndustry(state, o) {
  let sum = industryOf(state, o);
  const war = hasWar(state.mil, o);
  // stavby: jedna nová za den, dokud fronta není plná
  if (sum.build.length < AI.QUEUE && sum.civ + sum.mil > 0) {
    const queuedMil = sum.build.filter((b) => b.k === 'mil').length, queuedCiv = sum.build.filter((b) => b.k === 'civ').length;
    const milNow = sum.mil + queuedMil, total = sum.civ + sum.mil + queuedMil + queuedCiv;
    const share = (war ? AI.MIL_SHARE_WAR : AI.MIL_SHARE) + AI.MIL_PRESSURE * armyPressure(state, o);   // zbrojení: s mezerou k cílovému počtu divizí roste podíl vojenských továren
    const kind = sum.civ + queuedCiv === 0 || milNow / Math.max(1, total) < share ? (sum.civ + queuedCiv === 0 ? 'civ' : 'mil') : 'civ';
    const s = freeState(state, o);
    const next = s ? build(state, s, kind) : (() => { const i = infraState(state, o); return i ? build(state, i, 'inf') : state; })();
    state = next;
    if (next !== state) sum = industryOf(state, o);
  }
  // linky: volné továrny dostanou výrobu podle nedostatku zásob
  sum = industryOf(state, o);
  let free = Math.min(10, sum.milFree);
  const split = demandSplit(state, o, war, sum.res);
  const full = new Set();   // M88: druh, kterému už nejde přidat továrnu (plné linky a strop počtu linek), se přeskočí – továrny nezůstanou stát
  while (free > 0) {
    const eqs = Object.keys(split).filter((e) => !full.has(e) && isUnlocked(state, o, EQUIP[e].unlock));
    const cur = industryOf(state, o);
    const tot = cur.lines.reduce((a, l) => a + l.fac, 0) + 1;
    let pick = '', pk = -Infinity;
    for (const e of eqs) {
      const have = cur.lines.filter((l) => l.eq === e).reduce((a, l) => a + l.fac, 0);
      const k = split[e] - have / tot;
      if (k > pk) { pk = k; pick = e; }
    }
    if (!pick) break;
    const line = cur.lines.find((l) => l.eq === pick && l.fac < I.LINE_MAX_FAC);
    const next = line ? setLineFactories(state, line.id, line.fac + 1) : addLine(state, o, pick, 1);
    if (next === state) { full.add(pick); continue; }
    state = next;
    free--;
  }
  void producibleEquip;
  return rebalanceLines(state, o, split);
}

/**
 * Přesun výroby (M89): jednou za `AI.REBAL_DAYS` dní AI přesune až `AI.REBAL_STEP` továren z druhu výzbroje, který má proti rozdělení `split` nejvíc továren navíc,
 * na druh, kterému jich nejvíc chybí (obojí víc než `AI.REBAL_MARGIN` pozemních linek). Bere z linky s nejnižší efektivitou; přidané továrny zředí efektivitu
 * cílové linky (`setLineFactories`), nová linka začíná od nuly. Lodě a letadla se nepřesouvají. Stejné příkazy jako hráč; beze změny vrací tentýž stav.
 */
export function rebalanceLines(state, o, split) {
  if ((Math.floor(state.tick / 24) + o) % AI.REBAL_DAYS !== 0) return state;
  const lines = state.ind.lines.filter((l) => l.o === o && split[l.eq] !== undefined);
  const tot = lines.reduce((a, l) => a + l.fac, 0);
  if (tot < AI.REBAL_MIN) return state;
  const eqs = Object.keys(split).filter((e) => isUnlocked(state, o, EQUIP[e].unlock));
  const sw = eqs.reduce((a, e) => a + split[e], 0);
  if (sw <= 0) return state;
  const have = {};
  for (const l of lines) have[l.eq] = (have[l.eq] || 0) + l.fac;
  let give = '', take = '', gv = -Infinity, tv = Infinity;
  for (const e of eqs.slice().sort()) {
    const d = (have[e] || 0) / tot - split[e] / sw;
    if (have[e] && d > gv) { gv = d; give = e; }
    if (d < tv) { tv = d; take = e; }
  }
  if (!give || !take || give === take || gv < AI.REBAL_MARGIN || tv > -AI.REBAL_MARGIN) return state;
  const from = lines.filter((l) => l.eq === give).sort((a, b) => a.eff - b.eff || a.id - b.id)[0];
  let k = Math.min(AI.REBAL_STEP, from.fac, Math.floor(gv * tot), Math.floor(-tv * tot));
  if (k < 1) return state;
  const to = lines.filter((l) => l.eq === take && l.fac < I.LINE_MAX_FAC).sort((a, b) => b.eff - a.eff || a.id - b.id)[0];
  if (to) k = Math.min(k, I.LINE_MAX_FAC - to.fac);
  else if (state.ind.lines.filter((l) => l.o === o).length >= I.LINES_MAX) {
    // M93: strop počtu linek a plné linky příjemce – nejmenší linka dárce se celá přepne na chybějící výzbroj (jinak by výroba zůstala natrvalo špatně rozdělená)
    const conv = lines.filter((l) => l.eq === give).sort((a, b) => a.fac - b.fac || a.id - b.id)[0];
    return conv.fac <= Math.min(gv, -tv) * tot ? setLineEquip(state, conv.id, take) : state;   // jen když dárce má navíc a příjemci chybí aspoň celá linka
  }
  const freed = setLineFactories(state, from.id, from.fac - k);
  const next = to ? setLineFactories(freed, to.id, to.fac + k) : addLine(freed, o, take, k);
  return next === freed ? state : next;
}
