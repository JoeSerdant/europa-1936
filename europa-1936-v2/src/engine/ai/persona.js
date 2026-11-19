// AI: styl velení země (F3, data `PERSONAS`). Čistá funkce stavu, nic se neukládá: v historickém režimu podle `HIST_PERSONA`,
// ve volné historii los podle semínka hry (`saltOf`) a země – každá hra je jiná, v jedné hře stálý.
import { getWorld } from '../world.js';
import { PERSONAS, PERSONA_IDS, HIST_PERSONA } from '../../data/ai/personas.js';
import { saltOf } from './free.js';
import { rand01 } from '../nat/core.js';

/** Id stylu velení země `o` (hráčova země i bez AI = 'vyvazena'). */
export function personaId(state, o) {
  if (!state.ai || !state.ai.level || !o) return 'vyvazena';
  const tag = getWorld().owners[o].tag;
  const hist = HIST_PERSONA[tag] || 'vyvazena';
  if (state.ai.hist) return hist;
  const weights = PERSONA_IDS.map((id) => (id === hist ? 2 : 1));
  let r = rand01(0, o, `persona:${saltOf(state)}`) * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < PERSONA_IDS.length; i++) { r -= weights[i]; if (r < 0) return PERSONA_IDS[i]; }
  return PERSONA_IDS[PERSONA_IDS.length - 1];
}

/** Styl velení země (řádek `PERSONAS`). */
export const personaOf = (state, o) => PERSONAS[personaId(state, o)];
