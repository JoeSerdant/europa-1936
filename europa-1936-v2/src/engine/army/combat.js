// Boj (hodinový krok). Bitva = jedna napadená provincie; útočníci stojí v sousedních provinciích a bojují „přes hranici“.
//  1. Strany se obnoví: útočníci, kteří dál mají za cíl provincii, a obránci, kteří v ní stojí.
//  2. Šířka bitvy podle terénu (a směrů útoku); na frontu se řadí divize v pořadí příchodu, ostatní jsou v záloze.
//  3. Každá divize na frontě rozdělí útok mezi nepřátelskou frontu (35 % na hlavní cíl), zásah ubírá organizaci a sílu.
//  4. Divize s nulovou organizací ustoupí (obránce) nebo ztratí chuť k útoku (útočník); bez místa k ústupu zaniká.
//  5. Bez obránců útočníci vyhrávají a postupují do provincie; bez útočníků obránci obstáli.
import { getWorld } from '../world.js';
import { C, xpLevel } from './constants.js';
import { geo, adjacency } from './geo.js';
import { TERRAIN_RULES, RIVER } from '../../data/army/terrain.js';
import { atWar } from './war.js';
import { adjKind } from './paths.js';
import { atMap, editDiv, removeDiv, relocate, removeBattle, editBattle, editGen, addMan, addCas, bumpVer, rnd } from './ctx.js';
import { statsOf, lackOf, modsOf } from './unit.js';

/** Násobek zásahu podle poměru průrazu a pancíře cíle. */
export function pierceMult(pierce, armor) {
  if (armor <= 0) return 1;
  const r = pierce / armor;
  for (let i = 0; i < C.PIERCE_T.length; i++) if (r >= C.PIERCE_T[i]) return C.PIERCE_D[i];
  return C.PIERCE_D[C.PIERCE_D.length - 1];
}

const hillish = (t) => t === 2 || t === 3;

/** Sestaví bojový profil divize pro danou bitvu a roli: hodnoty po všech úpravách. */
function profile(ctx, id, role, info) {
  const mil = ctx.mil, d = ctx.divs[id];
  const st = statsOf(mil, d);
  const m = modsOf(ctx, d);
  const att = role === 'att';
  const t = info.terr;
  const ut = st.terr[t] || null;
  const lack = lackOf(d);
  const power = Math.max(C.HP_POWER_FLOOR, st.hp ? d.hp / st.hp : 0);
  const lvl = xpLevel(d.xp);

  let a = 1 + (ut ? ut.atk : 0) + m.atk + C.XP_BONUS * lvl + (att ? C.SUP_ATK_ATT : C.SUP_ATK_DEF) * lack;
  let f = 1 + (ut ? ut.def : 0) + m.def + C.XP_BONUS * lvl + (att ? C.SUP_DEF_ATT : C.SUP_DEF_DEF) * lack;
  if (st.cls === 'arm') a += m.atkArm;
  else { a += m.atkInf; f += m.defInf; }
  if (hillish(t)) { a += m.hillAtk; f += m.hillDef; }
  if (att) {
    a += TERRAIN_RULES[t].atk;
    if (adjKind(d.p, info.p) === 1) a += RIVER.atk + (st.terr.r ? st.terr.r.atk : 0);
    const army = d.army ? ctx.armies[d.army] : null;
    if (army) a += army.pl;
  } else {
    f += C.DIG_BONUS * d.dig * (1 + 0.1 * st.eng);
    const fl = ctx.state.ind && ctx.state.ind.fort ? ctx.state.ind.fort[info.p] : 0;   // M42: pevnost v provincii
    if (fl) f += C.FORT_DEF * fl;
    if (info.dirs > 1) f += C.MULTIDIR_DEF * (1 - 1 / info.dirs);
  }
  const side = att ? info.attSide : info.depSide;
  const asup = ctx.state.air && ctx.state.air.sup;   // M30: podpora z letadel (klíč `vlastník:stát`)
  if (asup) a += asup[`${d.o}:${getWorld().provState[d.p]}`] || 0;
  a -= side.stack + side.over;
  f -= side.over * 0.5;
  a += side.recon;
  return {
    id, st, att, power, lack,
    soft: st.soft, hard: st.hard, pierce: st.pierce, armor: st.armor, hardness: st.hardness,
    atk: Math.max(0.1, a), guard: Math.max(0.25, f), def: st.def, brk: st.brk,
  };
}

/** Řadí divize na frontu podle pořadí, dokud se nenaplní šířka; zbytek je záloha. */
function pickFront(ctx, ids, W) {
  const front = [], reserve = [];
  let sum = 0;
  for (const id of ids) {
    if (sum < W) { front.push(id); sum += statsOf(ctx.mil, ctx.divs[id]).width; } else reserve.push(id);
  }
  return { front, reserve, sum };
}

function sideInfo(ctx, front, reserve, sumWidth, W, dirs, recon, oppRecon) {
  const n = front.length + reserve.length;
  const stack = Math.max(0, n - C.STACK_START - (dirs - 1) * 3) * C.STACK_PENALTY;
  const over = sumWidth > W ? Math.min(C.OVERWIDTH_MAX, ((sumWidth - W) / W) * C.OVERWIDTH_PENALTY) : 0;
  const rb = Math.max(-C.RECON_MAX, Math.min(C.RECON_MAX, (recon - oppRecon) * C.RECON_BONUS));
  return { stack, over, recon: rb };
}

