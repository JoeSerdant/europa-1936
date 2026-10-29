import { useMemo } from 'react';
import { useGameSlow } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { focusTree, natOf, fxLinesOf, modLines, FOCUS_BY_ID } from '../../engine/index.js';
import { playerIdx, pickFocus, abortFocus } from '../actions.js';
import { fmtDays } from '../format.js';
import { Screen } from '../common/Screen.jsx';

const STATUS = { done: 'Hotovo', active: 'Plní se', available: 'K dispozici', locked: 'Zamčeno', excluded: 'Vyloučeno' };

function FocusCard({ f }) {
  const lines = fxLinesOf(f.fx).concat(modLines(f.mod));
  const need = f.status === 'locked' ? f.req.filter((r) => FOCUS_BY_ID[r]).map((r) => FOCUS_BY_ID[r].n) : [];
  const ex = f.excl.map((r) => FOCUS_BY_ID[r].n);
  return (
    <article className={`focus-card ${f.status}`} aria-label={f.n}>
      <header><b>{f.n}</b><span className="muted">{fmtDays(f.days)}</span></header>
      {lines.length ? <ul className="tech-fx">{lines.map((x) => <li key={x}>{x}</li>)}</ul> : null}
      {f.info ? <p className="muted">{f.info}</p> : null}
      {ex.length ? <p className="muted">Vylučuje: {ex.join(', ')}</p> : null}
      <footer>
        <span className={`tech-st ${f.status}`}>{STATUS[f.status]}{f.status === 'active' ? ` · zbývá ${fmtDays(f.left)}` : ''}</span>
        {need.length ? <span className="muted">Chybí: {need.join(', ')}</span> : null}
        {f.status === 'available' ? <button className="sbtn primary" onClick={() => pickFocus(f.id)}>Zahájit</button> : null}
      </footer>
    </article>
  );
}

/** Záložka Cíle: národní strom cílů (mřížka podle polohy), aktuálně plněný cíl a jeho zrušení. */
export function NatPanel() {
  const state = useGameSlow((s) => s, 700);
  const me = playerIdx(state);
  const tree = useMemo(() => (me ? focusTree(state, me) : []), [state.nat, me]);
  if (!me) return <div className="prod-screen nat-panel"><div className="prod-body"><p className="empty">Jako pozorovatel nevedete žádné národní cíle.</p></div></div>;
  const n = natOf(state, me);
  const cur = tree.find((f) => f.status === 'active');
  return (
    <Screen cls="nat-panel" title="Národní cíle" icon="flag" head={<div className="rs-sum"><span className="stat-cell"><i>Hotovo</i><b>{n.done}/{n.total}</b></span></div>}>
      <section className="rs-head rs-slots" aria-label="Plněný cíl">
        {cur ? (
          <div className="rs-slot">
            <div className="q-top">
              <b>{cur.n}</b><span className="muted">zbývá {fmtDays(cur.left)}</span>
              <button className="icon-btn sm" onClick={abortFocus} aria-label={`Přerušit cíl ${cur.n}`} title="Přerušit (postup se ztratí)"><Icon name="close" size={14} /></button>
            </div>
            <span className="bar prog"><i style={{ width: `${((cur.p / cur.days) * 100).toFixed(1)}%` }} /></span>
          </div>
        ) : <div className="rs-slot empty"><span className="muted">Žádný cíl se neplní – vyberte níže.</span></div>}
      </section>
      <div className="prod-body tech-body"><div className="focus-grid">{[...tree].sort((a, b) => a.y - b.y || a.x - b.x).map((f) => <FocusCard key={f.id} f={f} />)}</div></div>
    </Screen>
  );
}
