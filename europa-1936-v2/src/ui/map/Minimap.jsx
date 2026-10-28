import { useEffect, useRef } from 'react';
import { mapController as mc } from './controller.js';
import { labelPath } from './geometry.js';
import { viewRect } from './camera.js';
import { SEA_COLOR, VOID_COLOR } from './colors.js';

const MW = 280;

/** Přehledová mapka s obdélníkem výřezu; kliknutí/tažení přesune kameru. */
export function Minimap() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const w = mc.world;
    const k = MW / w.frame.w;
    const MH = Math.round(w.frame.h * k);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = MW * dpr; canvas.height = MH * dpr;
    canvas.style.width = `${MW}px`; canvas.style.height = `${MH}px`;
    const ctx = canvas.getContext('2d');
    const base = document.createElement('canvas');
    base.width = canvas.width; base.height = canvas.height;
    let bakedFor = null, bakedMode = null;

    const bake = () => {
      const r = mc.renderer;
      if (!r || !mc.geo) return false;
      const b = base.getContext('2d');
      b.setTransform(1, 0, 0, 1, 0, 0);
      b.fillStyle = SEA_COLOR; b.fillRect(0, 0, base.width, base.height);
      b.setTransform(k * dpr, 0, 0, k * dpr, 0, 0);
      if (mc.geo.polys[0]) { b.fillStyle = VOID_COLOR; b.fill(labelPath(mc.geo, 0), 'evenodd'); }
      for (let p = 1; p <= w.L; p++) { if (!mc.geo.polys[p]) continue; b.fillStyle = r.fills[p]; b.fill(labelPath(mc.geo, p), 'evenodd'); }
      bakedFor = r.fills; bakedMode = r.mode;
      return true;
    };
    const draw = () => {
      const r = mc.renderer;
      if (!r) return;
      if (bakedFor !== r.fills || bakedMode !== r.mode) { if (!bake()) return; }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(base, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const [x0, y0, x1, y1] = viewRect(mc.cam);
      const rx = Math.max(0, x0) * k, ry = Math.max(0, y0) * k, rw = (Math.min(w.frame.w, x1) - Math.max(0, x0)) * k, rh = (Math.min(w.frame.h, y1) - Math.max(0, y0)) * k;
      ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = 1.5; ctx.strokeRect(rx + 0.5, ry + 0.5, rw, rh);
    };
    const off = mc.onChange(draw);
    const iv = setInterval(draw, 400);        // změny barev (režim, vlastníci) se projeví i bez pohybu kamery
    draw();

    let down = false;
    const move = (e) => {
      const r = canvas.getBoundingClientRect();
      const wx = ((e.clientX - r.left) / r.width) * w.frame.w, wy = ((e.clientY - r.top) / r.height) * w.frame.h;
      mc.centerOn(wx, wy);
    };
    const onDown = (e) => { down = true; canvas.setPointerCapture(e.pointerId); move(e); };
    const onMove = (e) => { if (down) move(e); };
    const onUp = () => { down = false; };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    return () => { off(); clearInterval(iv); canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp); };
  }, []);
  return <canvas ref={ref} className="minimap" aria-label="Přehledová mapa" data-testid="minimap" />;
}
