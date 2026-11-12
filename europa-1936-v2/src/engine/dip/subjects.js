// Loutkové státy a mírová konference (M33). Kapitulace (capitulate.js) rozdělí okupované státy; o zbytek poraženého rozhodne hlavní vítěz:
// ponechá ho jako loutkový stát (`dip.sub[loser] = vítěz`), nebo ho anektuje. Hráč rozhoduje v mírové konferenci (`dip.conf`), AI automaticky.
import { getWorld } from '../world.js';
import { DIP } from './constants.js';
import { atWar, enemiesOf } from '../army/war.js';
import { withCtx, settleAfterPeace, declareWar, makePeace } from '../army/commands.js';
import { COUNTRIES } from '../../data/countries.js';
import { logAdd } from '../log.js';
import { WARGOALS } from '../../data/dip/wargoals.js';
import { setRel } from './core.js';
import { releaseBlock, releaseNation } from '../civil/index.js';
import { RELEASES } from '../../data/dip/releases.js';

const ok = (o) => Number.isInteger(o) && o >= 1 && o < getWorld().owners.length;
const tagOf = (o) => getWorld().owners[o].tag;
const patch = (state, p) => ({ ...state, dip: { ...state.dip, ...p, ver: state.dip.ver + 1 } });

/** Pán loutkového státu `o` (idx země), jinak 0. */
export const overlordOf = (state, o) => (state.dip.sub && state.dip.sub[o]) || 0;
/** Loutkové státy země `o`. */
export function subjectsOf(state, o) {
  const out = [];
  if (!state.dip.sub) return out;
  for (let t = 1; t < state.dip.sub.length; t++) if (state.dip.sub[t] === o) out.push(t);
  return out;
}

/** Úroveň autonomie loutky podle hodnoty `au`: 0 kolonie, 1 loutka, 2 dominion, 3 nespokojená. */
export const autonomyLevel = (au) => DIP.AU_LEVELS.filter((x) => au >= x).length;
export const AUTONOMY_NAMES = ['Kolonie', 'Loutkový stát', 'Dominion', 'Nespokojená loutka'];
export const autonomyOf = (state, p) => (state.dip.au && state.dip.au[p]) || 0;

/** Proč pán nemůže změnit autonomii loutky (český text), nebo null. */
export function autonomyBlock(state, overlord, puppet, tighten) {
  if (!ok(overlord) || !ok(puppet) || overlordOf(state, puppet) !== overlord) return 'Není to vaše loutka.';
  const au = autonomyOf(state, puppet);
  if (tighten) {
    if (au <= 0) return 'Kontrola je už úplná.';
    if (state.pol.own[overlord].pp < DIP.AU_TIGHT_PP) return `Chybí politická moc (${Math.ceil(DIP.AU_TIGHT_PP - state.pol.own[overlord].pp)}).`;
  } else if (au >= 100) return 'Loutka je zcela nezávislá.';
  return null;
}

/** Pán utáhne kontrolu: autonomie klesne o `AU_TIGHT`, stojí politickou moc a stabilitu loutky. */
export function tightenControl(state, overlord, puppet) {
  if (autonomyBlock(state, overlord, puppet, true)) return state;
  const au = state.dip.au.slice(); au[puppet] = Math.max(0, au[puppet] - DIP.AU_TIGHT);
  const pol = state.pol.own.slice();
  pol[overlord] = { ...pol[overlord], pp: pol[overlord].pp - DIP.AU_TIGHT_PP };
  pol[puppet] = { ...pol[puppet], stab: Math.max(0, pol[puppet].stab - 0.03) };
  return { ...patch(state, { au }), pol: { ...state.pol, own: pol } };
}

/** Pán uvolní kontrolu: autonomie vzroste o `AU_LOOSE` a vztah se zlepší. */
export function loosenControl(state, overlord, puppet) {
  if (autonomyBlock(state, overlord, puppet, false)) return state;
  const au = state.dip.au.slice(); au[puppet] = Math.min(100, au[puppet] + DIP.AU_LOOSE);
  return patch(state, { au, rel: setRel(state.dip.rel, overlord, puppet, 10) });
}

