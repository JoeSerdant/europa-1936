import { useEffect, useRef } from 'react';
import { mapController as mc } from './controller.js';
import { gameStore, uiStore, setUi } from '../store.js';
import { connectArmyOverlay } from '../army/bridge.js';

const sameIds = (a, b) => (a === b) || (!!a && !!b && a.length === b.length && a.every((x, i) => x === b[i]));

/**
 * Plátno mapy. Ovládání: tažení = posun, kolečko = přiblížení, WASD/šipky = posun, Q/E (PageDown/PageUp) = přiblížení, Home = celá mapa.
 * S vrstvou jednotek (`units`): klik na žeton = výběr (Shift přidává, dvojklik = celá armáda), Shift + tažení = výběr obdélníkem, pravé tlačítko = rozkaz.
 * Kreslení řídí MapController mimo React; tady jen vazba na DOM (velikost, myš, klávesy) a na úložiště.
 * `interactive` = posun/zoom/výběr; `onPick(label, mods)` se volá při kliknutí na mapu, `onCounter(counter, mods)` na žeton,
 * `onFleet(žeton flotily, mods)` na námořní žeton, `onBox(ids, mods)` po výběru obdélníkem, `onContext(label)` při kliknutí pravým tlačítkem.
 */
export function MapView({ interactive = true, onPick, onCounter, onFleet, onBox, onContext, onBattle, units = false, cursor = 'grab' }) {
  const canvasRef = useRef(null);
  const hostRef = useRef(null);
  const boxRef = useRef(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const counterRef = useRef(onCounter);
  counterRef.current = onCounter;
  const fleetRef = useRef(onFleet);
  fleetRef.current = onFleet;
  const boxCbRef = useRef(onBox);
  boxCbRef.current = onBox;
  const battleRef = useRef(onBattle);
  battleRef.current = onBattle;
  const contextRef = useRef(onContext);
  contextRef.current = onContext;
  const interactiveRef = useRef(interactive);
  interactiveRef.current = interactive;
  const unitsRef = useRef(units);
  unitsRef.current = units;

  useEffect(() => { mc.setUnitsVisible(units); }, [units]);

  useEffect(() => {
    const canvas = canvasRef.current, host = hostRef.current, boxEl = boxRef.current;
    const detach = mc.attach(canvas);
    mc.setGame(gameStore.getState());
    mc.setMode(uiStore.getState().mode);
    mc.setSelected(uiStore.getState().selected);
    mc.setUnitsVisible(unitsRef.current);
    const focusOf = (u) => (u.screen === 'select' ? mc.world.ownerIdx[u.pickTag] || 0 : 0);
    mc.setFocus(focusOf(uiStore.getState()));
    const offOverlay = connectArmyOverlay();

    const measure = () => {
      const r = host.getBoundingClientRect();
      mc.resize(r.width, r.height, window.devicePixelRatio || 1);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    measure();

    const offGame = gameStore.subscribe(() => mc.setGame(gameStore.getState()));
    let last = uiStore.getState();
    const offUi = uiStore.subscribe(() => {
      const s = uiStore.getState();
      if (s.mode !== last.mode) mc.setMode(s.mode);
      if (s.selected !== last.selected) mc.setSelected(s.selected);
      if (s.hover !== last.hover) mc.setHover(s.hover);
      if (s.screen !== last.screen || s.pickTag !== last.pickTag) mc.setFocus(focusOf(s));
      last = s;
    });

    // ---- myš ----
    let drag = null;
    let lastPos = null;                                      // poslední poloha ukazatele nad mapou (CSS px); null = mimo mapu
    let lastClick = { t: 0, key: 0 };                         // pro rozpoznání dvojkliku na žeton
    const pos = (e) => { const r = host.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const hideBox = () => { boxEl.style.display = 'none'; };
    const showBox = (x0, y0, x1, y1) => {
      boxEl.style.display = 'block';
      boxEl.style.left = `${Math.min(x0, x1)}px`; boxEl.style.top = `${Math.min(y0, y1)}px`;
      boxEl.style.width = `${Math.abs(x1 - x0)}px`; boxEl.style.height = `${Math.abs(y1 - y0)}px`;
    };
    // zvýraznění pod kurzorem: provincie pod ním a (je-li nad ním žeton) divize ve žetonu
    const updateHover = (sx, sy) => {
      const c = unitsRef.current ? mc.pickCounter(sx, sy) : null;
      const ids = c ? c.ids : null;
      const u = uiStore.getState();
      const l = mc.pick(sx, sy);
      if (!sameIds(ids, u.hoverUnits) || l !== u.hover) setUi({ hoverUnits: ids, hover: l });
      host.style.cursor = c ? 'pointer' : (interactiveRef.current ? cursor : 'default');
    };
    const onDown = (e) => {
      if (!interactiveRef.current) return;
      host.setPointerCapture(e.pointerId);
      const [sx, sy] = pos(e);
      const box = e.button === 0 && e.shiftKey && unitsRef.current ? { x0: sx, y0: sy } : null;
      if (e.button === 1) e.preventDefault();
      drag = { x: e.clientX, y: e.clientY, moved: 0, button: e.button, box };
      if (!box) host.classList.add('dragging');
    };
    const onMove = (e) => {
      if (!interactiveRef.current) return;
      const [sx, sy] = pos(e);
      if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
        if (drag.box) { if (drag.moved > 5) showBox(drag.box.x0, drag.box.y0, sx, sy); return; }
        if (drag.moved > 5) {
          const u = uiStore.getState();
          if (u.hover || u.hoverUnits) setUi({ hover: 0, hoverUnits: null });   // při tažení se zvýraznění pod myší ruší
          mc.pan(dx, dy);
        }
        return;
      }
      lastPos = [sx, sy];
      updateHover(sx, sy);
    };
    const onUp = (e) => {
      if (!drag) return;
      const d = drag;
      drag = null;
      host.classList.remove('dragging');
      hideBox();
      try { host.releasePointerCapture(e.pointerId); } catch { /* už uvolněno */ }
      if (e.type === 'pointercancel') return;
      const [sx, sy] = pos(e);
      const click = d.moved <= 5;
      if (d.box && !click) {
        if (boxCbRef.current) boxCbRef.current(mc.boxIds(d.box.x0, d.box.y0, sx, sy), { shift: e.ctrlKey || e.metaKey });
        return;
      }
      if (!click) return;
      if (d.button === 0) {
        const c = unitsRef.current ? mc.pickCounter(sx, sy) : null;
        const ft = !c && unitsRef.current && fleetRef.current ? mc.pickFleet(sx, sy) : null;
        const bt = !c && !ft && unitsRef.current && battleRef.current ? mc.pickBattle(sx, sy) : 0;
        if (bt) {
          battleRef.current(bt);
        } else if (ft) {
          fleetRef.current(ft, { shift: e.shiftKey });
        } else if (c && counterRef.current) {
          const now = performance.now();
          const dbl = lastClick.key === c.key && now - lastClick.t < 380;
          lastClick = { t: dbl ? 0 : now, key: c.key };
          counterRef.current(c, { shift: e.shiftKey, dbl });
        } else {
          lastClick = { t: 0, key: 0 };
          if (pickRef.current) pickRef.current(mc.pick(sx, sy), { shift: e.shiftKey });
        }
      } else if (d.button === 2 && contextRef.current) {
        contextRef.current(mc.pick(sx, sy), { shift: e.shiftKey });
      }
    };
    const onLeave = () => {
      lastPos = null;
      const u = uiStore.getState();
      if (!drag && (u.hover || u.hoverUnits)) setUi({ hover: 0, hoverUnits: null });
    };
    // Když se kamera pohne pod nehybnou myší (klávesy, kolečko, přelet), zvýraznění se přepočítá; nejvýš jednou za snímek.
    let repick = 0;
    const offCam = mc.onChange(() => {
      if (repick || !lastPos || drag || !interactiveRef.current) return;
      repick = requestAnimationFrame(() => {
        repick = 0;
        if (!lastPos || drag) return;
        updateHover(lastPos[0], lastPos[1]);
      });
    });
    const onWheel = (e) => {
      if (!interactiveRef.current) return;
      e.preventDefault();
      const [sx, sy] = pos(e);
      mc.zoom(sx, sy, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016)));
    };
    const onContext = (e) => e.preventDefault();
    host.addEventListener('pointerdown', onDown);
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerup', onUp);
    host.addEventListener('pointercancel', onUp);
    host.addEventListener('pointerleave', onLeave);
    host.addEventListener('wheel', onWheel, { passive: false });
    host.addEventListener('contextmenu', onContext);

    // ---- klávesy: šipky / WASD posun, + − přiblížení ----
    const held = new Set();
    let raf = 0, lastT = 0;
    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(50, t - lastT); lastT = t;
      if (!held.size || !interactiveRef.current) return;
      const v = 0.9 * dt;
      let dx = 0, dy = 0;
      if (held.has('left')) dx += v; if (held.has('right')) dx -= v;
      if (held.has('up')) dy += v; if (held.has('down')) dy -= v;
      if (dx || dy) mc.pan(dx, dy);
    };
    // posun okrajem obrazovky (M59): kurzor v úzkém pásu u kraje mapy; vypnutelné v nabídce
    const EDGE = 4;
    const edgeLoop = (t) => {
      edgeRaf = requestAnimationFrame(edgeLoop);
      const dt = Math.min(50, t - edgeT); edgeT = t;
      if (!lastPos || drag || !interactiveRef.current || uiStore.getState().edgeScroll === false || uiStore.getState().screen !== 'game') return;
      const [x, y] = lastPos, w = host.clientWidth, h = host.clientHeight;
      const v = 0.7 * dt;
      const dx = x <= EDGE ? v : x >= w - EDGE ? -v : 0, dy = y >= h - EDGE ? -v : 0;
      if (dx || dy) mc.pan(dx, dy);
    };
    let edgeRaf = requestAnimationFrame(edgeLoop), edgeT = 0;
    host.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });
    raf = requestAnimationFrame(loop);
    const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    const ZOOM_IN = new Set(['PageUp']), ZOOM_OUT = new Set(['PageDown']);
    const isTyping = (e) => /^(input|textarea|select)$/i.test(e.target.tagName);
    const onKeyDown = (e) => {
      if (isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = KEYS[e.key] || KEYS[e.key.toLowerCase()];
      if (k) { held.add(k); e.preventDefault(); return; }
      if (!interactiveRef.current) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (ZOOM_IN.has(key)) { mc.zoom(mc.cam.w / 2, mc.cam.h / 2, 1.25); e.preventDefault(); }
      else if (ZOOM_OUT.has(key)) { mc.zoom(mc.cam.w / 2, mc.cam.h / 2, 1 / 1.25); e.preventDefault(); }
      else if (key === 'Home') { mc.fitAll(350); e.preventDefault(); }
    };
    const onKeyUp = (e) => { const k = KEYS[e.key] || KEYS[e.key.toLowerCase()]; if (k) held.delete(k); };
    const onBlur = () => held.clear();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(edgeRaf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      host.removeEventListener('pointerdown', onDown);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerup', onUp);
      host.removeEventListener('pointercancel', onUp);
      host.removeEventListener('pointerleave', onLeave);
      host.removeEventListener('wheel', onWheel);
      host.removeEventListener('contextmenu', onContext);
      cancelAnimationFrame(repick);
      offOverlay(); offGame(); offUi(); offCam(); ro.disconnect(); detach();
    };
  }, []);

  return (
    <div ref={hostRef} className="map-host" style={{ cursor: interactive ? cursor : 'default' }} data-testid="map">
      <canvas ref={canvasRef} className="map-canvas" />
      <div ref={boxRef} className="select-box" style={{ display: 'none' }} />
    </div>
  );
}
