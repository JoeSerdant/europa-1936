// Strany a vláda (M72): každá země má podporu čtyř stran (`pol.own[o].par`, body, součet 100) a vládnoucí ideologii (`gov`). Podpora se denně posouvá
// (návrat k výchozímu rozložení, nestabilita posiluje radikály, válka a válečné zákony fašisty a komunisty); hráč i AI ji mohou podpořit za politickou moc,
// cizí zpravodajská služba ji může posunout operací. Když jiná strana předstihne vládnoucí o `COUP_GAP` bodů a stabilita je nízká, dojde k převratu: vládnoucí
// ideologie se změní, což mění vztahy (`relOf`), bloky (členové s nepřátelskou ideologií odejdou) i podmínky rozhodnutí. Čisté funkce, neplatný vstup vrací tentýž stav.
import { getWorld } from '../world.js';
import { COUNTRIES } from '../../data/countries.js';
import { IDEO_ORDER } from '../../data/politics/ideology.js';
import { IDEO_REL } from '../../data/dip/relations.js';
import { logAdd } from '../log.js';
import { addSpirit } from '../nat/spirits.js';
import { POL } from './constants.js';
import { startParties } from './setup.js';

export { startParties, startGov } from './setup.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Vládnoucí ideologie země (po převratu jiná než výchozí). */
export function ideologyOf(state, o) {
  const own = state.pol && state.pol.own[o];
  return (own && own.gov) || COUNTRIES[getWorld().owners[o].tag]?.ideology || 'neutrality';
}

/** Výchozí ideologie vlády v lednu 1936. */
export const startIdeology = (o) => COUNTRIES[getWorld().owners[o].tag]?.ideology || 'neutrality';

/** Základ vztahu dvou ideologií (symetrický). */
export const ideoRel = (a, b) => IDEO_REL[a]?.[b] ?? IDEO_REL[b]?.[a] ?? 0;

/** Strana s nejvyšší podporou mezi soupeři vládnoucí strany: { id, gap } (gap = náskok soupeře před vládnoucí stranou, může být záporný). */
export function rivalOf(own) {
  let id = '', best = -Infinity;
  for (const k of IDEO_ORDER) if (k !== own.gov && own.par[k] > best) { best = own.par[k]; id = k; }
  return { id, gap: best - own.par[own.gov] };
}

/** Přidá straně `ideo` `v` bodů na úkor ostatních (úměrně jejich podpoře); součet zůstane 100. */
export function shiftParty(par, ideo, v) {
  if (!IDEO_ORDER.includes(ideo) || !v) return par;
  const take = v > 0 ? Math.min(v, 100 - par[ideo]) : Math.max(v, -par[ideo]);
  const others = IDEO_ORDER.filter((k) => k !== ideo);
  const pool = others.reduce((a, k) => a + par[k], 0);
  if (pool <= 0) return par;
  const out = { ...par, [ideo]: par[ideo] + take };
  for (const k of others) out[k] = Math.max(0, par[k] - (take * par[k]) / pool);
  return out;
}

const setOwn = (state, o, patch) => {
  const own = state.pol.own.slice();
  own[o] = { ...own[o], ...patch };
  return { ...state, pol: { ...state.pol, ver: state.pol.ver + 1, own } };
};

/** Proč země `o` nemůže podpořit stranu `ideo` (český text), nebo null. */
export function supportBlock(state, o, ideo) {
  const own = state.pol && state.pol.own[o];
  if (!own || !own.par) return 'Neplatná země.';
  if (!IDEO_ORDER.includes(ideo)) return 'Neznámá strana.';
  if (own.par[ideo] >= 100 - POL.PARTY_MIN) return 'Strana už má téměř všechnu podporu.';
  if (state.tick - own.pt < POL.PARTY_CD * 24 && own.pt >= 0) return `Další podpora strany za ${Math.ceil((POL.PARTY_CD * 24 - (state.tick - own.pt)) / 24)} dní.`;
  if (own.pp < POL.PARTY_PP) return `Chybí politická moc (${Math.ceil(POL.PARTY_PP - own.pp)}).`;
  return null;
}

/** Podpoří stranu `ideo`: stojí politickou moc, strana získá `PARTY_GAIN` bodů. */
export function supportParty(state, o, ideo) {
  if (supportBlock(state, o, ideo)) return state;
  const own = state.pol.own[o];
  return setOwn(state, o, { par: shiftParty(own.par, ideo, POL.PARTY_GAIN), pp: own.pp - POL.PARTY_PP, pt: state.tick });
}

