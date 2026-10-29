import { useMemo } from 'react';
import { useGameSlow } from '../store.js';
import { Screen } from '../common/Screen.jsx';
import { decisionsOf, DECISION_CATS, getWorld } from '../../engine/index.js';
import { playerIdx, useDecision } from '../actions.js';
import { fmtInt } from '../format.js';

function Card({ d }) {
  const ready = !d.block;
  return (
    <article className={`dec-card ${ready ? 'ready' : ''} ${d.used ? 'used' : ''}`} aria-label={d.n}>
      <header><b>{d.n}</b><span className="dec-cost" title="Cena v politické moci">{d.cost} PM</span></header>
      <p className="muted">{d.info}</p>
      {d.lines.length > 0 && <ul className="tech-fx">{d.lines.map((x) => <li key={x}>{x}</li>)}</ul>}
      <footer>
        {d.used ? <span className="muted">Už využito.</span> : <>
          <button className="sbtn primary" disabled={!ready} onClick={() => useDecision(d.id)} title={d.block || 'Použít rozhodnutí'}>Použít</button>
          <span className="muted">{d.block || (d.cd >= 99999 ? 'jednorázově' : `obnova ${d.cd} dní`)}</span>
        </>}
      </footer>
    </article>
  );
}

/** Okno Rozhodnutí (klávesa J): jednorázové akce za politickou moc podle kategorií, s podmínkami a obnovovací dobou. */
export function DecisionsPanel() {
  const state = useGameSlow((s) => s, 700);
  const me = playerIdx(state);
  const list = useMemo(() => (me ? decisionsOf(state, me) : []), [state.nat, state.pol, state.mil.wars, state.tick, me]);
  if (!me) return <div className="prod-screen decisions-panel"><div className="prod-body"><p className="empty">Jako pozorovatel nevedete žádná rozhodnutí.</p></div></div>;
  const pp = Math.floor(state.pol.own[me].pp);
  const tag = getWorld().owners[me].tag;
  void tag;
  return (
    <Screen cls="decisions-panel" title="Rozhodnutí" icon="gavel" head={<div className="lg-use"><span title="Politická moc"><i>Politická moc</i><b>{fmtInt(pp)}</b></span></div>}>
      <div className="prod-body dec-body">
        {Object.entries(DECISION_CATS).map(([cat, name]) => {
          const items = list.filter((d) => d.cat === cat);
          if (!items.length) return null;
          return (
            <section key={cat} className="dec-col" aria-label={name}>
              <div className="sec-head"><h3>{name}</h3><span className="muted">{items.filter((d) => !d.block).length} k dispozici</span></div>
              {items.map((d) => <Card key={d.id} d={d} />)}
            </section>
          );
        })}
      </div>
    </Screen>
  );
}
