// Příkazy národních cílů a událostí (M22): čisté funkce `(state, …) → state`; neplatný vstup vrací tentýž objekt. Země je index `o`.
// Příkazy nehlídají, komu věc patří vůči hráči – to dělá `ui/actions.js`.
import { getWorld } from '../world.js';
import { EVENT_BY_ID } from '../../data/nat/index.js';
import { CONT_FOCUSES } from '../../data/nat/continuous.js';
import { NAT } from './constants.js';
import { focusStatus, focusTreeOf } from './core.js';
import { applyFx } from './effects.js';

const valid = (state, o) => Number.isInteger(o) && o >= 1 && o < getWorld().owners.length && !!state.nat.own[o];
const put = (state, o, own, extra = {}) => {
  const arr = state.nat.own.slice();
  arr[o] = own;
  return { ...state, nat: { ...state.nat, ver: state.nat.ver + 1, own: arr, ...extra } };
};

/** Začne plnit cíl `id` (musí být dostupný; jiný rozpracovaný cíl se zahodí s postupem). */
export function startFocus(state, o, id) {
  if (!valid(state, o)) return state;
  const own = state.nat.own[o];
  const f = focusTreeOf(o).find((x) => x.id === id);
  if (!f || focusStatus(own, f) !== 'available') return state;
  return put(state, o, { ...own, cur: { id, p: 0 }, cont: '' });   // běžný cíl ukončí průběžný (M85)
}

/** Přeruší plněný cíl (postup se ztratí). */
export function cancelFocus(state, o) {
  if (!valid(state, o) || !state.nat.own[o].cur) return state;
  return put(state, o, { ...state.nat.own[o], cur: null });
}

/** Proč země `o` nemůže držet průběžný cíl `id` (český text), nebo null (M85). */
export function contBlock(state, o, id) {
  if (!valid(state, o) || !CONT_FOCUSES[id]) return 'Neznámý průběžný cíl.';
  const own = state.nat.own[o];
  if (own.cur) return 'Nejdřív dokončete nebo přerušte plněný cíl.';
  const done = Object.keys(own.done).length;
  if (done < NAT.CONT_MIN) return `Průběžné cíle se otevřou po ${NAT.CONT_MIN} splněných cílech (máte ${done}).`;
  if (state.pol.own[o].pp < NAT.CONT_PP) return 'Chybí politická moc.';
  return null;
}

/** Zvolí průběžný cíl `id` (`''` = žádný). Bonus platí, dokud cíl běží; denně stojí `NAT.CONT_PP` politické moci. */
export function setContinuous(state, o, id) {
  if (!valid(state, o)) return state;
  const own = state.nat.own[o];
  if ((own.cont || '') === id) return state;
  if (id !== '' && contBlock(state, o, id)) return state;
  return put(state, o, { ...own, cont: id });
}

/** Rozhodne čekající událost hráče: provede účinky zvolené možnosti a odebere ji z fronty. */
export function chooseEvent(state, o, id, choice) {
  if (!valid(state, o)) return state;
  const i = state.nat.pend.findIndex((p) => p.o === o && p.id === id);
  const ev = EVENT_BY_ID[id];
  if (i < 0 || !ev || !Number.isInteger(choice) || choice < 0 || choice >= ev.opts.length) return state;
  const next = { ...state, nat: { ...state.nat, ver: state.nat.ver + 1, pend: state.nat.pend.filter((_, k) => k !== i) } };
  return applyFx(next, o, ev.opts[choice].fx);
}
