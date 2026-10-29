// Letectvo na mapě (M30): čisté údaje o misích hráče (čáry z letiště do cíle) a o letištích (odznaky s počtem letadel) a kreslení odznaku.
import { FONT_TEXT } from './fonts.js';

const centerOf = (world, s) => world.land[world.states[s].cap].c;
export const MISSION_COLOR = { air: '#7fd0ff', cas: '#ffd25a', bomb: '#ff6a47' };

/** Mise a letiště hráče: { lines: [{ m, a, b, n }], bases: [{ x, y, n }] }; cizí letectvo se nezobrazuje (mlha války). */
export function buildAirMarks(game, world) {
  const me = game.player ? world.ownerIdx[game.player] : 0;
  const lines = [], baseN = new Map();
  if (!me || !game.air) return { lines, bases: [] };
  for (const wg of game.air.wings) {
    if (!wg || wg.o !== me) continue;
    baseN.set(wg.s, (baseN.get(wg.s) || 0) + wg.n);
    if (wg.m) lines.push({ m: wg.m, a: centerOf(world, wg.s), b: centerOf(world, wg.to), n: wg.n });
  }
  const bases = [...baseN].sort((x, y) => x[0] - y[0]).map(([s, n]) => { const c = centerOf(world, s); return { x: c[0], y: c[1], n }; });
  return { lines, bases };
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

/** Odznak letiště se středem (x, y): silueta letadla a počet letadel. */
export function drawAirBadge(ctx, b, x, y, s) {
  const w = 38 * s, h = 18 * s, x0 = Math.round(x - w / 2), y0 = Math.round(y - h / 2);
  ctx.fillStyle = 'rgba(8,14,20,0.9)';
  roundRect(ctx, x0, y0, w, h, 9 * s); ctx.fill();
  ctx.strokeStyle = '#7fd0ff'; ctx.lineWidth = 1.3;
  roundRect(ctx, x0, y0, w, h, 9 * s); ctx.stroke();
  const cx = x0 + 10 * s, cy = y0 + h / 2, u = s;
  ctx.fillStyle = '#e9d9a4';
  ctx.beginPath();
  ctx.moveTo(cx + 6 * u, cy); ctx.lineTo(cx + 1 * u, cy - 1.2 * u); ctx.lineTo(cx - 2 * u, cy - 6 * u); ctx.lineTo(cx - 3.4 * u, cy - 6 * u); ctx.lineTo(cx - 2 * u, cy - 1 * u);
  ctx.lineTo(cx - 5 * u, cy - 0.6 * u); ctx.lineTo(cx - 6 * u, cy - 2.4 * u); ctx.lineTo(cx - 7 * u, cy - 2.4 * u); ctx.lineTo(cx - 6.6 * u, cy);
  ctx.lineTo(cx - 7 * u, cy + 2.4 * u); ctx.lineTo(cx - 6 * u, cy + 2.4 * u); ctx.lineTo(cx - 5 * u, cy + 0.6 * u); ctx.lineTo(cx - 2 * u, cy + 1 * u);
  ctx.lineTo(cx - 3.4 * u, cy + 6 * u); ctx.lineTo(cx - 2 * u, cy + 6 * u); ctx.lineTo(cx + 1 * u, cy + 1.2 * u); ctx.closePath(); ctx.fill();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${(10.5 * s).toFixed(1)}px ${FONT_TEXT}`;
  ctx.fillStyle = '#e9d9a4';
  ctx.fillText(String(b.n), x0 + w * 0.68, y0 + h / 2 + 0.5);
}
