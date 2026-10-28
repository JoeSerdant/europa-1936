import { useEffect, useState } from 'react';
import { useUi } from '../store.js';
import { goMenu, setHelp, setMenuOpen } from '../actions.js';

/** Nabídka ve hře (Esc): pokračovat, ovládání, zpět do hlavního menu. */
export function GameMenu() {
  const open = useUi((s) => s.menuOpen);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { if (!open) setConfirm(false); }, [open]);
  if (!open) return null;
  return (
    <div className="scrim" onClick={() => setMenuOpen(false)}>
      <div className="panel dialog" role="dialog" aria-label="Nabídka" onClick={(e) => e.stopPropagation()}>
        <h2>Nabídka</h2>
        <div className="stack">
          <button className="btn primary" onClick={() => setMenuOpen(false)} autoFocus>Pokračovat ve hře</button>
          <button className="btn" onClick={() => { setMenuOpen(false); setHelp(true); }}>Ovládání</button>
          {confirm ? (
            <div className="confirm">
              <p>Rozehraná hra se neuloží. Opravdu odejít do hlavního menu?</p>
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
