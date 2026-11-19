// Společné pomůcky AI (M24): rozpoznání země pod AI a násobek obtížnosti.
import { getWorld } from '../world.js';
import { DIFFICULTY } from '../../data/ai/difficulty.js';
import { ruleMult } from '../rules.js';

export const playerOf = (state) => (state.player ? getWorld().ownerIdx[state.player] : 0);
export const isAi = (state, o) => o !== playerOf(state);

/** Stupeň obtížnosti hry −2…2 (F3; 0 = běžná). Starší stav bez `ai.diff` ho odvodí z `ai.level` (1 lehká, 3 těžká). */
export function diffOf(state) {
  const a = state.ai;
  if (!a || !a.level) return 0;
  if (a.diff !== undefined) return a.diff;
  return a.level === 1 ? -1 : a.level === 3 ? 1 : 0;
}

/** Úpravy AI zemí podle obtížnosti (řádek `DIFFICULTY`). */
export const diffRow = (state) => DIFFICULTY[String(diffOf(state))] || DIFFICULTY['0'];

/**
 * Násobek země podle obtížnosti: `kind` = 'prod' (výroba a stavby), 'res' (výzkum), 'man' (lidská síla). AI podle obtížnosti (běžná = 1),
 * hráč ve výrobě a výzkumu podle pravidla hry `bonus` (M78: výhoda / nevýhoda hráče).
 */
export function aiMult(state, o, kind = 'prod') {
  if (state.player && !isAi(state, o)) return kind === 'man' ? 1 : ruleMult(state, 'bonus');
  if (!state.ai || !state.ai.level || !isAi(state, o)) return 1;
  return 1 + (diffRow(state)[kind] || 0);
}

/** Země, proti kterým má tábor (blok) země `o` válečný cíl: Set indexů (M88). Vůči nim je země útočníkem – útočí na ně a smí u nich podnikat vylodění. */
export function goalFoes(state, o) {
  const f = state.dip.facs[state.dip.fac[o]];
  const camp = new Set(f ? f.mem : [o]);
  const out = new Set();
  for (const k in state.dip.goal) {
    const [a, b] = k.split('>').map(Number);
    if (camp.has(a)) out.add(b);
  }
  return out;
}
