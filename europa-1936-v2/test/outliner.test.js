// UI jako v HOI4: přehled vpravo (outliner) – čistá funkce `outlinerData`.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, startFocus, focusTree } from '../src/engine/index.js';
import { outlinerData } from '../src/ui/hud/outliner.js';

const W = getWorld();
const GER = W.ownerIdx.GER;

describe('přehled vpravo', () => {
  it('pozorovatel nemá nic; země má oddíly cíl, výzkum a armády s odkazy', () => {
    const s = createGame({ player: 'GER' });
    expect(outlinerData(s, 0)).toEqual([]);
    const d = outlinerData(s, GER);
    const ids = d.map((x) => x.id);
    expect(ids).toEqual(expect.arrayContaining(['focus', 'research', 'armies']));
    expect(d.find((x) => x.id === 'focus').items[0].tone).toBe('bad');   // žádný cíl
    expect(d.find((x) => x.id === 'research').items.every((i) => i.tone === 'bad')).toBe(true);   // volné sloty
    const arm = d.find((x) => x.id === 'armies').items;
    expect(arm.length).toBeGreaterThan(0);
    expect(arm.filter((a) => a.go.k === 'army').every((a) => s.mil.armies[a.go.id].o === GER)).toBe(true);
    for (const sec of d) for (const it of sec.items) { expect(it.key).toBeTruthy(); expect(it.n).toBeTruthy(); expect(it.go).toBeTruthy(); }
  });
  it('plněný cíl ukazuje postup a zbývající dny', () => {
    const s0 = createGame({ player: 'GER' });
    const f = focusTree(s0, GER).find((x) => x.status === 'available');
    const s1 = startFocus(s0, GER, f.id);
    const it = outlinerData(s1, GER).find((x) => x.id === 'focus').items[0];
    expect(it.n).toBe(f.n);
    expect(it.v).toBe(`${f.days} d`);
    expect(it.pct).toBe(0);
  });
});
