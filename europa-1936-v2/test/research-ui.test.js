// M20 – rozhraní výzkumu: akce hráče (sloty, hlášky), návrhář šablon s odemčenými prapory, přepínání oborů. React komponenty hlídá smoke.mjs.
import { describe, it, expect, beforeEach } from 'vitest';
import { getWorld, researchOf, isUnlocked, advance } from '../src/engine/index.js';
import { gameStore, uiStore } from '../src/ui/store.js';
import * as A from '../src/ui/actions.js';

const GER = getWorld().ownerIdx.GER;
const game = () => gameStore.getState();
const ui = () => uiStore.getState();
const giveTechs = (ids) => {
  const s = game();
  const own = s.tech.own.slice();
  const done = { ...own[GER].done };
  for (const id of ids) done[id] = 1;
  own[GER] = { ...own[GER], done };
  gameStore.setState({ ...s, tech: { ...s.tech, own } });
};

beforeEach(() => { A.goMenu(); A.startGame('GER'); });

describe('akce výzkumu', () => {
  it('zadání do prvního volného slotu, zaplnění slotů a zrušení', () => {
    expect(A.researchTech('pusky2')).toBe(true);
    expect(researchOf(game(), GER).slots[0].id).toBe('pusky2');
    expect(A.researchTech('dela2')).toBe(true);
    expect(A.researchTech('org1')).toBe(true);
    expect(researchOf(game(), GER).free).toBe(0);
    expect(A.researchTech('stav1')).toBe(false);
    expect(ui().toast.text).toMatch(/sloty/);
    expect(A.researchTech('stav1', 1)).toBe(true);           // přepsání slotu
    expect(researchOf(game(), GER).slots[1].id).toBe('stav1');
    expect(A.researchTech('stav1', 2)).toBe(false);
    expect(ui().toast.text).toMatch(/už zkoumá/);
    expect(A.stopResearch(0)).toBe(true);
    expect(A.stopResearch(0)).toBe(false);
  });
  it('zamčené a neexistující technologie hlásí důvod', () => {
    expect(A.researchTech('mtank')).toBe(false);
    expect(ui().toast.text).toMatch(/předpoklady/);
    expect(A.researchTech('nic')).toBe(false);
  });
  it('pozorovatel nezkoumá', () => {
    A.goMenu(); A.startGame(null);
    expect(A.researchTech('pusky2')).toBe(false);
    expect(A.stopResearch(0)).toBe(false);
  });
  it('panel a obor se přepínají a po návratu do menu se vrací výchozí', () => {
    A.openPanel('research');
    expect(ui().panel).toBe('research');
    A.setTechCat('tanky');
    expect(ui().techCat).toBe('tanky');
    A.goMenu();
    expect(ui().techCat).toBe('all');
  });
});

describe('návrhář a výzkum', () => {
  it('prapor zamčený výzkumem nejde uložit, po výzkumu ano', () => {
    A.openDesigner(0);
    const d = ui().designer;
    A.updateDraft({ ...d.draft, nm: 'Tankisté', reg: [['mtank', 'mtank']], sup: [] });
    expect(A.saveDesigner()).toMatch(/odemčený/);
    giveTechs(['ltank2', 'mtank']);
    expect(isUnlocked(game(), GER, 'mtank')).toBe(true);
    const n = game().mil.tpl.length;
    expect(A.saveDesigner()).toBeNull();
    expect(game().mil.tpl.length).toBe(n + 1);
  });
  it('hodina za hodinou: dokončený výzkum přes herní smyčku zvedne úroveň výzbroje', () => {
    A.researchTech('pusky2');
    gameStore.setState(advance(game(), 24 * 70));
    expect(game().mil.lv[GER]).toEqual({ pusky: 2 });
    expect(researchOf(game(), GER).levels).toEqual({ pusky: 2 });
  });
});
