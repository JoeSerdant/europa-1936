// Splněné úspěchy (M86) se pamatují v localStorage (vždy v try/catch) napříč hrami: { id: 1 }.
const KEY = 'e1936.achievements';
let cached = null;

/** Množina id splněných úspěchů. */
export function achDone() {
  if (cached) return cached;
  cached = new Set();
  try { const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null; if (raw) for (const id of Object.keys(JSON.parse(raw))) cached.add(id); } catch { /* poškozený záznam se ignoruje */ }
  return cached;
}

/** Zapíše nově splněné úspěchy; vrací ty, které dosud splněné nebyly. */
export function markAch(ids) {
  const done = achDone(), fresh = ids.filter((id) => !done.has(id));
  if (!fresh.length) return fresh;
  for (const id of fresh) done.add(id);
  try { localStorage.setItem(KEY, JSON.stringify(Object.fromEntries([...done].map((id) => [id, 1])))); } catch { /* bez úložiště platí jen do zavření stránky */ }
  return fresh;
}

/** Zapomene všechny úspěchy (pro testy a tlačítko v okně). */
export function resetAch() {
  cached = new Set();
  try { localStorage.removeItem(KEY); } catch { /* nic */ }
}
