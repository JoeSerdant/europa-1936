// Volba „posun mapy okrajem obrazovky“ (M59): uložená v prohlížeči, vše v try/catch.
const KEY = 'e1936.edge';
export function edgeScrollOn() {
  try { return localStorage.getItem(KEY) !== '0'; } catch { return true; }
}
export function setEdgeScroll(on) {
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* bez úložiště */ }
}
