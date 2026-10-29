// Řadič mapy: vlastní kameru a vykreslovač, běží ve smyčce requestAnimationFrame a vykresluje jen když se něco změnilo.
// React komponenty ho jen ovládají (kamera, výběr, režim) – kreslení samo je mimo React.
import { getWorld } from '../../engine/world.js';
import { buildGeometry } from './geometry.js';
import { MapRenderer, FONT_DISPLAY, FONT_TEXT } from './renderer.js';
import {
  createCamera, resizeCamera, zoomAt, panBy, screenToWorld, clampCamera, lerpView, fitZoom, MAX_ZOOM,
} from './camera.js';

const CZ_SAMPLE = 'ěščřžýáíéúůňťďĚŠČŘŽÝÁÍÉÚŮŇŤĎ';

export class MapController {
  constructor() {
    this.world = getWorld();
    this.geo = null;
    this.cam = createCamera(this.world.frame.w, this.world.frame.h);
    this.renderer = null;
    this.canvas = null;
    this.anim = null;
    this.dirty = true;
    this.raf = 0;
    this.listeners = new Set();
    this.dpr = 1;
    this.drift = null;
    this.pending = null;
    this.insets = { l: 0, r: 0, t: 0, b: 0 };     // plochy zakryté panely (v CSS pixelech) – pohledy se středí do zbytku
  }

  // ---------------------------------------------------------------- životní cyklus
  attach(canvas) {
    this.canvas = canvas;
    if (!this.geo) this.geo = buildGeometry(this.world);
    this.renderer = new MapRenderer(canvas, this.world, this.geo);
    if (this.pending) this.applyPending();
    this.dirty = true;
    const frame = (t) => {
      this.raf = requestAnimationFrame(frame);
      this.step(t);
    };
    this.raf = requestAnimationFrame(frame);
    // písma se načítají líně; popisky v plátně se po načtení přemalují
    if (typeof document !== 'undefined' && document.fonts && document.fonts.load) {
      const wanted = [`600 20px ${FONT_DISPLAY}`, `500 20px ${FONT_DISPLAY}`, `500 14px ${FONT_TEXT}`, `600 14px ${FONT_TEXT}`];
      Promise.all(wanted.map((f) => document.fonts.load(f, `Aa${CZ_SAMPLE}`))).catch(() => {}).then(() => {
        if (this.renderer) this.renderer.fontsChanged();
        this.dirty = true;
      });
    }
    return () => { cancelAnimationFrame(this.raf); this.renderer = null; this.canvas = null; };
  }

  applyPending() {
    const p = this.pending;
    this.pending = null;
    if (p.game) this.renderer.setGame(p.game);
    if (p.mode) this.renderer.setMode(p.mode);
    if (p.focus !== undefined) this.renderer.setFocus(p.focus);
    if (p.units !== undefined) this.renderer.setUnitsVisible(p.units);
    this.renderer.selected = p.selected || 0;
  }

  resize(cssW, cssH, dpr = 1) {
    this.dpr = Math.min(2, dpr);
    resizeCamera(this.cam, cssW, cssH);
    this.dirty = true;
    this.emit();
  }

  onChange(cb) { this.listeners.add(cb); return () => this.listeners.delete(cb); }
  emit() { for (const l of this.listeners) l(this.cam); }

  step(t) {
    if (this.anim) {
      const a = this.anim;
      const k = Math.min(1, (t - a.t0) / a.ms);
      const v = lerpView(a.from, a.to, k);
      this.cam.x = v.x; this.cam.y = v.y; this.cam.zoom = v.zoom;
      clampCamera(this.cam);
      this.dirty = true;
      if (k >= 1) { const done = a.done; this.anim = null; if (done) done(); }
      this.emit();
    }
    if (this.drift) this.stepDrift(t);
    if (this.dirty && this.renderer) {
      this.dirty = false;
      this.renderer.draw(this.cam, this.dpr);
      if (this.renderer.pending) this.dirty = true;       // dlaždice, které se do rozpočtu snímku nevešly, se dokreslí v dalších
    }
  }

  requestDraw() { this.dirty = true; }

