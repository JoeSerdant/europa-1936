// Háčky pro hlavní smyčku hry a klávesové zkratky.
import { useEffect } from 'react';
import { advance, hoursForElapsed, togglePause, changeSpeed, getWorld } from '../engine/index.js';
import { gameStore, uiStore } from './store.js';
import {
  toast, playerIdx, selectFleet, closeSide, closeSaveDialog, openOverview, closeOverview, quickSave, quickLoad, setHelp, setMenuOpen, setMode, togglePanel, toggleIndustry, toggleConsole, closeConsole, stopSelected, focusSelection, clearSelection, cancelPlanEdit, closeDesigner,
} from './actions.js';
import { MODES } from './map/colors.js';
import { writeSave } from './saves.js';
import { logLine, logImportant } from './logText.js';

const AUTOSAVE_HOURS = 24 * 30;   // automatické uložení jednou za herní měsíc

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
      if (hours > 0) {
        const prev = gameStore.getState();
        const before = prev.dip.cap;
        gameStore.update(advance, hours);
        const cur = gameStore.getState();
        const after = cur.dip.cap;
        if (cur.log !== prev.log) {
          const me = playerIdx(cur);
          const fresh = cur.log.items.filter((e) => e.id > prev.log.n && logImportant(e, me));
          if (fresh.length) toast(logLine(fresh[fresh.length - 1], me).text);
        }
        if (cur.player && Math.floor(cur.tick / AUTOSAVE_HOURS) !== Math.floor(prev.tick / AUTOSAVE_HOURS)) writeSave('auto', cur, new Date().toLocaleString('cs-CZ'));
        if (after !== before) for (let o = 1; o < after.length; o++) if (after[o] && !before[o]) toast(`${getWorld().owners[o].name} kapitulovala.`);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}

const isTyping = (e) => /^(input|textarea|select)$/i.test(e.target.tagName) || e.target.isContentEditable;

/**
 * Klávesové zkratky: mezerník = pauza, + − = rychlost, 1–8 = mapové režimy, V = panel Armáda, N = Nábor, I = Průmysl, R = Výzkum, P = Politika, C = Cíle, D = Diplomacie, L = Zprávy, M = Námořnictvo, O = Přehled zemí, X = zastavit vybrané divize,
 * F = zaměřit výběr, Esc = zrušit/zavřít (nabídka → návrhář → úprava plánu → výběr jednotek → panel), F1 nebo ? = nápověda.
 */
export function useHotkeys() {
  useEffect(() => {
    const onKey = (e) => {
      if (isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      const ui = uiStore.getState();
      if (e.key === 'F1' || e.key === '?') { e.preventDefault(); setHelp(!ui.helpOpen); return; }
      if (ui.saveDialog) { if (e.key === 'Escape') closeSaveDialog(); return; }
      if (ui.overview && e.key === 'Escape') { closeOverview(); return; }
      if (e.key === 'F2' || e.key === '`' || e.key === '~' || e.code === 'Backquote') { e.preventDefault(); if (uiStore.getState().screen === 'game') toggleConsole(); return; }
      if (ui.console && e.key === 'Escape') { closeConsole(); return; }
      if (e.key === 'F6') { e.preventDefault(); quickSave(); return; }
      if (e.key === 'F9') { e.preventDefault(); quickLoad(); return; }
      const gs = gameStore.getState();
      if (ui.screen === 'game' && gs.player && (gs.nat.pend.some((p) => p.o === playerIdx(gs)) || gs.dip.conf.some((c) => c.victor === playerIdx(gs)) || (gs.end && !gs.end.ack))) return;   // čeká událost: nejdřív se rozhodne
      if (e.key === 'Escape') {
        if (ui.helpOpen) setHelp(false);
        else if (ui.screen === 'game') {
          if (ui.menuOpen) setMenuOpen(false);
          else if (ui.designer) closeDesigner();
          else if (ui.planEdit) cancelPlanEdit();
          else if (ui.selDivs.length) clearSelection();
          else if (ui.fleetSel) selectFleet(0);
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
      if (/^[0-9]$/.test(e.key)) { const m = MODES[(Number(e.key) + 9) % 10]; if (m) setMode(m.id); return; }
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === 'v') togglePanel('army');
      else if (k === 'n') togglePanel('recruit');
      else if (k === 'q' || k === 'p') togglePanel('politics');
      else if (k === 'w') togglePanel('research');
      else if (k === 'e' || k === 'd') togglePanel('dip');
      else if (k === 'r') toggleIndustry('trade');
      else if (k === 't') toggleIndustry('build');
      else if (k === 'y') toggleIndustry('prod');
      else if (k === 'u') togglePanel('recruit');
      else if (k === 'i') togglePanel('logistics');
      else if (k === 'a') togglePanel('air');
      else if (k === 'k') togglePanel('doctrine');
      else if (k === 'j') togglePanel('decisions');
      else if (k === 'c') togglePanel('nat');
      else if (k === 'l') togglePanel('log');
      else if (k === 'm') togglePanel('navy');
      else if (k === 'o') { if (ui.overview) closeOverview(); else openOverview(); }
      else if (k === 'x') stopSelected();
      else if (k === 'f') focusSelection();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

