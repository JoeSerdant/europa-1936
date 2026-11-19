import { describe, it, expect, vi } from 'vitest';

describe('zvuky rozhraní', () => {
  it('bez Web Audio nic nehodí a volba se pamatuje', async () => {
    const store = {};
    vi.stubGlobal('localStorage', { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } });
    vi.resetModules();
    const s = await import('../src/ui/sound.js');
    expect(s.soundOn()).toBe(true);
    for (const name of Object.keys(s.SFX)) expect(() => s.play(name)).not.toThrow();
    expect(() => s.play('neexistuje')).not.toThrow();
    s.setSound(false);
    expect(s.soundOn()).toBe(false);
    expect(store['e1936.sound']).toBe('0');
    vi.resetModules();
    const again = await import('../src/ui/sound.js');
    expect(again.soundOn()).toBe(false);
    vi.unstubAllGlobals();
  });
  it('s falešným Web Audio přehraje tóny a respektuje vypnutí', async () => {
    const calls = [];
    class FakeCtx {
      constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
      createOscillator() { return { type: '', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start: () => calls.push('start'), stop() {} }; }
      createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
      resume() {}
    }
    vi.stubGlobal('localStorage', { getItem: () => null, setItem() {} });
    vi.stubGlobal('window', { AudioContext: FakeCtx });
    vi.resetModules();
    const s = await import('../src/ui/sound.js');
    s.play('click');
    s.play('alert');
    expect(calls.length).toBe(4);
    s.setSound(false);
    const n = calls.length;
    s.play('click');
    expect(calls.length).toBe(n);
    vi.unstubAllGlobals();
  });
  it('hlasitost efektů (F2 C2): 0–100 %, pamatuje se, 0 % je ticho', async () => {
    const store = {}, gains = [];
    class FakeCtx {
      constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
      createOscillator() { return { type: '', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
      createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime: (v) => gains.push(v) }, connect() {} }; }
      resume() {}
    }
    vi.stubGlobal('localStorage', { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } });
    vi.stubGlobal('window', { AudioContext: FakeCtx });
    vi.resetModules();
    const s = await import('../src/ui/sound.js');
    expect(s.soundVolume()).toBeCloseTo(0.8);
    s.play('click');
    const loud = Math.max(...gains);
    gains.length = 0;
    s.setVolume(0.4);
    expect(store['e1936.volume']).toBe('0.4');
    s.play('click');
    expect(Math.max(...gains)).toBeCloseTo(loud / 2, 6);
    gains.length = 0;
    s.setVolume(-3);
    expect(s.soundVolume()).toBe(0);
    s.play('click');
    expect(gains).toHaveLength(0);
    s.setVolume(7);
    expect(s.soundVolume()).toBe(1);
    vi.resetModules();
    store['e1936.volume'] = '0.25';
    const again = await import('../src/ui/sound.js');
    expect(again.soundVolume()).toBeCloseTo(0.25);
    vi.unstubAllGlobals();
  });
});
