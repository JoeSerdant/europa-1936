// Responzivní rozhraní (UI): velikost ovládacích prvků podle okna počítače. Mapa se kreslí vždy v plném rozlišení,
// panely, lišty a okna se zvětšují (CSS `zoom` přes proměnnou --ui-scale): do 1920×1080 je měřítko 1, na větších monitorech
// roste (2560×1440 → 1,33, 4K → 2), v malých oknech pod 1280×720 se zmenší (nejméně 0,75). Hráč může měřítko upravit v nabídce.
const KEY = 'e1936.uiscale';
export const UI_SCALE_OPTS = [['auto', 'automaticky'], ['0.85', '85 %'], ['1', '100 %'], ['1.15', '115 %'], ['1.3', '130 %'], ['1.5', '150 %']];

/** Automatické měřítko pro okno `w`×`h` (CSS px). */
export function autoScale(w, h) {
  const big = Math.min(w / 1920, h / 1080);
  if (big >= 1) return Math.min(2.5, big);
  const small = Math.min(w / 1280, h / 720);
  return small >= 1 ? 1 : Math.max(0.75, small);
}

/** Zvolené měřítko ('auto' nebo číslo jako text). */
export function uiScalePref() {
  try { const v = globalThis.localStorage && globalThis.localStorage.getItem(KEY); if (UI_SCALE_OPTS.some(([id]) => id === v)) return v; } catch { /* nic */ }
  return 'auto';
}
export function setUiScalePref(id) {
  if (!UI_SCALE_OPTS.some(([x]) => x === id)) return;
  try { globalThis.localStorage && globalThis.localStorage.setItem(KEY, id); } catch { /* nic */ }
  applyUiScale();
}

/** Měřítko pro okno a volbu hráče (u ruční volby se ještě násobí podle velikosti obrazovky, aby 100 % na 4K nebylo drobné). */
export function scaleFor(w, h, pref) {
  const a = autoScale(w, h);
  return pref === 'auto' ? a : Math.round(Math.max(0.6, Math.min(3, a * Number(pref))) * 1000) / 1000;
}

let current = 1;
/** Aktuální měřítko rozhraní (pro převod souřadnic myši na souřadnice uvnitř zvětšených prvků). */
export const uiScale = () => current;

const listeners = new Set();
/** Odběr změn měřítka (např. mapa přepočítá volnou plochu pro kameru). */
export function onUiScale(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** Nastaví --ui-scale na kořeni dokumentu podle okna a volby. */
/** Breakpointy rozhraní (dřív @media): třída `uw-N` = šířka rozhraní po zvětšení nejvýš N px, `uh-N` = výška nejvýš N px. */
export const UI_BREAKS = { w: [1400, 1499, 1500, 1599, 2199], h: [800, 820] };

/** Třídy breakpointů pro rozhraní o velikosti `w`×`h` (px rozhraní, tj. okno děleno měřítkem). */
export function breakClasses(w, h) {
  return [...UI_BREAKS.w.filter((n) => w <= n).map((n) => `uw-${n}`), ...UI_BREAKS.h.filter((n) => h <= n).map((n) => `uh-${n}`)];
}

export function applyUiScale() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return current;
  const s = scaleFor(window.innerWidth, window.innerHeight, uiScalePref());
  const root = document.documentElement;
  const w = window.innerWidth / s, h = window.innerHeight / s;
  // jednotky okna pro zvětšené prvky (CSS zoom násobí i vw/vh – styly proto používají var(--uvw) / var(--uvh))
  root.style.setProperty('--uvw', `${(w / 100).toFixed(3)}px`);
  root.style.setProperty('--uvh', `${(h / 100).toFixed(3)}px`);
  const want = breakClasses(w, h);
  for (const c of [...root.classList]) if (/^u[wh]-\d+$/.test(c) && !want.includes(c)) root.classList.remove(c);
  for (const c of want) root.classList.add(c);
  if (s !== current || !root.style.getPropertyValue('--ui-scale')) {
    current = s;
    root.style.setProperty('--ui-scale', String(s));
    for (const fn of listeners) fn(s);
  }
  return current;
}

/** Zapne sledování velikosti okna (volá se jednou při startu). */
export function watchUiScale() {
  if (typeof window === 'undefined') return;
  applyUiScale();
  window.addEventListener('resize', applyUiScale, { passive: true });
}
