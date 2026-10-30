// Úložiště UI: herní stav (gameStore) a stav rozhraní (uiStore) + háčky pro React. Selektory musí vracet stabilní hodnoty
// (primitiva nebo existující objekty), jinak by se komponenty překreslovaly donekonečna.
import { edgeScrollOn } from './edge.js';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createStore, createGame } from '../engine/index.js';

export const gameStore = createStore(createGame());

/** Prázdné pole sdílené všude, kde „nic není vybráno“ (stejná reference = žádné zbytečné překreslení). */
export const NONE = Object.freeze([]);

export const uiStore = createStore({
  screen: 'menu',          // 'menu' | 'select' | 'game'
  mode: 'political',       // mapový režim
  selected: 0,             // označená oblast (id provincie nebo mořské oblasti)
  hover: 0,                // oblast pod kurzorem
  scenario: '1936',        // vybraný scénář nové hry (M39)
  aiLevel: 2,              // obtížnost AI zemí pro novou hru: 1 lehká, 2 běžná, 3 těžká (M24)
  aiHist: true,            // historické plány AI (války a bloky)
  pickTag: 'GER',          // země vybraná na obrazovce výběru
  helpOpen: false,         // okno s ovládáním
  menuOpen: false,         // nabídka ve hře (Esc)
  // ---- armáda (M18) ----
  selDivs: NONE,           // vybrané divize (pole id; vyměňuje se jen při změně)
  hoverUnits: null,        // divize ve žetonu pod kurzorem (pole id), jinak null
  panel: null,             // pravý panel: null (údaje o oblasti) | 'army' | 'recruit' | 'industry' | 'research' | 'politics' | 'nat' | 'dip' | 'log' | 'navy'
  armyFocus: 0,            // armáda zvolená v panelu (její plán se ukazuje na mapě)
  open: {},                // rozbalené/sbalené uzly stromu armád: { g3: false, a7: true } (chybějící = výchozí)
  planEdit: null,          // úprava plánu: { army, kind: 'area'|'front', area, line, to, mode, tool }
  designer: null,          // otevřený návrhář šablon: { tplId, draft: { nm, reg, sup } }
  techCat: 'all',          // obor v panelu Výzkum: 'all' | id oboru (M20)
  fleetSel: 0,             // vybraná flotila (M27)
  overview: false,         // okno Přehled zemí (M26)
  saveDialog: null,        // dialog uložených her: null | 'save' | 'load' (M25)
  saveMsg: '',             // zpráva v dialogu uložených her
  indTab: 'build',         // záložka panelu Průmysl: 'build' | 'prod' | 'trade' (M19)
  console: false,          // konzole s cheaty (M29)
  toast: null,             // krátké oznámení: { id, text }
  edgeScroll: edgeScrollOn(), // posun mapy okrajem obrazovky (M59)
  popups: [],              // vyskakovací karty oznámení (M58): { id, kind, icon, tone, title, text, lines, sticky }
});

const same = Object.is;
export function useGame(selector = (s) => s) {
  return useSyncExternalStore(gameStore.subscribe, () => selector(gameStore.getState()), () => selector(gameStore.getState()));
}
export function useUi(selector = (s) => s) {
  return useSyncExternalStore(uiStore.subscribe, () => selector(uiStore.getState()), () => selector(uiStore.getState()));
}

/**
 * Jako useGame, ale překreslí nejvýš jednou za `ms` milisekund. Pro seznamy, které se mění každou herní hodinu (při vysoké rychlosti i několikrát za snímek).
 * Selektor musí vracet stabilní hodnotu (existující objekt nebo primitivum).
 */
export function useGameSlow(selector, ms = 350) {
  const [value, setValue] = useState(() => selector(gameStore.getState()));
  const sel = useRef(selector);
  sel.current = selector;
  useEffect(() => {
    let timer = 0, last = 0;
    const flush = () => { timer = 0; last = performance.now(); setValue(sel.current(gameStore.getState())); };
    const off = gameStore.subscribe(() => {
      if (timer) return;
      timer = setTimeout(flush, Math.max(0, ms - (performance.now() - last)));
    });
    flush();
    return () => { off(); clearTimeout(timer); };
  }, [ms]);
  return value;
}

export const setUi = (patch) => uiStore.setState({ ...uiStore.getState(), ...patch });
export { same };
