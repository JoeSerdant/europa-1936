// Kamera mapy: střed ve světových pixelech (x, y) a přiblížení (obrazovkových pixelů na světový pixel). Čistá matematika, bez DOM.

export const MAX_ZOOM = 12;

export function createCamera(mapW, mapH) {
  return { mapW, mapH, w: 1280, h: 720, x: mapW / 2, y: mapH / 2, zoom: 0.5 };
}

/** Přiblížení, při kterém je vidět celá mapa. */
export const fitZoom = (cam) => Math.min(cam.w / cam.mapW, cam.h / cam.mapH);
export const minZoom = (cam) => fitZoom(cam) * 0.92;

export function resizeCamera(cam, w, h) {
  const first = cam.w === 1280 && cam.h === 720 && cam.zoom === 0.5;
  cam.w = Math.max(1, w); cam.h = Math.max(1, h);
  if (first) cam.zoom = fitZoom(cam);
  clampCamera(cam);
  return cam;
}

export function clampCamera(cam) {
  cam.zoom = Math.max(minZoom(cam), Math.min(MAX_ZOOM, cam.zoom));
  const hw = cam.w / cam.zoom / 2, hh = cam.h / cam.zoom / 2;
  const keep = 0.75;     // střed smí od okraje mapy ustoupit tak, že čtvrtina výřezu je mimo mapu
  cam.x = hw * 2 >= cam.mapW ? cam.mapW / 2 : Math.max(hw * keep, Math.min(cam.mapW - hw * keep, cam.x));
  cam.y = hh * 2 >= cam.mapH ? cam.mapH / 2 : Math.max(hh * keep, Math.min(cam.mapH - hh * keep, cam.y));
  return cam;
}

export const screenToWorld = (cam, sx, sy) => [(sx - cam.w / 2) / cam.zoom + cam.x, (sy - cam.h / 2) / cam.zoom + cam.y];
export const worldToScreen = (cam, wx, wy) => [(wx - cam.x) * cam.zoom + cam.w / 2, (wy - cam.y) * cam.zoom + cam.h / 2];

/** Viditelný výřez světa [x0, y0, x1, y1]. */
export function viewRect(cam) {
  const hw = cam.w / cam.zoom / 2, hh = cam.h / cam.zoom / 2;
  return [cam.x - hw, cam.y - hh, cam.x + hw, cam.y + hh];
}

/** Přiblíží o `factor` tak, aby bod pod kurzorem (sx, sy) zůstal na místě. */
export function zoomAt(cam, sx, sy, factor) {
  const [wx, wy] = screenToWorld(cam, sx, sy);
  cam.zoom *= factor;
  cam.zoom = Math.max(minZoom(cam), Math.min(MAX_ZOOM, cam.zoom));
  cam.x = wx - (sx - cam.w / 2) / cam.zoom;
  cam.y = wy - (sy - cam.h / 2) / cam.zoom;
  return clampCamera(cam);
}

export function panBy(cam, dxScreen, dyScreen) {
  cam.x -= dxScreen / cam.zoom;
  cam.y -= dyScreen / cam.zoom;
  return clampCamera(cam);
}

/** Nastaví kameru tak, aby se do okna vešel obdélník světa [x0,y0,x1,y1] s okrajem `pad` (podíl). */
export function fitRect(cam, [x0, y0, x1, y1], pad = 0.1) {
  const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
  cam.zoom = Math.min(cam.w / (w * (1 + pad * 2)), cam.h / (h * (1 + pad * 2)));
  cam.x = (x0 + x1) / 2; cam.y = (y0 + y1) / 2;
  return clampCamera(cam);
}

/** Plynulý přesun mezi dvěma pohledy: t ∈ [0,1] (easeInOut). Zoom se interpoluje geometricky. */
export function lerpView(a, b, t) {
  const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, zoom: a.zoom * Math.pow(b.zoom / a.zoom, e) };
}
