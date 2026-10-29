// Deník dění (M26): kruhová paměť důležitých událostí ve stavu. Čisté funkce; zapisují ho ostatní systémy.
export const LOG_MAX = 300;

export const createLog = () => ({ n: 0, items: [] });

/** Přidá záznam `{ k, o?, a?, b?, x? }` s časem a id. */
export function logAdd(state, entry) {
  return logAddMany(state, [entry]);
}

export function logAddMany(state, entries) {
  if (!entries.length) return state;
  const log = state.log;
  let n = log.n;
  const add = entries.map((e) => ({ id: ++n, t: state.tick, ...e }));
  const items = log.items.concat(add);
  return { ...state, log: { n, items: items.length > LOG_MAX ? items.slice(items.length - LOG_MAX) : items } };
}