const reconOf = (ctx, ids) => ids.reduce((s, id) => s + statsOf(ctx.mil, ctx.divs[id]).rec, 0);

/** Obnoví seznamy útočníků a obránců bitvy. */
function refreshSides(ctx, b) {
  const mil = ctx.mil;
  const att = b.att.filter((id) => {
    const d = ctx.divs[id];
    return d && d.path[0] === b.p && adjKind(d.p, b.p) >= 0 && adjKind(d.p, b.p) !== 2;
  });
  const at = atMap(ctx).get(b.p) || [];
  const dep = b.dep.filter((id) => ctx.divs[id] && at.includes(id));
  for (const id of at) {
    if (dep.includes(id)) continue;
    const u = ctx.divs[id];
    if (att.some((a) => atWar(mil, u.o, ctx.divs[a].o))) dep.push(id);
  }
  return { att, dep };
}

/** Kam může ustoupit poražená divize: sousední vlastní provincie bez nepřítele, co nejdál od útočníků. */
function retreatTarget(ctx, d, b) {
  const w = getWorld(), g = geo(w), adj = adjacency(w);
  let best = 0, bs = -Infinity;
  for (const e of adj[d.p]) {
    const q = e.to;
    if (e.kind === 2 || ctx.ctrl[q] !== d.o || b.from.includes(q)) continue;
    const there = atMap(ctx).get(q);
    if (there && there.some((x) => atWar(ctx.mil, d.o, ctx.divs[x].o))) continue;
    let far = Infinity;
    for (const f of b.from) far = Math.min(far, g.distKm(q, f));
    if (!isFinite(far)) far = 0;
    const score = far - q * 1e-6;
    if (score > bs) { bs = score; best = q; }
  }
  return best;
}

function destroyDivision(ctx, id) {
  const d = ctx.divs[id];
  const st = statsOf(ctx.mil, d);
  const left = st.hp ? Math.max(0, d.hp) / st.hp : 0;
  addCas(ctx, d.o, st.men * left * C.EQUIP_LOSS);
  removeDiv(ctx, id);
}

/** Zničí/ustoupí všechny divize s nulovou organizací nebo silou. Vrací, kolik divizí z bitvy vypadlo. */
function resolveBreaks(ctx, b, att, dep) {
  for (const id of dep.concat(att)) {
    const d = ctx.divs[id];
    if (!d) continue;
    const st = statsOf(ctx.mil, d);
    if (d.hp <= st.hp * C.DEATH_HP) { destroyDivision(ctx, id); continue; }
    if (d.org > 0) continue;
    const isAtt = att.includes(id);
    if (isAtt) {
      const e = editDiv(ctx, id);
      e.path = []; e.prog = 0; e.hold = C.HOLD_AFTER_LOSS; e.b = 0; e.org = 0;
    } else {
      const q = retreatTarget(ctx, d, b);
      if (!q) { destroyDivision(ctx, id); continue; }
      relocate(ctx, id, q);
      const e = editDiv(ctx, id);
      e.org = st.org * C.RETREAT_ORG; e.rt = C.RETREAT_HOURS; e.path = []; e.prog = 0; e.dig = 0; e.b = 0;
      const loss = st.hp * C.RETREAT_HP;
      e.hp = Math.max(st.hp * C.DEATH_HP * 2, e.hp - loss);
      addCas(ctx, d.o, st.men * (loss / st.hp) * C.EQUIP_LOSS);
    }
  }
}

