// Volba „efekty mapy“ (M91: reliéf, den a noc, ztmavení mimo dohled) se pamatuje v localStorage (vždy v try/catch).
const KEY = 'e1936.mapfx';
let cached = null;

export function mapEffectsOn() {
  if (cached !== null) return cached;
  try { cached = typeof localStorage === 'undefined' || localStorage.getItem(KEY) !== '0'; } catch { cached = true; }
  return cached;
}
export function setMapEffects(v) {
  cached = !!v;
  try { localStorage.setItem(KEY, cached ? '1' : '0'); } catch { /* bez úložiště se volba jen neuloží */ }
}