/** Zbylé státy země `o` (které jí ještě patří). */
const statesOf = (state, o) => { const w = getWorld(), out = []; for (let s = 1; s < w.states.length; s++) if (state.stateOwner[s] === o) out.push(s); return out; };

/** Převede všechny státy a provincie `from` na `to`; jednotky `from` v takových provinciích zaniknou. */
function absorb(state, from, to) {
  const w = getWorld();
  const stateOwner = state.stateOwner.slice(), ctrl = state.ctrl.slice();
  for (let s = 1; s < w.states.length; s++) {
    if (stateOwner[s] !== from) continue;
    stateOwner[s] = to;
    for (const p of w.states[s].v) if (ctrl[p] === from) ctrl[p] = to;
  }
  const next = { ...state, stateOwner, ctrl, ownerVer: state.ownerVer + 1, mil: { ...state.mil, ver: state.mil.ver + 1 } };
  return withCtx(next, (ctx) => settleAfterPeace(ctx, from, to));
}

/** Mírová konference: vítěz nechá poraženého jako loutku. Poražený musí být kapitulovaný, s vlastními státy a bez pána. */
export function makePuppet(state, victor, loser) {
  if (!ok(victor) || !ok(loser) || victor === loser || !state.dip.cap[loser] || state.dip.cap[victor] || overlordOf(state, loser) || overlordOf(state, victor) === loser) return state;
  if (!statesOf(state, loser).length) return state;
  const cap = state.dip.cap.slice(); cap[loser] = 0;
  const sub = state.dip.sub.slice(); sub[loser] = victor;
  const pol = state.pol.own.slice();
  pol[loser] = { ...pol[loser], stab: Math.max(pol[loser].stab, 0.35) };
  const au = state.dip.au.slice(); au[loser] = DIP.AU_START;
  return logAdd({ ...patch(state, { cap, sub, au }), pol: { ...state.pol, own: pol } }, { k: 'puppet', o: victor, x: loser });
}

/** Vítěz anektuje zbytek poraženého (stát zanikne). */
export function annexRump(state, victor, loser) {
  if (!ok(victor) || !ok(loser) || victor === loser || !state.dip.cap[loser] || state.dip.cap[victor]) return state;
  if (!statesOf(state, loser).length) return state;
  return logAdd(absorb(state, loser, victor), { k: 'annex', o: victor, x: loser });
}

/** Anexe vlastního loutkového státu za politickou moc. */
export function annexPuppet(state, overlord, puppet) {
  if (!ok(overlord) || !ok(puppet) || overlordOf(state, puppet) !== overlord || state.pol.own[overlord].pp < DIP.ANNEX_PP) return state;
  const sub = state.dip.sub.slice(); sub[puppet] = 0;
  const cap = state.dip.cap.slice(); cap[puppet] = 1;
  const au = state.dip.au.slice(); au[puppet] = 0;
  const pol = state.pol.own.slice();
  pol[overlord] = { ...pol[overlord], pp: pol[overlord].pp - DIP.ANNEX_PP };
  const n = { ...patch(state, { sub, cap, au }), pol: { ...state.pol, own: pol } };
  return logAdd(absorb(n, puppet, overlord), { k: 'annex', o: overlord, x: puppet });
}

// ---- konference ----
/** Zadá konferenci po kapitulaci: hráč dostane rozhodnutí, AI rozhodne hned (velká nebo významná země se stane loutkou). */
/** Hodnota státu pro mírovou konferenci (M84): vítězné body jeho provincií + dvojnásobek továren a loděnic + 1. */
export function stateValue(state, s) {
  const w = getWorld(), e = state.ind.st[s] || {};
  let v = 1 + 2 * ((e.civ || 0) + (e.mil || 0) + (e.dok || 0));
  for (const p of w.states[s].v) v += w.vp[p];
  return v;
}

/** Sousedí stát `s` s územím, které vlastní nebo ovládá země `c`? */
function touches(state, c, s) {
  const w = getWorld();
  for (const p of w.states[s].v) {
    let hit = false;
    w.forLandNeighbors(p, (q, kind) => { if (kind !== 2 && (state.ctrl[q] === c || state.stateOwner[w.provState[q]] === c)) hit = true; });
    if (hit) return true;
  }
  return false;
}

