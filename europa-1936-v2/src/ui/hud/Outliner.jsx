import { useMemo, useState } from 'react';
import { useGameSlow, useUi } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { playerIdx, outlinerGo, toggleOutliner } from '../actions.js';
import { outlinerData } from './outliner.js';

// UI jako v HOI4: přehled vpravo (outliner) – národní cíl, výzkum, bitvy, armády, výcvik, flotily, letectvo, výroba a stavby
// v rozbalovacích oddílech; klik na položku vede na mapu nebo do okna. Data počítá jen `outlinerData`.

/** Jedna položka: název, číslo vpravo, proužek (postup, organizace, převaha). */
function Item({ it }) {
  return (
    <li>
      <button className={`ol-item ${it.tone || ''}`} onClick={() => outlinerGo(it.go)} title={it.tip || it.n}>
        <span className="ol-n">{it.n}</span>
        {it.v != null ? <b className="ol-v">{it.v}</b> : null}
        {it.pct != null ? <span className="ol-bar"><i style={{ width: `${Math.round(Math.max(0, Math.min(1, it.pct)) * 100)}%` }} /></span> : null}
      </button>
    </li>
  );
}

/** Přehled vpravo pod lištou nabídek; sbalitelný celý i po oddílech. */
export function Outliner() {
  const open = useUi((s) => s.outliner);
  const state = useGameSlow((s) => s, 800);
  const me = playerIdx(state);
  const data = useMemo(() => (me && open ? outlinerData(state, me) : []), [state, me, open]);
  const [shut, setShut] = useState({});
  if (!me) return null;
  return (
    <aside className={`outliner panel ${open ? 'open' : ''}`} aria-label="Přehled">
      <button className="ol-head" onClick={toggleOutliner} aria-expanded={open} title={open ? 'Sbalit přehled' : 'Rozbalit přehled'}>
        <Icon name="log" size={15} /><b>Přehled</b><Icon name="chevron" size={14} className={open ? 'up' : ''} />
      </button>
      {open && (
        <div className="ol-body">
          {data.map((sec) => (
            <section key={sec.id} className="ol-sec" aria-label={sec.n}>
              <button className="ol-sec-h" onClick={() => setShut({ ...shut, [sec.id]: !shut[sec.id] })} aria-expanded={!shut[sec.id]}>
                <Icon name={sec.icon} size={14} /><span>{sec.n}</span><i>{sec.items.length + (sec.more || 0)}</i>
              </button>
              {!shut[sec.id] && <ul>{sec.items.map((it) => <Item key={it.key} it={it} />)}{sec.more ? <li className="ol-more">a další ({sec.more})</li> : null}</ul>}
            </section>
          ))}
        </div>
      )}
    </aside>
  );
}
