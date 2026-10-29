// M21 – rozhraní politiky: akce hráče (zákony, poradci, hlášky, pozorovatel). React komponenty hlídá smoke.mjs.
import { describe, it, expect, beforeEach } from 'vitest';
import { getWorld, politicsOf } from '../src/engine/index.js';
import { gameStore, uiStore } from '../src/ui/store.js';
import * as A from '../src/ui/actions.js';

const GER = getWorld().ownerIdx.GER;
const game = () => gameStore.getState();
const ui = () => uiStore.getState();
const pay = (pp, ws = 0.9) => {
  const s = game(), own = s.pol.own.slice();
  own[GER] = { ...own[GER], pp, ws };
  gameStore.setState({ ...s, pol: { ...s.pol, own } });
};

beforeEach(() => { A.goMenu(); A.startGame('GER'); });

describe('akce politiky', () => {
  it('zákon: bez moci hlásí důvod, s mocí se změní a ohlásí', () => {
    expect(A.changeLaw('eco', 'early')).toBe(false);
    expect(ui().toast.text).toMatch(/politická moc/);
    pay(500);
    expect(A.changeLaw('eco', 'early')).toBe(true);
    expect(game().pol.own[GER].laws.eco).toBe('early');
    expect(ui().toast.text).toMatch(/Raná mobilizace/);
    expect(A.changeLaw('eco', 'early')).toBe(false);
    pay(500, 0.1);
    expect(A.changeLaw('eco', 'total')).toBe(false);
    expect(ui().toast.text).toMatch(/podporu války/);
  });
  it('poradce: najmutí, nedostatek moci, propuštění', () => {
    expect(A.hireAdv('sci', 'akademik')).toBe(false);
    expect(ui().toast.text).toMatch(/Chybí/);
    pay(300);
    expect(A.hireAdv('sci', 'akademik')).toBe(true);
    expect(politicsOf(game(), 'GER').advisors.find((a) => a.slot === 'sci').current.id).toBe('akademik');
    expect(A.hireAdv('pol', 'akademik')).toBe(false);
    expect(A.dismissAdv('sci')).toBe(true);
    expect(A.dismissAdv('sci')).toBe(false);
    expect(A.hireAdv('sci', 'nikdo')).toBe(false);
  });
  it('pozorovatel nic nemění; panel Politika se otevře', () => {
    A.openPanel('politics');
    expect(ui().panel).toBe('politics');
    A.goMenu(); A.startGame(null);
    expect(A.changeLaw('eco', 'early')).toBe(false);
    expect(A.hireAdv('sci', 'akademik')).toBe(false);
    expect(A.dismissAdv('sci')).toBe(false);
  });
});