/** Převede zbylý stát `s` poraženého `loser` vítězi `c` (celý, včetně provincií). */
function claimState(state, loser, c, s) {
  const w = getWorld();
  const stateOwner = state.stateOwner.slice(), ctrl = state.ctrl.slice();
  stateOwner[s] = c;
  for (const p of w.states[s].v) if (ctrl[p] === loser) ctrl[p] = c;
  const next = { ...state, stateOwner, ctrl, ownerVer: state.ownerVer + 1, mil: { ...state.mil, ver: state.mil.ver + 1 } };
  return withCtx(next, (ctx) => settleAfterPeace(ctx, loser, c));
}

/**
 * Nároky menších vítězů řízených AI (M84): kdo dobyl část poraženého, má body `pts` a za ně si bere zbylé státy sousedící s jeho územím
 * (od nejcennějšího, na který má). Hlavní vítěz `top` a hráč `skip` si tu neberou nic; země s pravidlem uvolnění národa se nedělí.
 */
function minorClaims(state, loser, top, pts, skip) {
  if (RELEASES[tagOf(loser)]) return state;
  const order = Object.keys(pts).map(Number).filter((c) => c !== top && c !== skip && pts[c] > 0 && !state.dip.cap[c]).sort((a, b) => pts[b] - pts[a] || a - b);
  const left = { ...pts };
  let s0 = state, moved = true;
  while (moved) {
    moved = false;
    for (const c of order) {
      let pick = 0, pv = 0;
      for (const s of statesOf(s0, loser)) { const v = stateValue(s0, s); if (v <= left[c] && v > pv && touches(s0, c, s)) { pv = v; pick = s; } }
      if (!pick) continue;
      s0 = claimState(s0, loser, c, pick);
      left[c] -= pv; moved = true;
    }
  }
  return s0;
}

/**
 * Mírová konference po kapitulaci `loser`: `by` = počty států, které vítězové dobyli (určí hlavního vítěze), `val` = hodnota těch států
 * (z ní mají vítězové body `CONF_SHARE × hodnota` na další územní zisky, M84).
 */
export function conference(state, loser, by, val = {}) {
  let victor = 0, best = 0;
  for (const k of Object.keys(by).map(Number).sort((a, b) => a - b)) if (by[k] > best) { best = by[k]; victor = k; }
  if (!victor || !statesOf(state, loser).length || state.dip.cap[victor]) return state;
  if (state.dip.goal[`${victor}>${loser}`] === 'civil' || state.dip.goal[`${loser}>${victor}`] === 'civil') return annexRump(state, victor, loser);   // M69: občanskou válku vítěz dokončí sjednocením
  const w = getWorld(), player = state.player ? w.ownerIdx[state.player] : 0;
  const pts = {};
  for (const c in val) pts[c] = Math.floor(val[c] * DIP.CONF_SHARE);
  state = minorClaims(state, loser, victor, pts, player);
  if (!statesOf(state, loser).length) return state;
  if (player && player !== victor && pts[player] > 0 && !state.dip.cap[player]) {   // hráč je menší vítěz: nejdřív si vybere on, potom rozhodne hlavní vítěz
    const id = state.dip.conf.reduce((a, c) => Math.max(a, c.id), 0) + 1;
    return patch(state, { conf: [...state.dip.conf, { id, loser, victor: player, ph: 'claims', pts: pts[player], top: victor }] });
  }
  return rumpDecision(state, loser, victor, pts[victor] || 0);
}

