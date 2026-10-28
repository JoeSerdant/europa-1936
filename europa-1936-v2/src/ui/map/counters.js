// Kreslení žetonů jednotek na mapě: tvar žetonu, vojenská značka druhu, ukazatele síly a organizace, odznaky stavu.
// Čisté kreslicí funkce bez stavu (jen Canvas 2D); rozměry jsou v obrazovkových pixelech a násobí se měřítkem `s`.
import { FONT_TEXT } from './fonts.js';

export const COUNTER = { W: 40, H: 25, BAR: 3.2, GAP: 1.2 };

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** Měřítko žetonů podle přiblížení mapy (v dálce menší, zblízka největší). */
export const counterScale = (zoom) => clamp(0.72 + 0.2 * Math.log2(Math.max(0.05, zoom)), 0.62, 1.15);

/** Rozměry žetonu při měřítku `s`: { w, h, total } (total = včetně ukazatelů pod žetonem). */
export function counterSize(s) {
  return { w: COUNTER.W * s, h: COUNTER.H * s, total: (COUNTER.H + COUNTER.GAP + 2 * COUNTER.BAR + COUNTER.GAP) * s };
}

/** Barvy žetonu pro hex barvu země: výplň (ztmavená), okraj a barva značky podle jasu. */
export function counterLook(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const k = 0.62;                                              // ztmavení, aby bílá značka byla čitelná i na světlých zemích
  const fr = Math.round(r * k), fg = Math.round(g * k), fb = Math.round(b * k);
  const lum = (0.2126 * fr + 0.7152 * fg + 0.0722 * fb) / 255;
  return { fill: `rgb(${fr},${fg},${fb})`, top: `rgb(${Math.min(255, Math.round(fr * 1.25 + 10))},${Math.min(255, Math.round(fg * 1.25 + 10))},${Math.min(255, Math.round(fb * 1.25 + 10))})`, sym: lum > 0.5 ? '#12161b' : '#f6f2e4' };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Značka druhu jednotky (NATO styl) uvnitř těla žetonu (x0, y0, w, h): kříž (pěchota), šikmá čára (jízda), elipsa (tanky), kříž s osou (motorizovaná) … */
export function drawSymbol(ctx, cls, x0, y0, w, h, s, color) {
  const i = 1.6 * s;
  const l = x0 + i, r = x0 + w - i, t = y0 + i, b = y0 + h - i, cx = x0 + w / 2, cy = y0 + h / 2;
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, 1.5 * s); ctx.lineJoin = 'miter'; ctx.lineCap = 'butt';
  ctx.beginPath();
  switch (cls) {
    case 'cav': ctx.moveTo(l, b); ctx.lineTo(r, t); break;
    case 'arm': ctx.moveTo(cx + w * 0.3, cy); ctx.ellipse(cx, cy, w * 0.3, h * 0.27, 0, 0, Math.PI * 2); break;
    case 'mot': ctx.moveTo(l, t); ctx.lineTo(r, b); ctx.moveTo(l, b); ctx.lineTo(r, t); ctx.moveTo(cx, t); ctx.lineTo(cx, b); break;
    case 'mtn': ctx.moveTo(l, t); ctx.lineTo(r, b); ctx.moveTo(l, b); ctx.lineTo(r, t); ctx.moveTo(cx - w * 0.16, b); ctx.lineTo(cx, b - h * 0.34); ctx.lineTo(cx + w * 0.16, b); break;
    default: ctx.moveTo(l, t); ctx.lineTo(r, b); ctx.moveTo(l, b); ctx.lineTo(r, t);
  }
  ctx.stroke();
  ctx.restore();
}

const hpColor = (v) => (v > 0.5 ? '#9bd36c' : v > 0.25 ? '#e3b13f' : '#e0553a');

/** Dva ukazatele pod žetonem: síla (zelená → žlutá → červená) a organizace (modrá). */
export function drawBars(ctx, x, y, w, s, hp, org) {
  const bh = COUNTER.BAR * s;
  ctx.fillStyle = 'rgba(6,10,14,0.82)';
  ctx.fillRect(x - 0.5, y - 0.5, w + 1, 2 * bh + COUNTER.GAP * s + 1);
  ctx.fillStyle = hpColor(hp);
  ctx.fillRect(x, y, Math.max(0, w * clamp(hp, 0, 1)), bh);
  ctx.fillStyle = '#5fb0ea';
  ctx.fillRect(x, y + bh + COUNTER.GAP * s, Math.max(0, w * clamp(org, 0, 1)), bh);
}

