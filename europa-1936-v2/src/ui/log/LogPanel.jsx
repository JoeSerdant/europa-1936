import { useMemo, useState } from 'react';
import { useGameSlow } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { logLine } from '../logText.js';
import { playerIdx } from '../actions.js';
import { dateText } from '../../engine/index.js';
import { formatDate } from '../../engine/time.js';

const FILTERS = [['all', 'Vše'], ['mine', 'Moje'], ['world', 'Světové']];

/** Záložka Zprávy: deník dění od nejnovějších, s filtrem (vše / moje / světové). */
export function LogPanel() {
  const state = useGameSlow((s) => s, 600);
  const me = playerIdx(state);
  const [f, setF] = useState('all');
  const rows = useMemo(() => {
    const out = [];
    for (let i = state.log.items.length - 1; i >= 0 && out.length < 150; i--) {
      const e = state.log.items[i], l = logLine(e, me);
      if (f === 'mine' && !l.mine) continue;
      if (f === 'world' && !l.world) continue;
      out.push({ e, l });
    }
    return out;
  }, [state.log, me, f]);
  void dateText;
  return (
    <div className="recruit-panel log-panel">
      <nav className="ind-tabs" role="tablist" aria-label="Filtr zpráv">
        {FILTERS.map(([id, n]) => <button key={id} role="tab" aria-selected={f === id} className={f === id ? 'on' : ''} onClick={() => setF(id)}>{n}</button>)}
      </nav>
      <div className="side-scroll">
        {!rows.length ? <p className="empty">Zatím se nic nestalo.</p> : (
          <ul className="log-list">
            {rows.map(({ e, l }) => (
              <li key={e.id} className={`log-row ${l.tone}`}>
                <Icon name={l.icon} size={16} />
                <span className="txt">{l.text}</span>
                <time className="muted">{formatDate(e.t)}</time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
