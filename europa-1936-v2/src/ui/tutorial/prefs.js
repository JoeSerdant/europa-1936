// Volba „průvodce zapnutý“ se pamatuje v localStorage (vždy v try/catch); změna se oznámí oknu událostí `e1936-tutorial`.
const KEY = 'e1936.tutorial';
let cached = null;

export function tutorialOn() {
  if (cached !== null) return cached;
  try { cached = typeof localStorage === 'undefined' || localStorage.getItem(KEY) !== '0'; } catch { cached = true; }
  return cached;
}
export function setTutorial(v) {
  cached = !!v;
  try { localStorage.setItem(KEY, cached ? '1' : '0'); } catch { /* bez úložiště se volba jen neuloží */ }
  try { window.dispatchEvent(new Event('e1936-tutorial')); } catch { /* mimo prohlížeč nic */ }
}
