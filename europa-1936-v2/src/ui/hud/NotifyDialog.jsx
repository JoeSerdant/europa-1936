import { useState } from 'react';
import { useUi } from '../store.js';
import { setNotifyOpen } from '../actions.js';
import { NOTIFY_GROUPS, NOTIFY_IDS, NOTIFY_MODES, notifyPrefs, setNotify, resetNotify } from '../notify.js';

/** F3: okno Nastavení upozornění (jako v HOI4) – u každé skupiny zpráv jen deník, oznámit, nebo oznámit a pozastavit hru. */
export function NotifyDialog() {
  const open = useUi((s) => s.notifyOpen);
  const [prefs, setPrefs] = useState(notifyPrefs());
  if (!open) return null;
  const pick = (id, mode) => { setNotify(id, mode); setPrefs(notifyPrefs()); };
  return (
    <div className="scrim" onClick={() => setNotifyOpen(false)}>
      <div className="panel dialog notify-dialog" role="dialog" aria-label="Nastavení upozornění" onClick={(e) => e.stopPropagation()}>
        <h2>Nastavení upozornění</h2>
        <p className="muted">Jak se mají ohlašovat zprávy z deníku. Všechny zprávy zůstávají v panelu Zprávy (L).</p>
        <div className="notify-rows">
          {NOTIFY_IDS.map((id) => (
            <div key={id} className="notify-row" title={NOTIFY_GROUPS[id].info}>
              <span>{NOTIFY_GROUPS[id].n}</span>
              <div className="notify-opts" role="group" aria-label={NOTIFY_GROUPS[id].n}>
                {NOTIFY_MODES.map(([m, t, info]) => (
                  <button key={m} className={`sbtn ${prefs[id] === m ? 'primary' : ''}`} aria-pressed={prefs[id] === m} title={info} onClick={() => pick(id, m)}>{t}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="notify-foot">
          <button className="btn" onClick={() => { resetNotify(); setPrefs(notifyPrefs()); }}>Výchozí</button>
          <button className="btn primary" onClick={() => setNotifyOpen(false)} autoFocus>Hotovo</button>
        </div>
      </div>
    </div>
  );
}
