// UI1: rozložení stromu národních cílů jako v HOI4 – rodič uprostřed nad potomky, nic se nepřekrývá, každý strom se vejde.
import { describe, it, expect } from 'vitest';
import { createGame, focusTree, getWorld } from '../src/engine/index.js';
import { focusLayout, exclusivePairs, focusCat, focusMatches } from '../src/ui/nat/focusLayout.js';

const s0 = createGame({ player: 'GER' });

function check(tree) {
  const { pos, cols, rows } = focusLayout(tree);
  expect(pos.size).toBe(tree.length);
  const seen = new Map();
  for (const f of tree) {
    const p = pos.get(f.id);
    expect(p.col).toBeGreaterThanOrEqual(0);
    expect(p.col).toBeLessThan(cols);
    const key = `${p.row}:${p.col}`;
    expect(seen.has(key), `${f.id} se překrývá s ${seen.get(key)}`).toBe(false);
    seen.set(key, f.id);
    for (const r of [...f.req, ...f.any]) if (pos.has(r)) expect(pos.get(r).row).toBeLessThan(p.row);   // předpoklad je vždy výš
  }
  // v jednom řádku jsou cíle aspoň jeden sloupec od sebe
  const byRow = new Map();
  for (const p of pos.values()) { if (!byRow.has(p.row)) byRow.set(p.row, []); byRow.get(p.row).push(p.col); }
  for (const arr of byRow.values()) { arr.sort((a, b) => a - b); for (let i = 1; i < arr.length; i++) expect(arr[i] - arr[i - 1]).toBeGreaterThanOrEqual(1); }
  return { pos, cols, rows };
}

describe('UI1: strom národních cílů', () => {
  it('rodič je uprostřed nad svými potomky', () => {
    const tree = [
      { id: 'a', req: [], any: [], excl: [], x: 0, y: 0 },
      { id: 'b', req: ['a'], any: [], excl: ['c'], x: 0, y: 1 },
      { id: 'c', req: ['a'], any: [], excl: ['b'], x: 1, y: 1 },
      { id: 'd', req: ['b'], any: [], excl: [], x: 0, y: 2 },
    ];
    const { pos } = check(tree);
    expect(pos.get('a').col).toBe((pos.get('b').col + pos.get('c').col) / 2);
    expect(pos.get('d').col).toBe(pos.get('b').col);
    expect(exclusivePairs(tree, pos)).toEqual([['b', 'c']]);
  });

  it('všechny stromy zemí: bez překryvů, předpoklady nahoře, rozumná šířka', () => {
    const w = getWorld();
    for (let o = 1; o < w.owners.length; o++) {
      if (!s0.nat.own[o]) continue;
      const tree = focusTree(s0, o);
      if (!tree.length) continue;
      const { cols } = check(tree);
      expect(cols).toBeLessThan(tree.length + 20);
    }
  });

  it('druh cíle a hledání bez diakritiky', () => {
    expect(focusCat({ fx: [{ t: 'factory', k: 'civ', n: 1 }] })).toBe('industry');
    expect(focusCat({ fx: [{ t: 'xp', b: 'air', n: 30 }] })).toBe('air');
    expect(focusCat({ fx: [{ t: 'rel', tag: 'ENG', v: 20 }] })).toBe('dip');
    expect(focusMatches({ n: 'Čtyřletý plán' }, 'ctyr')).toBe(true);
    expect(focusMatches({ n: 'Čtyřletý plán' }, 'tank')).toBe(false);
  });
});
