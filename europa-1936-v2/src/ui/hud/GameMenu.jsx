import { useEffect, useState } from 'react';
import { useUi } from '../store.js';
import { soundOn, setSound } from '../sound.js';
import { tutorialOn, setTutorial } from '../tutorial/prefs.js';
import { setUi } from '../store.js';
import { edgeScrollOn, setEdgeScroll } from '../edge.js';
import { goMenu, setHelp, setMenuOpen, openSaveDialog } from '../actions.js';

/** Nabídka ve hře (Esc): pokračovat, ovládání, zpět do hlavního menu. */
export function GameMenu() {
  const open = useUi((s) => s.menuOpen);
  const [confirm, setConfirm] = useState(false);
  const [snd, setSnd] = useState(soundOn());
  const [tut, setTut] = useState(tutorialOn());
  const [edge, setEdge] = useState(edgeScrollOn());
  useEffect(() => { if (!open) setConfirm(false); }, [open]);
  if (!open) return null;
  return (
    <div className="scrim" onClick={() => setMenuOpen(false)}>
      <div className="panel dialog" role="dialog" aria-label="Nabídka" onClick={(e) => e.stopPropagation()}>
        <h2>Nabídka</h2>
        <div className="stack">
          <button className="btn primary" onClick={() => setMenuOpen(false)} autoFocus>Pokračovat ve hře</button>
          <button className="btn" onClick={() => { setMenuOpen(false); openSaveDialog('save'); }}>Uložit hru</button>
          <button className="btn" onClick={() => { setMenuOpen(false); openSaveDialog('load'); }}>Načíst hru</button>
          <button className="btn" onClick={() => { setMenuOpen(false); setHelp(true); }}>Ovládání</button>
          <button className="btn" aria-pressed={tut} onClick={() => { setTutorial(!tut); setTut(!tut); }}>Průvodce: {tut ? 'zapnutý' : 'vypnutý'}</button>
          <button className="btn" aria-pressed={edge} onClick={() => { setEdgeScroll(!edge); setEdge(!edge); setUi({ edgeScroll: !edge }); }}>Posun okrajem: {edge ? 'zapnutý' : 'vypnutý'}</button>
          <button className="btn" aria-pressed={snd} onClick={() => { setSound(!snd); setSnd(!snd); }}>Zvuk: {snd ? 'zapnutý' : 'vypnutý'}</button>
          {confirm ? (
            <div className="confirm">
              <p>Neuložená hra se ztratí. Opravdu odejít do hlavního menu?</p>
              <button className="btn danger" onClick={goMenu}>Odejít do menu</button>
              <button className="btn" onClick={() => setConfirm(false)}>Zůstat ve hře</button>
            </div>
          ) : (
            <button className="btn" onClick={() => setConfirm(true)}>Hlavní menu</button>
          )}
        </div>
      </div>
    </div>
  );
}