  // ---------------------------------------------------------------- stav vykreslování
  setGame(game) {
    if (!this.renderer) { this.pending = { ...(this.pending || {}), game }; return; }
    const prev = this.renderer.game;
    this.renderer.setGame(game);
    // běžný postup času nic nemění na vzhledu mapy – překreslujeme jen při změně vlastníků, kontroly, jednotek nebo bitev
    if (!prev || prev.stateOwner !== game.stateOwner || prev.ctrl !== game.ctrl) this.dirty = true;
    else if (this.renderer.showUnits && (prev.mil.divs !== game.mil.divs || prev.mil.battles !== game.mil.battles || prev.mil.wars !== game.mil.wars || prev.nav.fleets !== game.nav.fleets || prev.air.wings !== game.air.wings)) this.dirty = true;
  }

  // ---------------------------------------------------------------- jednotky (armáda)
  /** Zapne/vypne vrstvu jednotek (žetony, fronta, šipky) – jen na obrazovce hry. */
  setUnitsVisible(on) {
    if (!this.renderer) { this.pending = { ...(this.pending || {}), units: on }; return; }
    this.renderer.setUnitsVisible(on);
    this.dirty = true;
  }
  setSelection(ids) {
    if (!this.renderer) return;
    this.renderer.units.setSelection(ids); this.dirty = true;
  }
  setHoverUnits(ids) {
    if (!this.renderer) return;
    this.renderer.units.hoverIds = ids; this.dirty = true;
  }
  /** Plán armády k zobrazení: { area, line, to } (seznamy provincií) nebo null. */
  setPlanView(view) {
    if (!this.renderer) return;
    this.renderer.planView = view; this.dirty = true;
  }
  /** Náhled trasy pod kurzorem: { nodes, attack } nebo null. */
  setRoute(route) {
    if (!this.renderer) return;
    this.renderer.route = route; this.dirty = true;
  }
  setFleetSel(id) {
    if (!this.renderer) return;
    this.renderer.units.setFleetSel(id); this.dirty = true;
  }
  /** Žeton flotily pod bodem obrazovky nebo null. */
  pickFleet(sx, sy) { return this.renderer && this.renderer.showUnits ? this.renderer.units.pickFleet(sx, sy) : null; }
  /** Žeton pod bodem obrazovky (po posledním snímku) nebo null. */
  pickCounter(sx, sy) { return this.renderer && this.renderer.showUnits ? this.renderer.units.pick(sx, sy) : null; }
  /** Divize ze žetonů v obdélníku obrazovky. */
  boxIds(x0, y0, x1, y1, ownOnly = true) { return this.renderer && this.renderer.showUnits ? this.renderer.units.inBox(x0, y0, x1, y1, ownOnly) : []; }
  setMode(mode) {
    if (!this.renderer) { this.pending = { ...(this.pending || {}), mode }; return; }
    this.renderer.setMode(mode);
    this.dirty = true;
  }
  setFocus(idx) {
    if (!this.renderer) { this.pending = { ...(this.pending || {}), focus: idx }; return; }
    this.renderer.setFocus(idx);
    this.dirty = true;
  }
  setSelected(l) {
    if (!this.renderer) { this.pending = { ...(this.pending || {}), selected: l }; return; }
    if (this.renderer.selected === l) return;
    this.renderer.selected = l; this.dirty = true;
  }
  setHover(l) {
    if (!this.renderer || this.renderer.hover === l) return;
    this.renderer.hover = l; this.dirty = true;
  }
  setOptions(o) {
    if (!this.renderer) return;
    Object.assign(this.renderer.options, o); this.dirty = true;
  }
  setInsets(i) { this.insets = { l: 0, r: 0, t: 0, b: 0, ...i }; }

  // ---------------------------------------------------------------- ovládání kamery
  cancelAnim() { this.anim = null; }
  pan(dx, dy) { this.cancelAnim(); panBy(this.cam, dx, dy); this.dirty = true; this.emit(); }
  zoom(sx, sy, factor) { this.cancelAnim(); zoomAt(this.cam, sx, sy, factor); this.dirty = true; this.emit(); }
  /** Přesune střed kamery na světový bod (minimapa). */
  centerOn(wx, wy) { this.cancelAnim(); this.cam.x = wx; this.cam.y = wy; clampCamera(this.cam); this.dirty = true; this.emit(); }
  screenToWorld(sx, sy) { return screenToWorld(this.cam, sx, sy); }
  pick(sx, sy) { const [x, y] = this.screenToWorld(sx, sy); return this.geo ? this.geo.pick(x, y) : 0; }

