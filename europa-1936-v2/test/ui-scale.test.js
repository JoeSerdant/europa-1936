// UI – responzivní měřítko rozhraní podle okna počítače (ui/scale.js).
import { describe, it, expect, beforeEach } from 'vitest';
import { autoScale, scaleFor, breakClasses, uiScalePref, setUiScalePref, UI_SCALE_OPTS } from '../src/ui/scale.js';

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
beforeEach(() => { globalThis.localStorage = mem(); });

describe('měřítko rozhraní', () => {
  it('do 1920×1080 je 1, na větších monitorech roste, v malých oknech se zmenší', () => {
    expect(autoScale(1366, 768)).toBe(1);
    expect(autoScale(1920, 1080)).toBe(1);
    expect(autoScale(1280, 720)).toBe(1);
    expect(autoScale(2560, 1440)).toBeCloseTo(4 / 3, 6);
    expect(autoScale(3840, 2160)).toBe(2);
    expect(autoScale(3440, 1440)).toBeCloseTo(4 / 3, 6);   // ultraširoký: rozhoduje výška
    expect(autoScale(1024, 600)).toBeCloseTo(0.8, 6);
    expect(autoScale(640, 360)).toBe(0.75);
  });
  it('ruční volba násobí automatické měřítko; neplatná volba se ignoruje', () => {
    expect(uiScalePref()).toBe('auto');
    expect(scaleFor(1920, 1080, '1.3')).toBe(1.3);
    expect(scaleFor(2560, 1440, '1.5')).toBe(2);
    setUiScalePref('1.15');
    expect(uiScalePref()).toBe('1.15');
    setUiScalePref('7');
    expect(uiScalePref()).toBe('1.15');
    expect(UI_SCALE_OPTS[0][0]).toBe('auto');
  });
  it('breakpointy podle šířky a výšky rozhraní po zvětšení', () => {
    expect(breakClasses(1920, 1080)).toEqual(['uw-2199']);
    expect(breakClasses(1366, 768)).toEqual(['uw-1400', 'uw-1499', 'uw-1500', 'uw-1599', 'uw-2199', 'uh-800', 'uh-820']);
    expect(breakClasses(2400, 1300)).toEqual([]);
  });
});
