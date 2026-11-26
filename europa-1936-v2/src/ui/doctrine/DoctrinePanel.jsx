import { useMemo, useState } from 'react';
import { useGameSlow } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { Screen } from '../common/Screen.jsx';
import { doctrinesOf, DOC } from '../../engine/index.js';
import { playerIdx, adoptDoc } from '../actions.js';

const STATUS = (l) => (l.done ? 'done' : l.can ? 'available' : 'locked');

function Level({ l }) {
  const st = STATUS(l);
  return (
    <article className={`doc-level ${st}`} aria-label={l.n}>
      <span className="dl-step" aria-hidden="true">{l.done ? '✓' : l.level}</span>
      <header><b>{l.n}</b><span className="muted">stupeň {l.level}</span></header>
      <p className="muted">{l.info}</p>
      <footer>
        {l.done ? <span className="tech-st done">Přijato</span> : l.can ? <button className="sbtn primary" onClick={() => adoptDoc(l.id)}>Přijmout · {l.cost}</button> : <span className="muted">{l.block}</span>}
      </footer>
    </article>
  );
}

/** Okno Důstojnický sbor (klávesa K) jako v HOI4 (UI3): záložky větví (pozemní, letecká, námořní), směry jako sloupce, stupně pod sebou. */
export function DoctrinePanel() {
  const state = useGameSlow((s) => s, 700);
  const me = playerIdx(state);
  const view = useMemo(() => (me ? doctrinesOf(state, me) : []), [state.doc, me]);
  const [tab, setTab] = useState(0);
  if (!me) return <div className="prod-screen doctrine-panel"><div className="prod-body"><p className="empty">Jako pozorovatel nevedete žádné doktríny.</p></div></div>;
  const b = view[Math.min(tab, view.length - 1)];
  return (
    <Screen cls="doctrine-panel" title="Důstojnický sbor" icon="general" head={(
      <div className="lg-use">
        {view.map((x) => <span key={x.id} title={`${x.xp} (strop ${DOC.XP_MAX})`}><i>{x.xp}</i><b>{Math.floor(x.have)}</b></span>)}
      </div>
    )}>
      <nav className="doc-tabs" role="tablist" aria-label="Větve doktrín">
        {view.map((x, i) => (
          <button key={x.id} role="tab" aria-selected={x === b} className={x === b ? 'on' : ''} onClick={() => setTab(i)}>
            <Icon name={x.icon} size={16} /> {x.n}<i>{Math.floor(x.have)} zk.</i>
          </button>
        ))}
      </nav>
      {b ? (
        <div className="prod-body doc-body" aria-label={b.n}>
          {!b.chosen ? <p className="doc-hint">Vyberte směr: první přijatý stupeň určí směr celé větve, ostatní směry se uzavřou.</p> : null}
          <div className="doc-cols" style={{ gridTemplateColumns: `repeat(${b.tracks.length}, minmax(0, 1fr))` }}>
            {b.tracks.map((t) => (
              <section key={t.id} className={`doc-track ${t.excluded ? 'excluded' : ''} ${t.levels.some((l) => l.done) ? 'chosen' : ''}`} aria-label={t.n}>
                <header className="dt-head"><span className="dt-badge"><Icon name={b.icon} size={22} /></span><h4>{t.n}</h4><p className="muted">{t.info}</p></header>
                <div className="doc-levels">{t.levels.map((l) => <Level key={l.id} l={l} />)}</div>
              </section>
            ))}
          </div>
        </div>
      ) : null}
    </Screen>
  );
}
