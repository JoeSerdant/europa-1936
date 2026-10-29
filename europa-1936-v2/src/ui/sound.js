// Zvuky rozhraní (M37): vlastní syntetizované zvuky přes Web Audio (žádné nahrávky). Zapnuto lze přepnout v nabídce; volba se pamatuje v `localStorage`.
// Vše je v try/catch a bez Web Audio nebo před první akcí uživatele se nic nestane.
const KEY = 'e1936.sound';
let ctx = null;
let on = true;
try { on = typeof localStorage === 'undefined' || localStorage.getItem(KEY) !== '0'; } catch { on = true; }

const audio = () => {
  if (ctx) return ctx;
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return null;
  ctx = new AC();
  return ctx;
};

/** Jeden tón: frekvence, délka (s), vlna, hlasitost, zpoždění (s) a klouzání frekvence. */
function tone(freq, dur, type = 'sine', vol = 0.04, delay = 0, slide = 0) {
  const a = audio();
  if (!a) return;
  if (a.state === 'suspended') a.resume();
  const t0 = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(a.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

export const SFX = {
  click: () => tone(520, 0.05, 'square', 0.018),
  tab: () => { tone(420, 0.04, 'triangle', 0.03); tone(630, 0.05, 'triangle', 0.025, 0.035); },
  confirm: () => { tone(440, 0.08, 'triangle', 0.04); tone(660, 0.12, 'triangle', 0.04, 0.07); },
  error: () => tone(160, 0.18, 'sawtooth', 0.035, 0, -60),
  notify: () => { tone(740, 0.1, 'sine', 0.035); tone(988, 0.16, 'sine', 0.03, 0.09); },
  alert: () => { tone(392, 0.14, 'triangle', 0.05); tone(392, 0.14, 'triangle', 0.05, 0.18); tone(523, 0.3, 'triangle', 0.05, 0.36); },
  war: () => { tone(90, 0.5, 'sawtooth', 0.06, 0, -40); tone(70, 0.6, 'square', 0.04, 0.15, -30); },
  end: () => { tone(330, 0.3, 'triangle', 0.05); tone(262, 0.3, 'triangle', 0.05, 0.28); tone(196, 0.6, 'triangle', 0.05, 0.56); },
};

export const soundOn = () => on;
export function setSound(v) {
  on = !!v;
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* bez úložiště se volba jen neuloží */ }
  if (on) SFX.confirm();
}

/** Přehraje zvuk `name`, je-li zvuk zapnutý a prohlížeč umí Web Audio. */
export function play(name) {
  if (!on || !SFX[name]) return;
  try { SFX[name](); } catch { /* zvuk nikdy nesmí shodit hru */ }
}
