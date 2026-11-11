// Pravidla hry (M76, rozšíří M78): volby zadané při založení hry, uložené ve stavu `state.rules = { id: hodnota }`.
// Každé pravidlo má výchozí hodnotu a seznam povolených hodnot; neznámé klíče a hodnoty se zahodí.
export const RULES = {
  fog: { n: 'Mlha války', info: 'Cizí jednotky jsou vidět jen u vašich hranic, jednotek, radarů a tam, kde má vaše zpravodajská služba přehled.', def: 1, opts: [[1, 'zapnuto'], [0, 'vypnuto']] },
};
export const RULE_IDS = Object.keys(RULES);

/** Pravidla hry z voleb hráče (neplatné hodnoty nahradí výchozí). */
export function createRules(input) {
  const out = {};
  for (const id of RULE_IDS) {
    const v = input && input[id];
    out[id] = RULES[id].opts.some(([x]) => x === v) ? v : RULES[id].def;
  }
  return out;
}

/** Hodnota pravidla `id` (výchozí, když ve stavu chybí). */
export const ruleOf = (state, id) => (state.rules && id in state.rules ? state.rules[id] : RULES[id]?.def);
