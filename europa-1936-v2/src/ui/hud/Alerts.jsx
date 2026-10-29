import { useMemo } from 'react';
import { useGameSlow, useUi } from '../store.js';
import { FULL } from '../army/SidePanel.jsx';
import { Icon } from '../common/Icon.jsx';
import { alertsOf } from '../../engine/index.js';
import { playerIdx, openPanel, toggleIndustry } from '../actions.js';

const ICON = { event: 'politics', research: 'research', focus: 'flag', pp: 'politics', build: 'build', prod: 'industry' };

/** Svislá řada upozornění pod lištou nabídek (nevyužité sloty, zahálející továrny, čekající událost); klik otevře příslušné okno. */
export function Alerts() {
  const state = useGameSlow((s) => s, 1200);
  const me = playerIdx(state);
  const full = useUi((u) => FULL.includes(u.panel));
  const list = useMemo(() => (me ? alertsOf(state, me) : []), [state.tick, state.tech, state.nat, state.pol, state.ind, state.mil.lv, me]);
  if (!list.length || full) return null;
  return (
    <ul className="alerts" aria-label="Upozornění">
      {list.map((a) => (
        <li key={a.id}>
          <button className={`alert ${a.tone}`} title={a.text} aria-label={a.text} onClick={() => (a.tab ? toggleIndustry(a.tab) : openPanel(a.panel))}>
            <Icon name={ICON[a.id] || 'help'} size={18} />
          </button>
        </li>
      ))}
    </ul>
  );
}
