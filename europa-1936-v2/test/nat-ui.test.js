// M22 – rozhraní národních cílů a událostí: akce hráče (výběr a přerušení cíle, rozhodnutí události). React komponenty hlídá smoke.mjs.
import { describe, it, expect, beforeEach } from 'vitest';
import { getWorld, applyFx, advance, focusTree, pendingEvents } from '../src/engine/index.js';
import { gameStore, uiStore } from '../src/ui/store.js';
import * as A from '../src/ui/actions.js';

const GER = getWorld().ownerIdx.GER;
const game = () => gameStore.getState();
const ui = () => uiStore.getState();

beforeEach(() => { A.goMenu(); A.startGame('GER'); });

describe('akce cílů', () => {
  it('výběr cíle, přepnutí na jiný a přerušení; zamčený cíl hlásí důvod', () => {
    expect(A.pickFocus('ger_rearm')).toBe(false);
    expect(ui().toast.text).toMatch(/nejde zahájit/);
    expect(A.pickFocus('ger_plan')).toBe(true);
    expect(game().nat.own[GER].cur.id).toBe('ger_plan');
    expect(ui().toast.text).toMatch(/Čtyřletý plán/);
    gameStore.setState(advance(game(), 24 * 3));
    expect(game().nat.own[GER].cur.p).toBe(3);
    expect(A.abortFocus()).toBe(true);
    expect(game().nat.own[GER].cur).toBeNull();
    expect(A.abortFocus()).toBe(false);
  });
  it('dokončený cíl odemkne další v panelu', () => {
    A.pickFocus('ger_plan');
    gameStore.setState(advance(game(), 24 * 45));
    expect(focusTree(game(), GER).find((f) => f.id === 'ger_rearm').status).toBe('available');
    expect(A.pickFocus('ger_rearm')).toBe(true);
  });
  it('pozorovatel nic neplní; panel Cíle se otevře', () => {
    A.openPanel('nat');
    expect(ui().panel).toBe('nat');
    A.goMenu(); A.startGame(null);
    expect(A.pickFocus('ger_plan')).toBe(false);
    expect(A.abortFocus()).toBe(false);
    expect(A.decideEvent('ger_rhine', 0)).toBe(false);
  });
});

describe('akce událostí', () => {
  it('událost hráče: pozastaví hru a rozhodnutí ji vyřeší', () => {
    gameStore.setState({ ...applyFx(game(), GER, [{ t: 'event', id: 'harvest', days: 1 }]), paused: false });
    gameStore.setState(advance(game(), 48));
    expect(game().paused).toBe(true);
    expect(pendingEvents(game(), GER)).toHaveLength(1);
    const pp0 = game().pol.own[GER].pp;
    expect(A.decideEvent('harvest', 5)).toBe(false);
    expect(A.decideEvent('harvest', 0)).toBe(true);
    expect(pendingEvents(game(), GER)).toHaveLength(0);
    expect(game().pol.own[GER].pp).toBe(pp0 + 20);
    expect(A.decideEvent('harvest', 0)).toBe(false);
  });
});
