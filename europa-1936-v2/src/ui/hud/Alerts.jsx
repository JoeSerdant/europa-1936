import { useMemo, useState } from 'react';
import { useGameSlow, useUi } from '../store.js';
import { FULL } from '../army/SidePanel.jsx';
import { Icon } from '../common/Icon.jsx';
import { alertsOf } from '../../engine/index.js';
import { playerIdx, openPanel, toggleIndustry } from '../actions.js';

const ICON = { event: 'politics', research: 'research', focus: 'flag', pp: 'politics', build: 'build', prod: 'industry', divs: 'army', decisions: 'gavel' };

/**
 * Řada upozornění vedle lišty nabídek (jako v HOI4): ikona s počtem, po najetí seznam podrobností, klik otevře příslušné okno,
 * pravé tlačítko upozornění odloží (vrátí se, když se změní počet).
 */
export function Alerts() {
  const state = useGameSlow((s) => s, 1200);
  const me = playerIdx(state);
  const full = useUi((u) => FULL.includes(u.panel));
  const [off, setOff] = useState({});
  const list = useMemo(() => (me ? alertsOf(state, me) : []), [state.tick, state.tech, state.nat, state.pol, state.ind, state.mil.lv, state.mil.divs, me]);
  const shown = list.filter((a) => off[a.id] !== a.n);
  if (!shown.length || full) return null;
  return (
    <ul className="alerts" aria-label="Upozornění">
      {shown.map((a) => (
        <li key={a.id}>
          <button className={`alert ${a.tone}`} aria-label={a.text} onClick={() => (a.tab ? toggleIndustry(a.tab) : openPanel(a.panel))}
            onContextMenu={(e) => { e.preventDefault(); setOff({ ...off, [a.id]: a.n }); }}>
            <Icon name={ICON[a.id] || 'help'} size={20} />
            {a.n > 1 && a.id !== 'pp' ? <i className="alert-n">{a.n}</i> : null}
            <span className="alert-tip" role="tooltip">
              <b>{a.text}</b>
              {a.lines.map((l, i) => <span key={i}>{l}</span>)}
              <em>Pravým tlačítkem odložíte.</em>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
