// Rozdělení země (M69): občanská válka. Rezervní země `rebel` (`dyn`, zatím bez území) dostane od mateřské země `parent` vyjmenované státy, divize stojící v nich
// (se zkopírovanými šablonami), podíl zásob výzbroje a lidské síly, kopii výzkumu, doktrín a politiky a letecká křídla z odtržených států; obě země jsou hned
// ve válce (`dip.goal['rebel>parent'] = 'civil'`), kterou nelze ukončit bílým mírem a po kapitulaci jedné strany ji vítěz anektuje (viz `dip/subjects.js`).
// Čisté funkce, neplatný vstup vrací tentýž stav.
import { getWorld } from '../world.js';
import { logAdd } from '../log.js';
import { declareWar } from '../army/commands.js';
import { nearestControlled } from '../army/war.js';
import { hasCapitulated, isDormant, setRel, pairKey } from '../dip/core.js';
import { HIST_CIVIL } from '../../data/dip/civil.js';
import { RELEASES } from '../../data/dip/releases.js';
import { DIP } from '../dip/constants.js';

const ok = (o) => Number.isInteger(o) && o >= 1 && o < getWorld().owners.length;
const clone = (x) => JSON.parse(JSON.stringify(x));
const stateIdOf = (name) => { const w = getWorld(); for (let i = 1; i < w.states.length; i++) if (w.states[i].n === name) return i; return 0; };

/** Proč nejde rozdělit `parent` a vytvořit `rebel` ze států `ids` (český text), nebo null. */
export function splitBlock(state, parent, rebel, ids, release = false) {
  if (!ok(parent) || !ok(rebel) || parent === rebel) return 'Neplatná země.';
  if (!isDormant(state, rebel)) return 'Taková země už existuje.';
  if (!release && (hasCapitulated(state, parent) || isDormant(state, parent))) return 'Mateřská země neexistuje.';
  if (!release && state.dip.sub[parent]) return 'Loutkový stát se nedělí.';
  const mine = ids.filter((s) => state.stateOwner[s] === parent);
  let all = 0;
  for (let s = 1; s < state.stateOwner.length; s++) if (state.stateOwner[s] === parent) all++;
  if (!mine.length) return 'Mateřská země vlastní žádný z uvedených států.';
  if (!release && mine.length >= all) return 'Mateřské zemi by nezbylo žádné území.';
  return null;
}

/**
 * Vytvoří zemi `rebel` ze států `ids` země `parent` (viz hlavička souboru). `civil` = občanská válka: obě země jsou hned ve válce.
 * Podíl zásob a lidské síly odpovídá podílu přenesených divizí (nejméně 25 %, nejvíc 75 %). `defect` = podíl divizí věrné země (každá n-tá podle čísla),
 * které přeběhnou k povstalcům: objeví se v nejbližší provincii pod jejich kontrolou, s oslabenou organizací.
 */
