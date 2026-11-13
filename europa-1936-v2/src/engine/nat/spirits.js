// Národní duchové (M74): `nat.own[o].sp = { id: do kdy (tick), 0 = trvale }`. Bonusy se sčítají do `polModsOf` (stejné klíče jako zákony a poradci),
// vypršelé duchy odstraňuje denní krok `natDay`. Čisté funkce; neplatný vstup vrací tentýž stav.
import { getWorld } from '../world.js';
import { SPIRITS, SPIRIT_START } from '../../data/nat/spirits.js';

export const NO_SPIRIT_MODS = Object.freeze({});
const modCache = new WeakMap();   // objekt `sp` → součet bonusů

/** Součet bonusů duchů (mezipaměť podle objektu `sp`; vypršelé duchy maže `expireSpirits`, takže čas tu nehraje roli). */
export function spiritMods(sp) {
  if (!sp) return NO_SPIRIT_MODS;
  let m = modCache.get(sp);
  if (m) return m;
  m = {};
  let any = false;
  for (const id in sp) { const mod = SPIRITS[id]?.mod; if (mod) { any = true; for (const k in mod) m[k] = (m[k] || 0) + mod[k]; } }
  if (!any) m = NO_SPIRIT_MODS;
  modCache.set(sp, m);
  return m;
}

const armyCache = new WeakMap();   // objekt `sp` → součet vojenských bonusů
/** Součet vojenských bonusů duchů (M88; klíče jako u velitelů a doktrín). Bez bonusů vrací `NO_SPIRIT_MODS`. */
export function spiritArmyMods(sp) {
  if (!sp) return NO_SPIRIT_MODS;
  let m = armyCache.get(sp);
  if (m) return m;
  m = {};
  let any = false;
  for (const id in sp) { const mod = SPIRITS[id]?.army; if (mod) { any = true; for (const k in mod) m[k] = (m[k] || 0) + mod[k]; } }
  if (!any) m = NO_SPIRIT_MODS;
  armyCache.set(sp, m);
  return m;
}

/** Počáteční duchové země podle tagu. */
export function startSpirits(tag) {
  const sp = {};
  for (const id of SPIRIT_START[tag] || []) if (SPIRITS[id]) sp[id] = 0;
  return sp;
}

const setSp = (state, o, sp) => {
  const own = state.nat.own.slice();
  own[o] = { ...own[o], sp };
  return { ...state, nat: { ...state.nat, ver: state.nat.ver + 1, own } };
};
const valid = (state, o) => Number.isInteger(o) && o >= 1 && o < getWorld().owners.length && !!state.nat.own[o];

/** Přidá zemi ducha `id` na `days` dní (0 nebo nic = trvale). Trvalý duch se dočasným nepřepíše; delší trvání nahradí kratší. */
export function addSpirit(state, o, id, days = 0) {
  if (!valid(state, o) || !SPIRITS[id]) return state;
  const sp = state.nat.own[o].sp || {}, until = days > 0 ? state.tick + Math.round(days) * 24 : 0;
  if (id in sp && (sp[id] === 0 || (until !== 0 && sp[id] >= until))) return state;
  return setSp(state, o, { ...sp, [id]: until });
}

/** Odebere zemi ducha `id`. */
export function removeSpirit(state, o, id) {
  if (!valid(state, o)) return state;
  const sp = state.nat.own[o].sp || {};
  if (!(id in sp)) return state;
  const next = { ...sp };
  delete next[id];
  return setSp(state, o, next);
}

/** Denní krok: odstraní duchy, kterým vypršel čas. */
export function expireSpirits(state) {
  let s = state;
  for (let o = 1; o < s.nat.own.length; o++) {
    const sp = s.nat.own[o] && s.nat.own[o].sp;
    if (!sp) continue;
    let next = null;
    for (const id in sp) if (sp[id] > 0 && sp[id] <= s.tick) { if (!next) next = { ...sp }; delete next[id]; }
    if (next) s = setSp(s, o, next);
  }
  return s;
}

/** Duchové země pro rozhraní: [{ id, n, info, tone, mod, days (zbývá; 0 = trvale) }]. */
export function spiritsOf(state, o) {
  const sp = (state.nat.own[o] && state.nat.own[o].sp) || {};
  return Object.keys(sp).filter((id) => SPIRITS[id]).map((id) => ({ id, ...SPIRITS[id], days: sp[id] > 0 ? Math.max(1, Math.ceil((sp[id] - state.tick) / 24)) : 0 }));
}