/** O zbytku poraženého rozhodne hlavní vítěz: hráč v dialogu (se svými body na územní zisky), AI hned. */
function rumpDecision(state, loser, victor, points) {
  const w = getWorld(), player = state.player ? w.ownerIdx[state.player] : 0;
  if (!statesOf(state, loser).length || state.dip.cap[victor]) return state;
  if (victor === player) {
    const id = state.dip.conf.reduce((a, c) => Math.max(a, c.id), 0) + 1;
    return patch(state, { conf: [...state.dip.conf, { id, loser, victor, g: state.dip.goal[`${victor}>${loser}`] || 'conquest', rel: releaseBlock(state, victor, loser) === null ? 1 : 0, pts: points }] });
  }
  if (releaseBlock(state, victor, loser) === null) {   // M70: AI vítěz z poražené země uvolní národ (Vichy, Slovensko, Chorvatsko) jako svou loutku
    state = releaseNation(state, victor, loser);
    if (!statesOf(state, loser).length) return state;
  }
  const tier = COUNTRIES[tagOf(loser)]?.tier ?? 3;
  return statesOf(state, loser).length >= 3 || tier <= 2 ? makePuppet(state, victor, loser) : annexRump(state, victor, loser);
}

const confOf = (state, id) => state.dip.conf.find((c) => c.id === id);
const without = (state, id) => state.dip.conf.filter((c) => c.id !== id);
export function confPuppet(state, id) {
  const c = confOf(state, id);
  if (!c) return state;
  if (c.g && c.g !== 'conquest') return state;
  const n = makePuppet(state, c.victor, c.loser);
  return patch(n, { conf: without(n, id) });
}
/** Uvolnění národu: z poražené země vznikne loutka vítěze (Vichy, Slovensko, Chorvatsko), zbytek vítěz anektuje. */
export function confRelease(state, id) {
  const c = confOf(state, id);
  if (!c || (c.g && c.g !== 'conquest')) return state;
  let n = releaseNation(state, c.victor, c.loser);
  if (n === state) return state;
  if (statesOf(n, c.loser).length) n = annexRump(n, c.victor, c.loser);
  return patch(n, { conf: without(n, id) });
}
export function confAnnex(state, id) {
  const c = confOf(state, id);
  if (!c) return state;
  if (c.g && c.g !== 'conquest') return state;
  const n = annexRump(state, c.victor, c.loser);
  return patch(n, { conf: without(n, id) });
}
/** Územní nároky: vítěz převezme nejcennější zbylé státy poraženého, ten zůstane samostatný. */
export function confTake(state, id) {
  const c = confOf(state, id);
  if (!c || c.g !== 'border') return state;
  const w = getWorld();
  const left = statesOf(state, c.loser).sort((a, b) => w.states[b].v.reduce((x, p) => x + w.vp[p], 0) - w.states[a].v.reduce((x, p) => x + w.vp[p], 0) || a - b);
  if (left.length < 2) return confAnnex(state, id);
  const take = new Set(left.slice(0, Math.min(WARGOALS.border.take, left.length - 1)));
  const stateOwner = state.stateOwner.slice(), ctrl = state.ctrl.slice();
  for (const s of take) { stateOwner[s] = c.victor; for (const p of w.states[s].v) if (ctrl[p] === c.loser) ctrl[p] = c.victor; }
  const cap = state.dip.cap.slice(); cap[c.loser] = 0;
  let n = withCtx({ ...state, stateOwner, ctrl, ownerVer: state.ownerVer + 1, mil: { ...state.mil, ver: state.mil.ver + 1 } }, (ctx) => settleAfterPeace(ctx, c.loser, c.victor));
  const pol = n.pol.own.slice(); pol[c.loser] = { ...pol[c.loser], stab: Math.max(pol[c.loser].stab, 0.3) };
  n = { ...patch(n, { cap, conf: without(n, id) }), pol: { ...n.pol, own: pol } };
  return logAdd(n, { k: 'take', o: c.victor, x: c.loser, y: take.size });
}
/** Ponížení: poražený zůstane samostatný, zaplatí politickou moc a ztratí podporu války. */
export function confTribute(state, id) {
  const c = confOf(state, id);
  if (!c || c.g !== 'tribute') return state;
  const cap = state.dip.cap.slice(); cap[c.loser] = 0;
  const pol = state.pol.own.slice();
  pol[c.victor] = { ...pol[c.victor], pp: pol[c.victor].pp + WARGOALS.tribute.pp_gain };
  pol[c.loser] = { ...pol[c.loser], ws: Math.max(0, pol[c.loser].ws - 0.2), stab: Math.max(pol[c.loser].stab, 0.3) };
  return logAdd({ ...patch(state, { cap, conf: without(state, id) }), pol: { ...state.pol, own: pol } }, { k: 'tribute', o: c.victor, x: c.loser });
}
export function confSkip(state, id) {
  return confOf(state, id) ? patch(state, { conf: without(state, id) }) : state;
}

