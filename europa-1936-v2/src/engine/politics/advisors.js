// P1: kdo smí být poradcem země – osobnosti jen své země (případně až po ideologii nebo cíli), obecní poradci jen tam, kde země nemá vlastní výběr pro slot.
import { getWorld } from '../world.js';
import { ADVISORS, ADVISOR_IDS } from '../../data/politics/index.js';
import { ideologyOf } from './parties.js';

const hasOwn = new Map();   // `tag:slot` → má země vlastní osobnosti pro slot?
function ownList(tag, slot) {
  const k = `${tag}:${slot}`;
  if (!hasOwn.has(k)) hasOwn.set(k, ADVISOR_IDS.some((id) => ADVISORS[id].tag === tag && ADVISORS[id].slot === slot));
  return hasOwn.get(k);
}

/** Proč poradce `id` není pro zemi `o` k dispozici (česky), nebo null. Cenu nekontroluje. */
export function advBlock(state, o, id) {
  const a = ADVISORS[id];
  if (!a) return 'Neznámý poradce.';
  const tag = getWorld().owners[o].tag;
  if (a.tag ? a.tag !== tag : ownList(tag, a.slot)) return 'Není z vaší země.';
  if (a.req && a.req.ideo && ideologyOf(state, o) !== a.req.ideo) return 'Jen při jiné vládě.';
  if (a.req && a.req.focus && !(state.nat && state.nat.own[o] && state.nat.own[o].done[a.req.focus])) return 'Odemkne národní cíl.';
  return null;
}

/** Poradci, které země vidí ve slotu (i zamčení osobnosti své země; cizí ne). */
export const advOptions = (state, o, slot) => {
  const tag = getWorld().owners[o].tag, own = ownList(tag, slot);
  return ADVISOR_IDS.filter((id) => ADVISORS[id].slot === slot && (own ? ADVISORS[id].tag === tag : !ADVISORS[id].tag));
};
