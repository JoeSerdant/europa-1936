// Pravidla hry (M76, M78): volby zadané při založení hry, uložené ve stavu `state.rules = { id: hodnota }`.
// Každé pravidlo má výchozí hodnotu a seznam povolených hodnot [hodnota, popisek, násobek?]; neznámé klíče a hodnoty se zahodí.
export const RULES = {
  fog: { n: 'Mlha války', info: 'Cizí jednotky jsou vidět jen u vašich hranic, jednotek, radarů a tam, kde má vaše zpravodajská služba přehled.', def: 1, opts: [[1, 'zapnuto'], [0, 'vypnuto']] },
  aggr: { n: 'Útočnost AI', info: 'Jak ochotně AI země útočí: opatrná potřebuje větší převahu sil, útočná menší.', def: 1, opts: [[0, 'opatrná', 0.8], [1, 'vyvážená', 1], [2, 'útočná', 1.25]] },
  bonus: { n: 'Vaše země', info: 'Výhoda (+15 %) nebo nevýhoda (−15 %) vaší země ve výrobě, stavbách a výzkumu proti běžnému stavu.', def: 1, opts: [[2, 'výhoda', 1.15], [1, 'bez úprav', 1], [0, 'nevýhoda', 0.85]] },
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

/** Násobek zvolené hodnoty pravidla `id` (třetí položka volby; 1, když ji volba nemá). */
export function ruleMult(state, id) {
  const R = RULES[id];
  if (!R) return 1;
  const v = ruleOf(state, id), o = R.opts.find(([x]) => x === v);
  return o && o.length > 2 ? o[2] : 1;
}

/** Hodnota pravidla `id` (výchozí, když ve stavu chybí). */
export const ruleOf = (state, id) => (state.rules && id in state.rules ? state.rules[id] : RULES[id]?.def);
