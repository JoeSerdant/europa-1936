// Háčky pro hlavní smyčku hry a klávesové zkratky.
import { useEffect } from 'react';
import { advance, hoursForElapsed, togglePause, changeSpeed } from '../engine/index.js';
import { gameStore, uiStore } from './store.js';
import {
  closeSide, setHelp, setMenuOpen, setMode, togglePanel, stopSelected, focusSelection, clearSelection, cancelPlanEdit, closeDesigner,
} from './actions.js';
import { MODES } from './map/colors.js';

/** Smyčka času: z reálného času počítá herní hodiny podle rychlosti a posouvá stav. Běží jen na obrazovce hry. */
export function useGameLoop(active) {
  useEffect(() => {
    if (!active) return undefined;
    let raf = 0, last = performance.now(), carry = 0;
    const frame = (t) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(250, Math.max(0, t - last));      // po uspání karty se čas nepřeskakuje
      last = t;
      const { hours, carry: c } = hoursForElapsed(gameStore.getState(), dt, carry);
      carry = c;
      if (hours > 0) gameStore.update(advance, hours);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}

const isTyping = (e) => /^(input|textarea|select)$/i.test(e.target.tagName) || e.target.isContentEditable;

/**
 * Klávesové zkratky: mezerník = pauza, + − = rychlost, 1–8 = mapové režimy, V = panel Armáda, N = Nábor, I = Průmysl, R = Výzkum, P = Politika, X = zastavit vybrané divize,
 * F = zaměřit výběr, Esc = zrušit/zavřít (nabídka → návrhář → úprava plánu → výběr jednotek → panel), F1 nebo ? = nápověda.
 */
export function useHotkeys() {
  useEffect(() => {
    const onKey = (e) => {
      if (isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      const ui = uiStore.getState();
      if (e.key === 'F1' || e.key === '?') { e.preventDefault(); setHelp(!ui.helpOpen); return; }
      if (e.key === 'Escape') {
        if (ui.helpOpen) setHelp(false);
        else if (ui.screen === 'game') {
          if (ui.menuOpen) setMenuOpen(false);
          else if (ui.designer) closeDesigner();
          else if (ui.planEdit) cancelPlanEdit();
          else if (ui.selDivs.length) clearSelection();
          else if (ui.selected || ui.panel) closeSide();
          else setMenuOpen(true);
        }
        return;
      }
      if (ui.screen !== 'game' || ui.helpOpen) return;
      if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); if (!e.repeat) gameStore.update(togglePause); return; }
      if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') { e.preventDefault(); gameStore.update(changeSpeed, 1); return; }
      if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') { e.preventDefault(); gameStore.update(changeSpeed, -1); return; }
      if (ui.designer || ui.menuOpen) return;
      if (/^[1-8]$/.test(e.key)) { const m = MODES[Number(e.key) - 1]; if (m) setMode(m.id); return; }
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === 'v') togglePanel('army');
      else if (k === 'n') togglePanel('recruit');
      else if (k === 'i') togglePanel('industry');
      else if (k === 'r') togglePanel('research');
      else if (k === 'p') togglePanel('politics');
      else if (k === 'x') stopSelected();
      else if (k === 'f') focusSelection();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

