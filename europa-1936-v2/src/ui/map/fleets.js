// Flotily na mapě (M27): čistá data žetonů a cest (bez plátna) a kreslení námořního žetonu. Žetony stojí ve středu mořské oblasti.
import { FONT_TEXT } from './fonts.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const FLEET = { W: 38, H: 20 };

const hpOf = (f) => { let hp = 0; for (const k in f.ships) hp += f.ships[k] * ({ dd: 10, ca: 30, bb: 90, ss: 6, tr: 8 }[k] || 0); return hp; };

/** Žetony flotil: jedna skupina na dvojici (oblast, země): { key, x, y, o, n, ids, moving, hp } (hp = podíl síly vůči maximu, 0–1). */
export function buildFleetTokens(game, world) {
  const groups = new Map();
  const fleets = game.nav.fleets;
  for (let i = 1; i < fleets.length; i++) {
    const f = fleets[i];
    if (!f) continue;
    const key = `${f.p}:${f.o}`;
    let g = groups.get(key);
    if (!g) {
      const c = world.sea[f.p - world.L].c;
      g = { key, x: c[0], y: c[1], o: f.o, p: f.p, n: 0, ids: [], moving: false, hp: 0, mx: 0 };
      groups.set(key, g);
    }
    g.ids.push(i);
    g.n += Object.values(f.ships).reduce((a, b) => a + b, 0);
    g.moving = g.moving || f.path.length > 0;
    g.hp += hpOf(f); g.mx += f.mx;
  }
  const out = [];
  for (const g of groups.values()) out.push({ ...g, hp: g.mx ? clamp(g.hp / g.mx, 0, 1) : 1 });
  return out.sort((a, b) => a.p - b.p || a.o - b.o);
}

/** Cesty pohybujících se flotil: { o, ids, nodes: [[x, y]…] } od aktuální oblasti po cíl. */
export function buildFleetRoutes(game, world) {
  const out = [];
  const fleets = game.nav.fleets;
  for (let i = 1; i < fleets.length; i++) {
    const f = fleets[i];
    if (!f || !f.path.length) continue;
    const nodes = [f.p, ...f.path].map((l) => world.sea[l - world.L].c);
    out.push({ o: f.o, ids: [i], nodes });
  }
  return out;
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

/** Nakreslí žeton flotily se středem (x, y): tmavě modré tělo, silueta lodi, počet lodí, ukazatel síly. */
export function drawFleetToken(ctx, t, x, y, look, opts) {
  const { s, rel, sel, hover } = opts;
  const w = FLEET.W * s, h = FLEET.H * s;
  const x0 = Math.round(x - w / 2), y0 = Math.round(y - h / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  roundRect(ctx, x0 + 1.5, y0 + 2, w, h + 5 * s, 4 * s); ctx.fill();
  const grad = ctx.createLinearGradient(0, y0, 0, y0 + h);
  grad.addColorStop(0, look.top); grad.addColorStop(1, look.fill);
  ctx.fillStyle = grad;
  roundRect(ctx, x0, y0, w, h, 4 * s); ctx.fill();
  ctx.lineJoin = 'round';
  if (sel) {
    ctx.save(); ctx.shadowColor = 'rgba(255,207,77,0.9)'; ctx.shadowBlur = 9;
    ctx.strokeStyle = '#ffcf4d'; ctx.lineWidth = 2.4; roundRect(ctx, x0, y0, w, h, 4 * s); ctx.stroke(); ctx.restore();
  } else {
    ctx.strokeStyle = hover ? '#ffffff' : rel === 'enemy' ? '#e0553a' : rel === 'own' ? '#e9d9a4' : '#0b0f14';
    ctx.lineWidth = rel === 'enemy' ? 1.9 : 1.3;
    roundRect(ctx, x0, y0, w, h, 4 * s); ctx.stroke();
  }
  // silueta lodi: trup, nástavba a komín
  const cx = x0 + w * 0.36, cy = y0 + h * 0.58, u = s;
  ctx.fillStyle = look.sym;
  ctx.beginPath();
  ctx.moveTo(cx - 11 * u, cy - 2 * u); ctx.lineTo(cx + 12 * u, cy - 2 * u); ctx.lineTo(cx + 8 * u, cy + 4 * u); ctx.lineTo(cx - 8 * u, cy + 4 * u); ctx.closePath(); ctx.fill();
  ctx.fillRect(cx - 4 * u, cy - 6 * u, 8 * u, 4 * u);
  ctx.fillRect(cx - 1 * u, cy - 9 * u, 2.4 * u, 3.4 * u);
  // počet lodí
  ctx.fillStyle = look.sym; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${(11 * s).toFixed(1)}px ${FONT_TEXT}`;
  ctx.fillText(String(t.n), x0 + w * 0.82, y0 + h * 0.5 + 0.5);
  // síla
  ctx.fillStyle = 'rgba(6,10,14,0.82)'; ctx.fillRect(x0 - 0.5, y0 + h + 1.2 * s - 0.5, w + 1, 3.4 * s + 1);
  ctx.fillStyle = t.hp > 0.5 ? '#9bd36c' : t.hp > 0.25 ? '#e3b13f' : '#e0553a';
  ctx.fillRect(x0, y0 + h + 1.2 * s, Math.max(0, w * t.hp), 3.4 * s);
  if (t.moving) {
    ctx.fillStyle = '#5fb0ea';
    ctx.beginPath(); ctx.moveTo(x0 + w + 3 * s, y0 + h * 0.5 - 4 * s); ctx.lineTo(x0 + w + 8 * s, y0 + h * 0.5); ctx.lineTo(x0 + w + 3 * s, y0 + h * 0.5 + 4 * s); ctx.closePath(); ctx.fill();
  }
}