/** Posune podporu stran v zemi `o` (účinek cíle, události nebo zpravodajské operace). */
export function pushParty(state, o, ideo, v) {
  const own = state.pol && state.pol.own[o];
  if (!own || !own.par || !IDEO_ORDER.includes(ideo)) return state;
  const par = shiftParty(own.par, ideo, v);
  return par === own.par ? state : setOwn(state, o, { par });
}

/**
 * Změní vládnoucí ideologii země: ztráta stability a politické moci, členové bloku s nepřátelskou ideologií bloky opouštějí
 * (vedoucí bloku, jehož vláda se změnila, ztrácí ty, kdo teď mají s ním záporný ideologický vztah).
 */
export function changeGov(state, o, ideo) {
  const own = state.pol && state.pol.own[o];
  if (!own || !own.par || !IDEO_ORDER.includes(ideo) || ideo === own.gov) return state;
  let s = setOwn(state, o, { gov: ideo, gt: state.tick, stab: Math.max(0.1, own.stab - POL.COUP_HIT), pp: 0 });
  s = addSpirit(s, o, 'porevolucni_chaos', POL.COUP_CHAOS_DAYS);   // M74: dočasný národní duch
  const id = s.dip.fac[o];
  if (id) {   // členové, jejichž vláda se s novou vládou o (nebo s vedoucím) neslučuje, blok opouštějí
    const f = s.dip.facs[id];
    const out = f.mem.filter((m) => m !== f.ldr && ideoRel(ideologyOf(s, m), ideologyOf(s, f.ldr)) < 0);
    if (out.length) {
      const mem = f.mem.filter((m) => !out.includes(m));
      const fac = s.dip.fac.slice();
      for (const m of out) fac[m] = 0;
      const facs = s.dip.facs.slice();
      facs[id] = { ...f, mem };
      s = { ...s, dip: { ...s.dip, fac, facs, ver: s.dip.ver + 1 } };
    }
  }
  return logAdd(s, { k: 'gov', o, x: ideo });
}

/** Denní krok stran jedné země: posun podpory, případný převrat. Vrací nový stav `own` (nebo tentýž objekt). */
const startOf = new Map();
function partyStep(o, own, war) {
  const tag = getWorld().owners[o].tag;
  let start = startOf.get(tag);
  if (!start) { start = startParties(tag); startOf.set(tag, start); }
  const eco = own.laws && own.laws.eco, con = own.laws && own.laws.con;
  const push = {};
  for (const k of IDEO_ORDER) push[k] = POL.PARTY_REVERT * (start[k] - own.par[k]);
  const unrest = POL.PARTY_UNREST * Math.max(0, 0.5 - own.stab);
  push.communism += unrest; push.fascism += unrest;
  if (war) { push.fascism += POL.PARTY_WAR; push.communism += POL.PARTY_WAR / 2; push.democracy -= POL.PARTY_WAR * 1.5; }
  const hard = (eco && eco !== 'civ' ? 1 : 0) + (con && con !== 'lim' ? 1 : 0);
  push.fascism += POL.PARTY_LAW * hard; push.communism += POL.PARTY_LAW * hard * 0.5;
  push.democracy += POL.PARTY_LAW * (hard ? -hard : 1);
  let par = { ...own.par }, sum = 0;
  for (const k of IDEO_ORDER) { par[k] = Math.max(POL.PARTY_MIN, par[k] + push[k]); sum += par[k]; }
  for (const k of IDEO_ORDER) par[k] = (par[k] * 100) / sum;
  return par;
}

/** Denní krok všech zemí: podpora stran a převraty. Bez změny vrací tentýž stav. */
export function partiesDay(state, war) {
  let s = state, arr = state.pol.own, copy = false;
  const coups = [];
  for (let o = 1; o < arr.length; o++) {
    const cur = arr[o];
    if (!cur || !cur.par || (s.dip.cap && s.dip.cap[o])) continue;
    const par = partyStep(o, cur, war(o));
    let moved = false;
    for (const k of IDEO_ORDER) if (Math.abs(par[k] - cur.par[k]) > 1e-9) { moved = true; break; }
    if (!moved) continue;
    if (!copy) { arr = arr.slice(); copy = true; }
    arr[o] = { ...cur, par };
    const rv = rivalOf(arr[o]);
    if (rv.gap >= POL.COUP_GAP && cur.stab < POL.COUP_STAB && (cur.gt < 0 || s.tick - cur.gt >= POL.COUP_COOL * 24)) coups.push([o, rv.id]);
  }
  if (!copy) return state;
  s = { ...s, pol: { ...s.pol, own: arr } };
  for (const [o, ideo] of coups) s = changeGov(s, o, ideo);
  return s;
}