/** Státy, které si hráč může v konferenci `id` vzít za body: [{ s, name, value, block }] od nejcennějšího (M84). */
export function confClaims(state, id) {
  const c = confOf(state, id), w = getWorld();
  if (!c || !(c.pts > 0)) return [];
  return statesOf(state, c.loser).map((s) => { const value = stateValue(state, s); return { s, name: w.states[s].n, value, block: value > c.pts ? `Chybí body (${value - c.pts}).` : null }; })
    .sort((a, b) => b.value - a.value || a.s - b.s);
}

/** Hráč si v konferenci vezme stát `s` za body. Když poraženému nic nezbyde, konference končí. */
export function confClaim(state, id, s) {
  const c = confOf(state, id);
  if (!c || state.stateOwner[s] !== c.loser) return state;
  const v = stateValue(state, s);
  if (!(c.pts >= v)) return state;
  let n = claimState(state, c.loser, c.victor, s);
  const rest = statesOf(n, c.loser).length;
  n = patch(n, { conf: rest ? n.dip.conf.map((x) => (x.id === id ? { ...x, pts: c.pts - v } : x)) : without(n, id) });
  return logAdd(n, { k: 'take', o: c.victor, x: c.loser, y: 1 });
}

/** Menší vítěz (hráč) dokončil své nároky: o zbytku rozhodne hlavní vítěz. */
export function confClaimsDone(state, id) {
  const c = confOf(state, id);
  if (!c || c.ph !== 'claims') return state;
  return rumpDecision(patch(state, { conf: without(state, id) }), c.loser, c.top, 0);
}

// ---- denní krok ----
/** Loutky vedou války pána, platí mu přísun lidské síly a politické moci; zaniklé nebo zrušené vztahy se čistí. */
export function subjectsDay(state) {
  const sub = state.dip.sub;
  if (!sub || !sub.some(Boolean)) return state;
  const w = getWorld();
  for (let p = 1; p < sub.length; p++) {
    const v = sub[p];
    if (!v) continue;
    if (state.dip.cap[v] || !statesOf(state, p).length) { state = patch(state, { sub: state.dip.sub.map((x, i) => (i === p ? 0 : x)) }); continue; }
    // války pána: přidat chybějící, ukončit ty, které pán už nevede
    const foes = new Set(enemiesOf(state.mil, v));
    for (const e of foes) if (e !== p && !atWar(state.mil, p, e) && !state.dip.cap[e]) state = declareWar(state, tagOf(p), tagOf(e));
    for (const e of enemiesOf(state.mil, p)) if (!foes.has(e) && e !== v) state = makePeace(state, tagOf(p), tagOf(e));
    // autonomie roste; při 100 se loutka osamostatní
    const au0 = state.dip.au[p] + DIP.AU_GROW;
    if (au0 >= 100) {
      const nsub = state.dip.sub.slice(); nsub[p] = 0;
      const nau = state.dip.au.slice(); nau[p] = 0;
      state = logAdd(patch(state, { sub: nsub, au: nau, rel: setRel(state.dip.rel, v, p, -20) }), { k: 'free', o: v, x: p });
      continue;
    }
    const au = state.dip.au.slice(); au[p] = au0;
    state = patch(state, { au });
    const mult = DIP.AU_MULT[autonomyLevel(au0)];
    // příspěvky
    const man = state.mil.man.slice();
    const give = Math.floor((man[p] || 0) * DIP.SUB_MAN * mult);
    if (give > 0) { man[p] -= give; man[v] = (man[v] || 0) + give; state = { ...state, mil: { ...state.mil, man } }; }
    const own = state.pol.own.slice();
    own[v] = { ...own[v], pp: own[v].pp + DIP.SUB_PP * mult };
    state = { ...state, pol: { ...state.pol, own } };
  }
  void w;
  return state;
}
