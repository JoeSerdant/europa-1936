// Barvy mapy: palety a vybarvení oblastí podle mapového režimu. Čisté funkce (bez DOM), takže jdou testovat.
import { TERRAIN } from '../../engine/worldCore.js';
import { supplyFlow } from '../../engine/army/supply.js';
import { infraOf } from '../../engine/industry/infra.js';

export const SEA_COLOR = '#17364f';
export const LAKE_COLOR = '#3f6d8f';
export const VOID_COLOR = '#25282c';

export const TERRAIN_COLORS = ['#c9d194', '#6f9b60', '#c4ad78', '#9d8e83', '#80b1a6', '#ead99f', '#a9a9b2'];

export const MODES = [
  { id: 'political', name: 'Politická', hint: 'Vlastníci provincií' },
  { id: 'terrain', name: 'Terén', hint: 'Roviny, lesy, hory, poušť' },
  { id: 'states', name: 'Státy', hint: 'Správní celky (stát = jednotka vlastnictví)' },
  { id: 'regions', name: 'Regiony', hint: 'Strategické regiony a podnebí' },
  { id: 'population', name: 'Obyvatelé', hint: 'Hustota obyvatel' },
  { id: 'victory', name: 'Vítězné body', hint: 'Města a jejich hodnota' },
  { id: 'supply', name: 'Zásobování', hint: 'Kolik zásob dorazí do vašich provincií' },
  { id: 'industry', name: 'Průmysl', hint: 'Továrny ve státech' },
];

export const CLIMATE_COLORS = {
  oceanic: '#7fb0c9', temperate: '#9cc27a', continental: '#c9c07a', subarctic: '#6f9a8a', arctic: '#c9dbe6',
  mediterranean: '#d6a86a', steppe: '#d8c58a', semiarid: '#d9b57f', desert: '#ecd9a0', alpine: '#a99fb6',
};

export function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgbCss = (c) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}
const hash = (n) => { let x = (n * 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; };

// sekvenční rampa (krémová → oranžová → hnědá)
const RAMP = [[243, 236, 212], [233, 196, 120], [214, 140, 60], [170, 82, 38], [96, 44, 30]];
function ramp(t) {
  t = clamp01(t) * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(t));
  return mix(RAMP[i], RAMP[i + 1], t - i);
}
const GOLD_RAMP = [[120, 120, 112], [201, 162, 74], [255, 214, 90]];

// zásobování: tok 0 → 3+ (jeden tok vystačí na zhruba jednu divizi; ke strategicky dobrému zásobování stačí ~3)
const SUPPLY_STOPS = [[0, [128, 52, 38]], [0.12, [186, 84, 52]], [0.4, [227, 177, 63]], [0.7, [168, 200, 104]], [1, [92, 172, 108]]];
export const SUPPLY_CSS = 'linear-gradient(90deg, rgb(128,52,38), rgb(186,84,52), rgb(227,177,63), rgb(168,200,104), rgb(92,172,108))';
const SUPPLY_FULL = 3;
/** Barva provincie podle toku zásobování (červená = skoro nic, zelená = dobré zásobování). */
export function supplyColor(flow) {
  if (!(flow > 0)) return [90, 38, 32];
  const t = clamp01(flow / SUPPLY_FULL);
  for (let i = 1; i < SUPPLY_STOPS.length; i++) {
    const [t1, c1] = SUPPLY_STOPS[i];
    if (t <= t1) { const [t0, c0] = SUPPLY_STOPS[i - 1]; return mix(c0, c1, (t - t0) / (t1 - t0)); }
  }
  return SUPPLY_STOPS[SUPPLY_STOPS.length - 1][1];
}

/**
 * Barva každé oblasti pro daný režim. Vrací pole délky nLabel (hodnota null = nevykreslovat vlastní barvou: moře, jezero).
 * `game` může být null (náhled bez hry) – pak platí počáteční vlastníci. `focus` = idx země, která zůstane v plné barvě (ostatní se ztlumí).
 */
export function fillColors(world, game, mode, focus = 0) {
  const L = world.L;
  const out = new Array(world.nLabel).fill(null);
  const ownerOf = (p) => (game ? game.stateOwner[world.provState[p]] : world.provOwner0[p]);
  const ownerRgb = world.owners.map((o) => (o ? hexToRgb(o.color) : [128, 128, 128]));
  const terr = TERRAIN_COLORS.map(hexToRgb);
  const me = game && game.player ? world.ownerIdx[game.player] : 0;
  const reach = mode === 'supply' && me ? supplyFlow(game.ctrl, me, infraOf(game)) : null;
  for (let p = 1; p <= L; p++) {
    const o = ownerOf(p);
    let c;
    switch (mode) {
      case 'terrain': c = terr[world.terrain[p]]; break;
      case 'states': {
        const s = world.provState[p];
        const base = ownerRgb[o];
        c = mix(base, hash(s) > 0.5 ? [255, 255, 255] : [30, 30, 30], 0.08 + hash(s * 7 + 3) * 0.3);
        break;
      }
      case 'regions': {
        const r = world.region[p];
        const clim = world.regions[r - 1][1];
        c = mix(hexToRgb(CLIMATE_COLORS[clim] || '#cccccc'), hash(r) > 0.5 ? [255, 255, 255] : [40, 40, 40], 0.06 + hash(r * 13 + 5) * 0.22);
        break;
      }
      case 'population': {
        const dens = world.pop[p] * 1000 / Math.max(1, world.area[p]);
        c = ramp((Math.log10(Math.max(0.3, dens)) - Math.log10(0.3)) / (Math.log10(600) - Math.log10(0.3)));
        break;
      }
      case 'victory': {
        const v = world.vp[p];
        c = v ? mix(GOLD_RAMP[1], GOLD_RAMP[2], clamp01(v / 40)) : mix(ownerRgb[o], [40, 44, 48], 0.62);
        break;
      }
      case 'industry': {
        const e = game && game.ind ? game.ind.st[world.provState[p]] : null;
        const n = e ? e.civ + e.mil : 0;
        c = n ? ramp(0.12 + n / 16) : mix(ownerRgb[o], [40, 44, 48], 0.62);
        break;
      }
      case 'supply': {
        const base = mix(ownerRgb[o], terr[world.terrain[p]], 0.16);
        c = reach && game.ctrl[p] === me ? supplyColor(reach[p]) : dim(base);
        break;
      }
      default: {          // political
        c = mix(ownerRgb[o], terr[world.terrain[p]], 0.16);
      }
    }
    if (focus) c = o === focus ? mix(c, [255, 255, 255], 0.07) : dim(c);
    out[p] = rgbCss(c);
  }
  return out;
}

/** Ztlumená barva (zbytek mapy při výběru země): ubere sytost a zhasne. */
function dim(c) {
  const g = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
  return mix(mix(c, [g, g, g], 0.6), [20, 28, 38], 0.42);
}

/** Barva země (pro popisky, štítky) – o něco tmavší než plocha. */
export const ownerLabelColor = (hex) => rgbCss(mix(hexToRgb(hex), [10, 14, 18], 0.65));

export { TERRAIN };
