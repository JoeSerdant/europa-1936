import { useMemo, useState } from 'react';
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

/** Okno Rozhodnutí (klávesa J): kategorie jako záložky (W6, jako v HOI4), pod nimi karty vybrané kategorie v mřížce. */
export function DecisionsPanel() {
  const state = useGameSlow((s) => s, 700);
  const me = playerIdx(state);
  const [tab, setTab] = useState('');
  const list = useMemo(() => (me ? decisionsOf(state, me) : []), [state.nat, state.pol, state.mil.wars, state.tick, me]);
  if (!me) return <div className="prod-screen decisions-panel"><div className="prod-body"><p className="empty">Jako pozorovatel nevedete žádná rozhodnutí.</p></div></div>;
  const pp = Math.floor(state.pol.own[me].pp);
  const cats = Object.entries(DECISION_CATS).map(([cat, name]) => ({ cat, name, items: list.filter((d) => d.cat === cat) })).filter((c) => c.items.length);
  const cur = cats.find((c) => c.cat === tab) || cats[0];
  return (
    <Screen cls="decisions-panel" title="Rozhodnutí" icon="gavel" head={<div className="lg-use"><span title="Politická moc"><i>Politická moc</i><b>{fmtInt(pp)}</b></span></div>}>
      <nav className="ind-tabs dec-tabs" role="tablist" aria-label="Kategorie rozhodnutí">
        {cats.map((c) => {
          const n = c.items.filter((d) => !d.block).length;
          return <button key={c.cat} role="tab" aria-selected={cur && cur.cat === c.cat} className={cur && cur.cat === c.cat ? 'on' : ''} onClick={() => setTab(c.cat)} title={`${n} k dispozici`}>{c.name}{n ? <span className="dec-n">{n}</span> : null}</button>;
        })}
      </nav>
      <div className="prod-body dec-body">
        {cur && (
          <section className="dec-col" aria-label={cur.name}>
            <div className="dec-grid">{cur.items.map((d) => <Card key={d.id} d={d} />)}</div>
          </section>
        )}
      </div>
    </Screen>
  );
}
