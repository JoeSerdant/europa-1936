import { useEffect, useState } from 'react';
import { useUi } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { listSaves, SLOTS, slotName } from '../saves.js';
import { saveGame, loadGame, removeSave, closeSaveDialog, openSaveDialog } from '../actions.js';
import { fmtNum } from '../format.js';

/** Dialog uložených her: ruční sloty, automatické a rychlé uložení; režim Uložit / Načíst, smazání slotu. */
export function SaveDialog() {
  const mode = useUi((s) => s.saveDialog);
  const msg = useUi((s) => s.saveMsg);
  const screen = useUi((s) => s.screen);
  const rev = useUi((s) => s.saveRev || 0);
  const [saves, setSaves] = useState(null);
  useEffect(() => {   // F2: seznam slotů se čte asynchronně (IndexedDB) – po otevření a po každém uložení či smazání
    if (!mode) return undefined;
    let live = true;
    listSaves().then((l) => { if (live) setSaves(new Map(l.map((x) => [x.slot, x]))); });
    return () => { live = false; };
  }, [mode, rev]);
  if (!mode) return null;
  const canSave = screen === 'game';
  return (
    <div className="scrim" onClick={closeSaveDialog}>
      <div className="panel dialog wide save-dialog" role="dialog" aria-label={mode === 'save' ? 'Uložit hru' : 'Načíst hru'} onClick={(e) => e.stopPropagation()}>
        <header className="sv-head">
          <h2>{mode === 'save' ? 'Uložit hru' : 'Načíst hru'}</h2>
          <div className="sv-tabs" role="tablist">
            <button role="tab" aria-selected={mode === 'save'} className={mode === 'save' ? 'on' : ''} disabled={!canSave} onClick={() => openSaveDialog('save')}>Uložit</button>
            <button role="tab" aria-selected={mode === 'load'} className={mode === 'load' ? 'on' : ''} onClick={() => openSaveDialog('load')}>Načíst</button>
          </div>
          <button className="icon-btn" onClick={closeSaveDialog} aria-label="Zavřít" title="Zavřít (Esc)"><Icon name="close" size={18} /></button>
        </header>
        <ul className="sv-list" aria-busy={!saves}>
          {SLOTS.map((slot) => {
            const m = saves ? saves.get(slot) : null;
            const writable = mode === 'save' && slot !== 'auto';
            return (
              <li key={slot} className={m ? 'full' : 'empty'}>
                <div className="sv-info">
                  <b>{slotName(slot)}</b>
                  {m ? <span className="muted">{m.name} · {m.date} · uloženo {m.savedAt || '–'} · {fmtNum((m.zip || m.size) / 1024, 0)} kB</span> : <span className="muted">{saves ? 'prázdný slot' : 'načítám…'}</span>}
                </div>
                {writable ? <button className="sbtn primary" onClick={() => saveGame(slot)} aria-label={`Uložit do slotu ${slotName(slot)}`}>{m ? 'Přepsat' : 'Uložit'}</button> : null}
                {mode === 'load' ? <button className="sbtn primary" disabled={!m} onClick={() => loadGame(slot)} aria-label={`Načíst ${slotName(slot)}`}>Načíst</button> : null}
                {m ? <button className="icon-btn sm" onClick={() => removeSave(slot)} aria-label={`Smazat ${slotName(slot)}`} title="Smazat"><Icon name="trash" size={14} /></button> : null}
              </li>
            );
          })}
        </ul>
        {msg ? <p className="sv-msg" role="status">{msg}</p> : null}
      </div>
    </div>
  );
}