  /** Plynulý přesun na pohled { x, y, zoom } za `ms` milisekund. */
  flyTo(view, ms = 700, done) {
    this.drift = null;
    const to = { x: view.x, y: view.y, zoom: Math.max(0.05, Math.min(MAX_ZOOM, view.zoom)) };
    if (ms <= 0) { Object.assign(this.cam, to); clampCamera(this.cam); this.dirty = true; this.emit(); if (done) done(); return; }
    this.anim = { from: { x: this.cam.x, y: this.cam.y, zoom: this.cam.zoom }, to, t0: performance.now(), ms, done };
  }

  /** Pohled, ve kterém se obdélník světa `box` vejde do volné plochy (okno bez panelů). */
  viewForBox(box, pad = 0.12, maxZoom = MAX_ZOOM) {
    const { l, r, t, b } = this.insets;
    const vw = Math.max(120, this.cam.w - l - r), vh = Math.max(120, this.cam.h - t - b);
    const bw = Math.max(1, box[2] - box[0]), bh = Math.max(1, box[3] - box[1]);
    let zoom = Math.min(vw / (bw * (1 + pad * 2)), vh / (bh * (1 + pad * 2)));
    zoom = Math.max(fitZoom(this.cam) * 0.92, Math.min(maxZoom, zoom));
    const cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2;
    return { x: cx - (l - r) / 2 / zoom, y: cy - (t - b) / 2 / zoom, zoom };
  }

  /** Obálka štítku (provincie/moře) v pixelech světa. */
  labelBox(l) {
    const w = this.world;
    const o = l <= w.L ? w.land[l] : w.sea[l - w.L];
    return o.b;
  }

  flyToLabel(l, ms = 700, maxZoom = 3.2) {
    const b = this.labelBox(l);
    const v = this.viewForBox(b, 1.2, maxZoom);
    // nikdy neoddalovat, když je kamera už blíž
    this.flyTo({ ...v, zoom: Math.max(v.zoom, Math.min(this.cam.zoom, maxZoom)) }, ms);
  }

  /** Obálka největší souvislé části země (z popisku), jinak všech jejích provincií. */
  countryBox(tag) {
    const w = this.world;
    const idx = w.ownerIdx[tag];
    const lab = this.renderer ? this.renderer.countryLabels.find((c) => c.tag === tag) : null;
    if (lab) return [lab.x - lab.w / 2, lab.y - lab.h / 2, lab.x + lab.w / 2, lab.y + lab.h / 2];
    const owner = this.renderer && this.renderer.game ? this.renderer.game.stateOwner : null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let p = 1; p <= w.L; p++) {
      const o = owner ? owner[w.provState[p]] : w.provOwner0[p];
      if (o !== idx) continue;
      const b = w.land[p].b;
      if (b[0] < x0) x0 = b[0]; if (b[1] < y0) y0 = b[1]; if (b[2] > x1) x1 = b[2]; if (b[3] > y1) y1 = b[3];
    }
    return [x0, y0, x1, y1];
  }

  flyToCountry(tag, ms = 900, pad = 0.35, maxZoom = 2.2) {
    this.flyTo(this.viewForBox(this.countryBox(tag), pad, maxZoom), ms);
  }

  fitAll(ms = 0) {
    this.flyTo(this.viewForBox([0, 0, this.world.frame.w, this.world.frame.h], 0, 1), ms);
  }

  /** Pohled na Evropu (výchozí pohled). */
  viewEurope(ms = 0) {
    this.flyTo(this.viewForBox([380, 380, 2150, 1500], 0.02, 1.2), ms);
  }

  // ---------------------------------------------------------------- pomalé „dýchání“ kamery v menu
  startDrift(views, periodMs = 70000) {
    this.cancelAnim();
    this.drift = { views, periodMs, t0: performance.now() };
  }
  stopDrift() { this.drift = null; }
  stepDrift(t) {
    const d = this.drift;
    const k = ((t - d.t0) % d.periodMs) / d.periodMs;
    const u = 0.5 - 0.5 * Math.cos(k * Math.PI * 2);
    const v = lerpView(d.views[0], d.views[1], u);
    this.cam.x = v.x; this.cam.y = v.y; this.cam.zoom = v.zoom;
    clampCamera(this.cam);
    this.dirty = true;
    this.emit();
  }
}

export const mapController = new MapController();
