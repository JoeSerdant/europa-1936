import { useMemo } from 'react';
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
      <header><b>{l.n}</b><span className="muted">stupeň {l.level}</span></header>
      <p className="muted">{l.info}</p>
      <footer>
        {l.done ? <span className="tech-st done">Přijato</span> : l.can ? <button className="sbtn primary" onClick={() => adoptDoc(l.id)}>Přijmout · {l.cost}</button> : <span className="muted">{l.block}</span>}
      </footer>
    </article>
  );
}

/** Okno Důstojnický sbor (klávesa K): tři větve doktrín (pozemní, letecká, námořní) se zkušenostmi a směry po třech stupních. */
export function DoctrinePanel() {
  const state = useGameSlow((s) => s, 700);
  const me = playerIdx(state);
  const view = useMemo(() => (me ? doctrinesOf(state, me) : []), [state.doc, me]);
  if (!me) return <div className="prod-screen doctrine-panel"><div className="prod-body"><p className="empty">Jako pozorovatel nevedete žádné doktríny.</p></div></div>;
  return (
    <Screen cls="doctrine-panel" title="Důstojnický sbor" icon="general" head={(
      <div className="lg-use">
        {view.map((b) => <span key={b.id} title={`${b.xp} (strop ${DOC.XP_MAX})`}><i>{b.xp}</i><b>{Math.floor(b.have)}</b></span>)}
      </div>
    )}>
      <div className="prod-body doc-body">
        {view.map((b) => (
          <section key={b.id} className="doc-branch" aria-label={b.n}>
            <div className="sec-head"><h3><Icon name={b.icon} size={16} /> {b.n}</h3><span className="muted">{Math.floor(b.have)} zkušeností</span></div>
            {b.tracks.map((t) => (
              <div key={t.id} className={`doc-track ${t.excluded ? 'excluded' : ''}`}>
                <h4>{t.n}<span className="muted"> · {t.info}</span></h4>
                <div className="doc-levels">{t.levels.map((l) => <Level key={l.id} l={l} />)}</div>
              </div>
            ))}
            {!b.chosen && <p className="muted">První stupeň určí směr celé větve.</p>}
          </section>
        ))}
      </div>
    </Screen>
  );
}