export function splitCountry(state, parent, rebel, ids, civil = true, defect = 0, release = false) {
  if (splitBlock(state, parent, rebel, ids, release)) return state;
  const w = getWorld(), mil = state.mil;
  const mine = ids.filter((s) => state.stateOwner[s] === parent);
  const stateOwner = state.stateOwner.slice(), ctrl = state.ctrl.slice();
  for (const s of mine) { stateOwner[s] = rebel; for (const p of w.states[s].v) if (ctrl[p] === parent) ctrl[p] = rebel; }

  // ---- divize v odtržených provinciích a jejich šablony ----
  const tpl = mil.tpl.slice(), divs = mil.divs.slice();
  const tplMap = new Map();
  const mapTpl = (id) => {
    if (!tplMap.has(id)) { const t = mil.tpl[id]; tplMap.set(id, tpl.length); tpl.push({ ...t, o: rebel, reg: t.reg.map((c) => c.slice()), sup: t.sup.slice() }); }
    return tplMap.get(id);
  };
  let total = 0, moved = 0, seen = 0;
  const every = defect > 0 ? Math.max(1, Math.round(1 / defect)) : 0;
  for (let id = 1; id < divs.length; id++) {
    const d = divs[id];
    if (!d || d.o !== parent) continue;
    total++;
    if (d.b) continue;
    if (ctrl[d.p] === rebel) { moved++; divs[id] = { ...d, o: rebel, tpl: mapTpl(d.tpl), army: 0, path: [], prog: 0 }; continue; }
    if (every && ++seen % every === 0) {   // přeběhlík z věrného území
      const home = nearestControlled(ctrl, rebel, d.p);
      if (home) { moved++; divs[id] = { ...d, o: rebel, tpl: mapTpl(d.tpl), army: 0, path: [], prog: 0, p: home, org: d.org * 0.6 }; }
    }
  }
  const queue = mil.queue.map((q) => (q.o === parent && ctrl[q.p] === rebel ? { ...q, o: rebel, tpl: mapTpl(q.tpl) } : q));

  // ---- zásoby výzbroje a lidská síla ----
  const share = Math.max(0.25, Math.min(0.75, total ? moved / total : 0.4));
  const stock = mil.stock.slice(), man = mil.man.slice();
  const out = {}, left = {};
  for (const e in mil.stock[parent]) { const n = Math.floor(mil.stock[parent][e] * share); out[e] = n; left[e] = mil.stock[parent][e] - n; }
  stock[parent] = left; stock[rebel] = out;
  const mv = Math.floor(man[parent] * share);
  man[parent] -= mv; man[rebel] = mv;
  const lv = mil.lv ? mil.lv.slice() : mil.lv;
  if (lv) lv[rebel] = lv[parent] ? clone(lv[parent]) : lv[parent];

  let s = {
    ...state, stateOwner, ctrl, ownerVer: state.ownerVer + 1,
    mil: { ...mil, divs, tpl, queue, stock, man, lv, ver: mil.ver + 1 },
  };

  // ---- výzkum, doktríny, politika ----
  const copyOwn = (key) => { if (!s[key] || !s[key].own) return; const own = s[key].own.slice(); own[rebel] = clone(own[parent]); s = { ...s, [key]: { ...s[key], own, ...(s[key].ver != null ? { ver: s[key].ver + 1 } : {}) } }; };
  copyOwn('tech'); copyOwn('doc');
  {
    const own = s.pol.own.slice();
    own[rebel] = { ...clone(own[parent]), stab: 0.45, ws: 0.6, pp: 40 };
    own[parent] = { ...own[parent], stab: Math.max(0.15, own[parent].stab - 0.12) };
    s = { ...s, pol: { ...s.pol, own } };
  }

  // ---- letectvo: křídla z odtržených států a podíl rezervy ----
  if (s.air) {
    const set = new Set(mine);
    const wings = s.air.wings.map((x) => (x && x.o === parent && set.has(x.s) ? { ...x, o: rebel } : x));
    const pool = s.air.pool.slice();
    const pp = {}, rest = {};
    for (const t in pool[parent]) { const n = Math.floor(pool[parent][t] * share); pp[t] = n; rest[t] = pool[parent][t] - n; }
    pool[parent] = rest; pool[rebel] = pp;
    s = { ...s, air: { ...s.air, wings, pool, ver: (s.air.ver || 0) + 1 } };
  }

  // ---- diplomacie: země ožívá, obě strany jsou ve válce na život a na smrt ----
  const cap = s.dip.cap.slice(); cap[rebel] = 0;
  if (civil) {
    s = {
      ...s,
      dip: {
        ...s.dip, cap, ver: s.dip.ver + 1,
        rel: setRel(s.dip.rel, rebel, parent, -100),
        since: { ...s.dip.since, [pairKey(rebel, parent)]: s.tick },
        goal: { ...s.dip.goal, [`${rebel}>${parent}`]: 'civil' },
      },
    };
    s = declareWar(s, w.owners[rebel].tag, w.owners[parent].tag);
    return logAdd(s, { k: 'civil', o: parent, x: rebel, y: 1 });
  }
  s = { ...s, dip: { ...s.dip, cap, ver: s.dip.ver + 1 } };
  return logAdd(s, { k: 'civil', o: parent, x: rebel, y: 0 });
}

