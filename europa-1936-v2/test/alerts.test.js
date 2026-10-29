// Upozornění (M49): jednotlivá pravidla, kapitulace, čistota.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, advance, alertsOf, ALERT, startFocus, focusTree, validateState } from '../src/engine/index.js';

const W = getWorld();
const GER = W.ownerIdx.GER;
const ids = (s, o) => alertsOf(s, o).map((a) => a.id);

describe('upozornění (M49)', () => {
  it('na začátku hry zahálí výzkumné sloty a není zvolený národní cíl', () => {
    const s = createGame({ player: 'GER' });
    const a = ids(s, GER);
    expect(a).toContain('research');
    expect(a).toContain('focus');
    expect(alertsOf(s, 'GER')).toEqual(alertsOf(s, GER));
  });
  it('zvolený cíl upozornění zruší', () => {
    const s = createGame({ player: 'GER' });
    const f = focusTree(s, GER).find((x) => x.status === 'available');
    const t = startFocus(s, GER, f.id);
    expect(t).not.toBe(s);
    expect(ids(t, GER)).not.toContain('focus');
  });
  it('nevyužitá politická moc se ohlásí od prahu', () => {
    const s = createGame({ player: 'GER' });
    const own = s.pol.own.slice();
    own[GER] = { ...own[GER], pp: ALERT.PP_HIGH - 1 };
    expect(ids({ ...s, pol: { ...s.pol, own } }, GER)).not.toContain('pp');
    own[GER] = { ...own[GER], pp: ALERT.PP_HIGH };
    expect(ids({ ...s, pol: { ...s.pol, own } }, GER)).toContain('pp');
  });
  it('neplatná nebo kapitulovaná země nemá upozornění a výpočet nemění stav', () => {
    const s = createGame({ player: 'GER' });
    expect(alertsOf(s, 0)).toEqual([]);
    expect(alertsOf(s, 999)).toEqual([]);
    const cap = { ...s, dip: { ...s.dip, cap: s.dip.cap.map((c, o) => (o === GER ? 1 : c)) } };
    expect(alertsOf(cap, GER)).toEqual([]);
    const before = JSON.stringify(s.pol);
    alertsOf(s, GER);
    expect(JSON.stringify(s.pol)).toBe(before);
    expect(validateState(advance(s, 24))).toBeNull();
  });
});