function fightOne(ctx, bid) {
  const w = getWorld();
  const mil = ctx.mil;
  const b0 = ctx.battles.find((x) => x.id === bid);
  if (!b0) return;
  let { att, dep } = refreshSides(ctx, b0);
  if (!att.length) { endBattle(ctx, b0, [], dep, false); return; }
  if (!dep.length) { endBattle(ctx, b0, att, [], true); return; }

  const t = w.terrain[b0.p];
  const origins = new Set(att.map((id) => ctx.divs[id].p));
  const dirs = Math.max(1, origins.size);
  const W = TERRAIN_RULES[t].width * (1 + C.DIR_WIDTH * (dirs - 1));
  const fa = pickFront(ctx, att, W), fd = pickFront(ctx, dep, W);
  const recA = reconOf(ctx, att), recD = reconOf(ctx, dep);
  const info = {
    terr: t, p: b0.p, dirs,
    attSide: sideInfo(ctx, fa.front, fa.reserve, fa.sum, W, dirs, recA, recD),
    depSide: sideInfo(ctx, fd.front, fd.reserve, fd.sum, W, 1, recD, recA),
  };
  const pa = fa.front.map((id) => profile(ctx, id, 'att', info));
  const pd = fd.front.map((id) => profile(ctx, id, 'dep', info));

  const dmgOrg = new Map(), dmgHp = new Map();
  let outA = 0, outD = 0;
  const strike = (attackers, targets, which) => {
    for (const X of attackers) {
      const dice = C.DICE_LO + (C.DICE_HI - C.DICE_LO) * rnd(ctx);
      const n = targets.length;
      const main = Math.min(n - 1, Math.floor(rnd(ctx) * n));
      for (let i = 0; i < n; i++) {
        const T = targets[i];
        const share = n === 1 ? 1 : i === main ? C.MAIN_TARGET : (1 - C.MAIN_TARGET) / (n - 1);
        const base = X.soft * (1 - T.hardness) + X.hard * T.hardness;
        const avoid = C.AVOID_MAX * T.def / (T.def + C.AVOID_BRK * X.brk + C.AVOID_C);
        let hit = (base * X.atk * (1 - avoid) * pierceMult(X.pierce, T.armor) * X.power * dice * share) / T.guard;
        let orgM = 1, hpM = 1;
        if (T.armor > 0 && X.pierce / T.armor < C.PIERCE_T[2]) { orgM *= C.ARMOR_DEFLECT; hpM *= C.ARMOR_DEFLECT; }   // pancíř výrazně převyšuje průraz
        if (X.armor > 0 && X.armor > T.pierce) { orgM *= 1 + C.ARMOR_OUTCLASS; hpM *= 1 + C.ARMOR_OUTCLASS; }
        const o = hit * C.K_ORG * orgM, h = hit * C.K_HP * hpM;
        dmgOrg.set(T.id, (dmgOrg.get(T.id) || 0) + o);
        dmgHp.set(T.id, (dmgHp.get(T.id) || 0) + h);
        if (which === 'a') outA += hit; else outD += hit;
      }
    }
  };
  strike(pa, pd, 'a');
  strike(pd, pa, 'd');

  // použít zásahy, zkušenosti
  for (const P of pa.concat(pd)) {
    const e = editDiv(ctx, P.id);
    const o = dmgOrg.get(P.id) || 0, h = dmgHp.get(P.id) || 0;
    e.org = Math.max(0, e.org - o);
    e.hp = Math.max(0, e.hp - h);
    e.xp = Math.min(1, e.xp + C.XP_PER_COMBAT_HOUR);
    const lostMen = P.st.hp ? (h / P.st.hp) * P.st.men : 0;
    addCas(ctx, e.o, lostMen * C.EQUIP_LOSS);
    addMan(ctx, e.o, lostMen * C.CASUALTY_BACK);
    // zkušenosti velitelů
    if (e.army) {
      const army = ctx.armies[e.army];
      if (army) {
        if (army.cmd) editGen(ctx, army.cmd).xp += C.LEADER_XP_PER_DIV_HOUR;
        const grp = army.grp ? mil.groups[army.grp] : null;
        if (grp && grp.cmd) editGen(ctx, grp.cmd).xp += C.LEADER_XP_PER_DIV_HOUR * 0.3;
      }
    }
  }
  const b = editBattle(ctx, bid);
  b.att = att; b.dep = dep; b.hrs += 1;
  b.fa = fa.front; b.fd = fd.front;
  b.adv = outA + outD > 0 ? outA / (outA + outD) : 0.5;

  resolveBreaks(ctx, b, att, dep);
  const r = refreshSides(ctx, b);
  if (!r.att.length || !r.dep.length) endBattle(ctx, b, r.att, r.dep, r.att.length > 0 && !r.dep.length);
}

/** Ukončí bitvu: vítězní útočníci dostanou půlku cesty do provincie, všem se uvolní stav „v boji“. */
function endBattle(ctx, b, att, dep, attackersWon) {
  if (attackersWon) {
    for (const id of att) {
      const d = ctx.divs[id];
      if (!d) continue;
      const e = editDiv(ctx, id);
      e.prog = Math.max(e.prog, C.WIN_PROGRESS);
      e.xp = Math.min(1, e.xp + 0.004);
    }
  }
  for (const id of att.concat(dep)) {
    const d = ctx.divs[id];
    if (d && d.b === b.id) editDiv(ctx, id).b = 0;
  }
  removeBattle(ctx, b.id);
  bumpVer(ctx);
}

/** Po všech bitvách: každá divize v některé bitvě má `b` ≠ 0, ostatní 0. */
function syncEngaged(ctx) {
  const inBattle = new Map();
  for (const b of ctx.battles) {
    for (const id of b.att) if (!inBattle.has(id)) inBattle.set(id, b.id);
    for (const id of b.dep) if (!inBattle.has(id)) inBattle.set(id, b.id);
  }
  for (const [id, bid] of inBattle) {
    const d = ctx.divs[id];
    if (d && d.b !== bid) editDiv(ctx, id).b = bid;
  }
  for (let id = 1; id < ctx.divs.length; id++) {
    const d = ctx.divs[id];
    if (d && d.b !== 0 && !inBattle.has(id)) editDiv(ctx, id).b = 0;
  }
}

export function combatStep(ctx) {
  if (!ctx.battles.length) return;
  const ids = ctx.battles.map((b) => b.id);
  for (const id of ids) fightOne(ctx, id);
  syncEngaged(ctx);
}