/** Kulatý odznak se symbolem (bojuje / nedostatek zásob / ústup). */
function badge(ctx, kind, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = 1;
  if (kind === 'fight') {
    ctx.fillStyle = '#d9402a'; ctx.strokeStyle = '#2a0b07';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#fff4e8'; ctx.lineWidth = Math.max(1, r * 0.28);
    const q = r * 0.5;
    ctx.beginPath(); ctx.moveTo(-q, -q); ctx.lineTo(q, q); ctx.moveTo(-q, q); ctx.lineTo(q, -q); ctx.stroke();
  } else if (kind === 'lack') {
    ctx.fillStyle = '#f0a62a'; ctx.strokeStyle = '#2d1c04';
    ctx.beginPath(); ctx.moveTo(0, -r * 1.1); ctx.lineTo(r * 1.05, r * 0.85); ctx.lineTo(-r * 1.05, r * 0.85); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2d1c04';
    ctx.fillRect(-r * 0.12, -r * 0.45, r * 0.24, r * 0.6);
    ctx.fillRect(-r * 0.12, r * 0.3, r * 0.24, r * 0.26);
  } else if (kind === 'retreat') {
    ctx.fillStyle = '#8b97a3'; ctx.strokeStyle = '#161b20';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#10151a'; ctx.lineWidth = Math.max(1, r * 0.3);
    ctx.beginPath(); ctx.moveTo(r * 0.45, 0); ctx.lineTo(-r * 0.45, 0); ctx.moveTo(-r * 0.05, -r * 0.4); ctx.lineTo(-r * 0.5, 0); ctx.lineTo(-r * 0.05, r * 0.4); ctx.stroke();
  }
  ctx.restore();
}

/** Počet divizí v žetonu (tmavá tabulka v pravém horním rohu). */
function countPill(ctx, n, x, y, s) {
  const text = String(n);
  const h = 11.5 * s, w = (text.length * 6.2 + 5.5) * s;
  ctx.fillStyle = 'rgba(8,12,16,0.95)';
  roundRect(ctx, x - w, y, w, h, 3 * s); ctx.fill();
  ctx.strokeStyle = 'rgba(240,217,142,0.8)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#fff6dc'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${(10.5 * s).toFixed(1)}px ${FONT_TEXT}`;
  ctx.fillText(text, x - w / 2, y + h / 2 + 0.5);
}

/**
 * Nakreslí jeden žeton se středem (x, y).
 * @param c       { cls, n, hp, org, fight, lack, retreat }  (hp a org jako podíl 0–1)
 * @param look    { fill, top, sym } z counterLook
 * @param opts    { s, rel: 'own'|'enemy'|'other', sel: 0|1|2 (0 nic, 1 část, 2 celý), hover }
 */
export function drawCounter(ctx, c, x, y, look, opts) {
  const { s, rel, sel, hover } = opts;
  const w = COUNTER.W * s, h = COUNTER.H * s;
  const x0 = Math.round(x - w / 2), y0 = Math.round(y - h / 2);
  // stín
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  roundRect(ctx, x0 + 1.5, y0 + 2, w, h + (2 * COUNTER.BAR + COUNTER.GAP + 1.5) * s, 3.5 * s); ctx.fill();
  // tělo žetonu: svislý přechod
  const grad = ctx.createLinearGradient(0, y0, 0, y0 + h);
  grad.addColorStop(0, look.top); grad.addColorStop(1, look.fill);
  ctx.fillStyle = grad;
  roundRect(ctx, x0, y0, w, h, 3 * s); ctx.fill();
  // okraj podle vztahu k hráči
  ctx.lineJoin = 'round';
  if (sel) {
    ctx.save();
    ctx.shadowColor = 'rgba(255,207,77,0.9)'; ctx.shadowBlur = 9;
    ctx.strokeStyle = '#ffcf4d'; ctx.lineWidth = sel === 2 ? 2.6 : 1.6;
    roundRect(ctx, x0, y0, w, h, 3 * s); ctx.stroke();
    ctx.restore();
  } else if (hover) {
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    roundRect(ctx, x0, y0, w, h, 3 * s); ctx.stroke();
  } else {
    ctx.strokeStyle = rel === 'enemy' ? '#e0553a' : rel === 'own' ? '#e9d9a4' : '#0b0f14';
    ctx.lineWidth = rel === 'enemy' ? 1.9 : 1.3;
    roundRect(ctx, x0, y0, w, h, 3 * s); ctx.stroke();
  }
  drawSymbol(ctx, c.cls, x0, y0, w, h, s, look.sym);
  drawBars(ctx, x0, y0 + h + COUNTER.GAP * s, w, s, c.hp, c.org);
  if (c.n > 1) countPill(ctx, c.n, x0 + w + 4 * s, y0 - 5.5 * s, s);
  // odznaky stavu v levém horním rohu
  const r = 5.2 * Math.max(0.85, s);
  let bx = x0 + 1, by = y0 - 1;
  if (c.fight) { badge(ctx, 'fight', bx, by, r); bx += r * 2 + 1; }
  if (c.lack) { badge(ctx, 'lack', bx, by, r); bx += r * 2 + 1; }
  if (c.retreat && !c.fight) badge(ctx, 'retreat', bx, by, r);
}

/** Šipka na konci čáry: hrot v bodě (x, y) ve směru (dx, dy). */
export function arrowHead(ctx, x, y, dx, dy, size) {
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - ux * size - uy * size * 0.55, y - uy * size + ux * size * 0.55);
  ctx.lineTo(x - ux * size + uy * size * 0.55, y - uy * size - ux * size * 0.55);
  ctx.closePath();
}
