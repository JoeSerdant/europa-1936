// M23 – rozhraní diplomacie: akce hráče (ospravedlnění, vyhlášení, mír, bloky) a hlášky. React komponenty hlídá smoke.mjs.
import { describe, it, expect, beforeEach } from 'vitest';
import { getWorld, diplomacyOf, advance, atWar, factionOf, DIP } from '../src/engine/index.js';
import { gameStore, uiStore } from '../src/ui/store.js';
import * as A from '../src/ui/actions.js';

const W = getWorld();
const GER = W.ownerIdx.GER, POL = W.ownerIdx.POL, ITA = W.ownerIdx.ITA;
const game = () => gameStore.getState();
const ui = () => uiStore.getState();
const pay = (pp) => { const s = game(), own = s.pol.own.slice(); own[GER] = { ...own[GER], pp }; gameStore.setState({ ...s, pol: { ...s.pol, own } }); };

beforeEach(() => { A.goMenu(); A.startGame('GER'); });

describe('akce diplomacie', () => {
  it('válka: bez ospravedlnění hlásí důvod, ospravedlnění stojí moc a čas, pak se vyhlásí', () => {
    expect(A.declareWarOn('POL')).toBe(false);
    expect(ui().toast.text).toMatch(/ospravedln/i);
    expect(A.justifyOn('POL')).toBe(false);
    expect(ui().toast.text).toMatch(/politická moc|Ospravedlnění/);
    pay(100);
    expect(A.justifyOn('POL')).toBe(true);
    expect(game().pol.own[GER].pp).toBe(100 - DIP.JUST_PP);
    expect(A.declareWarOn('POL')).toBe(false);                       // ještě se ospravedlňuje
    gameStore.setState(advance(game(), 24 * (DIP.JUST_DAYS + 1)));
    expect(A.declareWarOn('POL')).toBe(true);
    expect(atWar(game(), 'GER', 'POL')).toBe(true);
    expect(atWar(game(), 'GER', 'FRA')).toBe(true);                  // blok Polska
  });
  it('mír: nejsou-li ve válce, hlásí důvod; navržený mír platí jen s protivníkem', () => {
    expect(A.makePeaceWith('POL')).toBe(false);
    expect(ui().toast.text).toMatch(/válce/);
    pay(100); A.justifyOn('POL');
    gameStore.setState(advance(game(), 24 * 31));
    A.declareWarOn('POL');
    expect(A.makePeaceWith('POL')).toBe(true);
    expect(atWar(game(), 'GER', 'POL')).toBe(false);
    expect(atWar(game(), 'GER', 'FRA')).toBe(true);                  // s Francií dál válčí
  });
  it('bloky: založení, pozvání, odchod; hlášky při neúspěchu', () => {
    expect(A.foundBloc('Osa')).toBe(false);
    expect(ui().toast.text).toMatch(/politická moc/);
    pay(200);
    expect(A.foundBloc('Osa')).toBe(true);
    expect(factionOf(game(), GER).nm).toBe('Osa');
    expect(A.inviteBloc('FRA')).toBe(false);
    expect(ui().toast.text).toMatch(/v bloku|odmítá/);
    expect(A.inviteBloc('ITA')).toBe(true);
    expect(factionOf(game(), ITA).mem).toContain(GER);
    expect(diplomacyOf(game(), 'GER').faction.mem).toEqual([GER, ITA]);
    expect(A.leaveBloc()).toBe(true);
    expect(A.leaveBloc()).toBe(false);
    expect(factionOf(game(), GER)).toBeNull();
  });
  it('pozorovatel nic nepodniká; panel Diplomacie se otevře', () => {
    A.openPanel('dip');
    expect(ui().panel).toBe('dip');
    A.goMenu(); A.startGame(null);
    expect(A.justifyOn('POL')).toBe(false);
    expect(A.declareWarOn('POL')).toBe(false);
    expect(A.makePeaceWith('POL')).toBe(false);
    expect(A.foundBloc('X')).toBe(false);
    expect(A.inviteBloc('ITA')).toBe(false);
    expect(A.leaveBloc()).toBe(false);
  });
});
