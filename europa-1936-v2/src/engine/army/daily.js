// Denní krok armády (po půlnoci): zásobování, doplňování ze skladu, zakopání, plánování, zkušenosti velitelů, měsíční lidská síla.
import { dailyLogistics } from './logistics.js';
import { C } from './constants.js';
import { dailySupply } from './supply.js';
import { plansSteps } from './plans.js';
import { editDiv, editStock, addMan, editGen, editArmy, rnd } from './ctx.js';
import { statsOf, modsOf } from './unit.js';
import { genLevel, xpForLevel, genMods } from './leaders.js';
import { dateOfHour } from '../time.js';
import { countryStats } from '../selectors.js';
import { getWorld } from '../world.js';
import { manMult } from '../politics/core.js';
import { atWar } from './war.js';

function dailyReinforce(ctx) {
  const mil = ctx.mil;
  for (let id = 1; id < ctx.divs.length; id++) {
    const d = ctx.divs[id];
    if (!d || d.b !== 0 || d.sup < C.MIN_HP_FOR_REINF_SUP) continue;
    const st = statsOf(mil, d);
    if (d.hp >= st.hp - 1e-6) continue;
    const want = Math.min(st.hp - d.hp, st.hp * C.REINF_PER_DAY * (1 + st.healing));
    const frac = want / st.hp;
    const costMen = frac * st.men;
    const src = d.vo || d.o;   // F4: dobrovolníky a expediční sbor doplňuje jejich původní země
    const stock = ctx.stock[src];
    let f = 1;
    if (costMen > 0) f = Math.min(f, ctx.man[src] / costMen);
    for (const e in st.need) { const c = frac * st.need[e]; if (c > 0) f = Math.min(f, (stock[e] || 0) / c); }
    if (f <= 0.001) continue;
    f = Math.min(1, f);
    const s = editStock(ctx, src);
    for (const e in st.need) s[e] = Math.max(0, s[e] - frac * st.need[e] * f);
    addMan(ctx, src, -costMen * f);
    editDiv(ctx, id).hp = Math.min(st.hp, d.hp + want * f);
  }
}

/**
 * F4c: ústupová linie – armáda s plánem fronty a záložní linií (`plan.fb`) na ni přejde, jakmile nepřítel drží aspoň `C.FALLBACK_LOST`
 * provincií její linie: nový plán je obranná fronta po záložní linii (bez cílů a bez další ústupové linie). Plánovač pak divize přesune.
 */
function dailyFallback(ctx) {
  for (let id = 1; id < ctx.armies.length; id++) {
    const a = ctx.armies[id];
    if (!a || !a.plan || a.plan.k !== 'front' || !a.plan.fb || !a.plan.fb.length) continue;
    const line = a.plan.line;
    let lost = 0;
    for (const p of line) { const c = ctx.ctrl[p]; if (c && c !== a.o && atWar(ctx.mil, a.o, c)) lost++; }
    if (line.length && lost / line.length >= C.FALLBACK_LOST) editArmy(ctx, id).plan = { k: 'front', line: a.plan.fb.slice(), to: [], mode: a.plan.mode };
  }
}

function dailyDigIn(ctx) {
  for (let id = 1; id < ctx.divs.length; id++) {
    const d = ctx.divs[id];
    if (!d || d.b !== 0 || d.path.length > 0 || d.dig >= C.DIG_MAX) continue;
    const st = statsOf(ctx.mil, d);
    editDiv(ctx, id).dig = Math.min(C.DIG_MAX, d.dig + (1 / C.DIG_DAYS) * (1 + 0.5 * st.eng));
  }
}

function dailyPlanning(ctx) {
  const mil = ctx.mil;
  for (let id = 1; id < ctx.armies.length; id++) {
    const a = ctx.armies[id];
    if (!a) continue;
    const m = modsOf(ctx, { army: id });
    const offensive = a.plan && a.plan.k === 'front' && a.plan.to && a.plan.to.length > 0;
    const cap = C.PLAN_CAP + m.planCap;
    let pl = a.pl;
    if (offensive) pl = Math.min(cap, pl + C.PLAN_GAIN * (1 + m.planGain));
    else pl = Math.max(0, pl - C.PLAN_DECAY);
    if (pl !== a.pl) editArmy(ctx, id).pl = pl;
  }
  void mil;
}

function dailyLeaders(ctx) {
  for (let id = 1; id < ctx.gens.length; id++) {
    let g = ctx.gens[id];
    if (!g) continue;
    const lv = genLevel(g);
    if (g.xp >= xpForLevel(lv) && lv < 5 * C.LEADER_MAX_SKILL - 4) {
      g = editGen(ctx, id);
      g.xp -= xpForLevel(lv);
      const keys = ['a', 'd', 'pl', 'lg', 'mn'].filter((k) => (g[k] || 1) < C.LEADER_MAX_SKILL);
      if (keys.length) { const k = keys[Math.floor(rnd(ctx) * keys.length)]; g[k] = (g[k] || 1) + 1; }
    }
  }
  void genMods;
}

function monthlyManpower(ctx) {
  const w = getWorld();
  for (let o = 1; o < w.owners.length; o++) {
    const st = countryStats(ctx.state, w.owners[o].tag);
    if (st && st.manPop > 0) addMan(ctx, o, Math.round(st.manPop * 1000 * C.MAN_GROWTH_MONTH * manMult(ctx.state, o)));
  }
}

/** Denní krok armády jako generátor (F2): přestávky po zásobování a po každé plánované armádě (`plansSteps`). */
export function* dailySteps(ctx) {
  dailySupply(ctx);
  dailyLogistics(ctx);   // S6: opotřebení lokomotiv a aut za války
  yield;
  dailyReinforce(ctx);
  dailyDigIn(ctx);
  dailyPlanning(ctx);
  dailyFallback(ctx);   // F4c: ústupové linie
  dailyLeaders(ctx);
  yield* plansSteps(ctx);
  const d = dateOfHour(ctx.tick);
  if (d.day === 1) monthlyManpower(ctx);
}
export function dailyStep(ctx) { for (const _ of dailySteps(ctx)) void _; }