// ---- uvolnění národů (M70) ----
/** Id států, které by dostala uvolněná země po `loser` (podle `RELEASES`; `null` = všechny jeho státy), jen ty, které `loser` ještě vlastní. */
export function releaseIds(state, loser) {
  const rule = RELEASES[getWorld().owners[loser].tag];
  if (!rule) return [];
  const w = getWorld(), out = [];
  for (let s = 1; s < w.states.length; s++) {
    if (state.stateOwner[s] !== loser) continue;
    if (rule.states === null || rule.states.includes(w.states[s].n)) out.push(s);
  }
  return out;
}

/** Proč `victor` nemůže po `loser` uvolnit národ (český text), nebo null. */
export function releaseBlock(state, victor, loser) {
  if (!ok(victor) || !ok(loser) || victor === loser) return 'Neplatná země.';
  const rule = RELEASES[getWorld().owners[loser].tag];
  if (!rule) return 'Z této země se žádný národ uvolnit nedá.';
  const nu = getWorld().ownerIdx[rule.tag];
  if (hasCapitulated(state, victor) || isDormant(state, victor)) return 'Vítěz neexistuje.';
  if (!isDormant(state, nu)) return 'Uvolňovaná země už existuje.';
  return splitBlock(state, loser, nu, releaseIds(state, loser), true);
}

/** Vítěz uvolní národ ze států poražené země: nová země (loutka vítěze) dostane státy, příslušné divize a podíl zásob; poražená o ně přijde. */
export function releaseNation(state, victor, loser) {
  if (releaseBlock(state, victor, loser)) return state;
  const w = getWorld(), nu = w.ownerIdx[RELEASES[w.owners[loser].tag].tag];
  let s = splitCountry(state, loser, nu, releaseIds(state, loser), false, 0, true);
  if (s === state) return state;
  const sub = s.dip.sub.slice(); sub[nu] = victor;
  const au = s.dip.au.slice(); au[nu] = DIP.AU_START;
  s = { ...s, dip: { ...s.dip, sub, au, rel: setRel(s.dip.rel, nu, victor, 30), ver: s.dip.ver + 1 } };
  return logAdd(s, { k: 'release', o: victor, x: nu, y: loser });
}

/** Je mezi `a` a `b` občanská válka? (zapsaná v cíli války při rozdělení) */
export const isCivilWar = (state, a, b) => state.dip.goal[`${a}>${b}`] === 'civil' || state.dip.goal[`${b}>${a}`] === 'civil';

/** Denní krok: historické občanské války (jednorázově v okně po stanoveném dni; jen se zapnutým příznakem `ai.hist`). */
export function civilDay(state) {
  if (!state.ai || !state.ai.hist) return state;
  const w = getWorld(), day = state.tick / 24;
  for (const c of HIST_CIVIL) {
    if (day < c.day || day > c.day + c.window) continue;
    const parent = w.ownerIdx[c.tag], rebel = w.ownerIdx[c.rebel];
    if (!parent || !rebel) continue;
    const flag = `civil_${c.id}`;
    if (state.nat.own[parent].flags[flag]) continue;
    const ids = c.states.map(stateIdOf).filter(Boolean);
    const own = state.nat.own.slice();
    own[parent] = { ...own[parent], flags: { ...own[parent].flags, [flag]: 1 } };   // jednorázově, i kdyby rozdělení selhalo
    state = { ...state, nat: { ...state.nat, ver: state.nat.ver + 1, own } };
    state = splitCountry(state, parent, rebel, ids, true, c.defect || 0);
  }
  return state;
}
