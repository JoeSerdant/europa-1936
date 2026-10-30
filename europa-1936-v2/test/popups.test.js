// Oznámení a vyskakovací okna (M58): sestavení karet ze záznamů deníku, nová upozornění (divize bez armády, rozhodnutí).
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, alertsOf, startFocus, focusTree } from '../src/engine/index.js';
import { popupFor } from '../src/ui/popups.js';
import { logImportant } from '../src/ui/logText.js';

const W = getWorld();
const GER = W.ownerIdx.GER, POL = W.ownerIdx.POL;

describe('vyskakovací karty (M58)', () => {
  it('národní cíl a výzkum mají název a seznam účinků', () => {
    const f = popupFor({ k: 'focus', x: 'ger_plan' }, GER);
    expect(f).toMatchObject({ kind: 'focus', title: 'Národní cíl splněn', text: 'Čtyřletý plán' });
    expect(f.lines.length).toBeGreaterThan(0);
    const t = popupFor({ k: 'tech', x: 'pusky2' }, GER);
    expect(t).toMatchObject({ kind: 'tech', title: 'Výzkum dokončen' });
    expect(popupFor({ k: 'focus', x: 'neexistuje' }, GER)).toBeNull();
  });
  it('válka se zemí hráče je trvalá karta, cizí válka žádná', () => {
    expect(popupFor({ k: 'war', a: POL, b: GER }, GER)).toMatchObject({ sticky: true, tone: 'bad' });
    expect(popupFor({ k: 'war', a: GER, b: POL }, GER).sticky).toBe(true);
    expect(popupFor({ k: 'war', a: POL, b: W.ownerIdx.FRA }, GER)).toBeNull();
    expect(popupFor({ k: 'cap', o: GER }, GER).sticky).toBe(true);
    expect(popupFor({ k: 'cap', o: POL }, GER).sticky).toBeUndefined();
    expect(popupFor({ k: 'neznamy' }, GER)).toBeNull();
  });
  it('stavba a doktrína jsou důležité záznamy', () => {
    expect(logImportant({ k: 'built' }, GER)).toBe(true);
    expect(logImportant({ k: 'doctrine' }, GER)).toBe(true);
    expect(popupFor({ k: 'built', x: 'civ', s: 1 }, GER).title).toBe('Stavba dokončena');
  });
});

describe('nová upozornění (M58)', () => {
  it('divize bez armády se započítají a mají počet', () => {
    const s = createGame({ player: 'GER' });
    expect(alertsOf(s, GER).find((a) => a.id === 'divs')).toBeUndefined();
    const idx = s.mil.divs.findIndex((d) => d && d.o === GER);
    const divs = s.mil.divs.slice(); divs[idx] = { ...divs[idx], army: 0 };
    const t = { ...s, mil: { ...s.mil, divs } };
    const a = alertsOf(t, GER).find((x) => x.id === 'divs');
    expect(a).toMatchObject({ n: 1, panel: 'army' });
  });
  it('rozhodnutí k dispozici a každé upozornění má počet a řádky', () => {
    const s = createGame({ player: 'GER' });
    for (const a of alertsOf(s, GER)) { expect(typeof a.n).toBe('number'); expect(Array.isArray(a.lines)).toBe(true); expect(a.text.length).toBeGreaterThan(5); }
    const f = focusTree(s, GER).find((x) => x.status === 'available');
    expect(alertsOf(startFocus(s, GER, f.id), GER).some((a) => a.id === 'focus')).toBe(false);
  });
});
