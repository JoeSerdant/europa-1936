import { useMemo, useState } from 'react';
import { useGameSlow } from '../store.js';
import { Screen } from '../common/Screen.jsx';
import { Icon } from '../common/Icon.jsx';
import { decisionsOf, DECISION_CATS } from '../../engine/index.js';
import { playerIdx, useDecision } from '../actions.js';
import { fmtInt } from '../format.js';

const CAT_ICON = { eco: 'industry', mil: 'army', war: 'swords', tech: 'research', dip: 'dip', pol: 'politics', nat: 'flag' };

/** UI7: rozhodnutí jako řádek (jako v HOI4) – ikona, název, stav, cena v PM a tlačítko; podrobnosti ukáže okno při najetí. */
function Row({ d, onHover }) {
  const ready = !d.block && !d.used;
  return (
    <article className={`dec-card dec-row ${ready ? 'ready' : ''} ${d.used ? 'used' : ''}`} aria-label={d.n} onPointerEnter={() => onHover(d.id)} onPointerLeave={() => onHover(null)}>
      <span className="dr-ic" aria-hidden="true"><Icon name={CAT_ICON[d.cat] || 'gavel'} size={16} /></span>
      <span className="dr-txt"><b>{d.n}</b><i>{d.used ? 'Už využito' : d.block || (d.cd >= 99999 ? 'jednorázově' : `obnova ${d.cd} dní`)}</i></span>
      <span className="dec-cost" title="Cena v politické moci"><Icon name="general" size={13} />{d.cost}</span>
      {d.used ? <span className="dr-done" aria-hidden="true"><Icon name="check" size={14} /></span>
        : <button className="sbtn primary dr-go" disabled={!ready} onClick={() => useDecision(d.id)} title={d.block || 'Použít rozhodnutí'} aria-label={`Použít: ${d.n}`}>Použít</button>}
    </article>
  );
}

function Info({ d }) {
  if (!d) return null;
  return (
    <aside className="dec-info" aria-label={`Rozhodnutí ${d.n}`}>
      <header><Icon name={CAT_ICON[d.cat] || 'gavel'} size={16} /><b>{d.n}</b><span>{d.cost} PM</span></header>
      <p>{d.info}</p>
      {d.lines.length ? <ul className="tech-fx">{d.lines.map((x) => <li key={x}>{x}</li>)}</ul> : null}
      <p className={d.block ? 'di-block' : 'di-ok'}>{d.used ? 'Už využito.' : d.block || `Lze použít · ${d.cd >= 99999 ? 'jednorázově' : `obnova ${d.cd} dní`}`}</p>
    </aside>
  );
}

/** Okno Rozhodnutí (klávesa J) jako v HOI4 (UI7): kategorie jako oddíly s nadpisem a řádky; záložky nahoře filtrují (výchozí „Vše“). */
export function DecisionsPanel() {
  const state = useGameSlow((s) => s, 700);
  const me = playerIdx(state);
  const [tab, setTab] = useState('all');
  const [hover, setHover] = useState(null);
  const [shut, setShut] = useState({});
  const list = useMemo(() => (me ? decisionsOf(state, me) : []), [state.nat, state.pol, state.mil.wars, state.tick, me]);
  if (!me) return <div className="prod-screen decisions-panel"><div className="prod-body"><p className="empty">Jako pozorovatel nevedete žádná rozhodnutí.</p></div></div>;
  const pp = Math.floor(state.pol.own[me].pp);
  const cats = Object.entries(DECISION_CATS).map(([cat, name]) => ({ cat, name, items: list.filter((d) => d.cat === cat) })).filter((c) => c.items.length);
  const shown = tab === 'all' ? cats : cats.filter((c) => c.cat === tab);
  const hd = hover ? list.find((d) => d.id === hover) : null;
  return (
    <Screen cls="decisions-panel" title="Rozhodnutí" icon="gavel" head={<div className="lg-use"><span title="Politická moc"><i>Politická moc</i><b>{fmtInt(pp)}</b></span></div>}>
      <nav className="ind-tabs dec-tabs" role="tablist" aria-label="Kategorie rozhodnutí">
        <button role="tab" aria-selected={tab === 'all'} className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>Vše</button>
        {cats.map((c) => {
          const n = c.items.filter((d) => !d.block && !d.used).length;
          return <button key={c.cat} role="tab" aria-selected={tab === c.cat} className={tab === c.cat ? 'on' : ''} onClick={() => setTab(c.cat)} title={`${c.name}: ${n} k dispozici`}><Icon name={CAT_ICON[c.cat] || 'gavel'} size={14} />{c.name}{n ? <span className="dec-n">{n}</span> : null}</button>;
        })}
      </nav>
      <div className="prod-body dec-body">
        {shown.map((c) => (
          <section key={c.cat} className={`dec-sec ${shut[c.cat] ? 'shut' : ''}`} aria-label={c.name}>
            <button className="dec-sec-head" onClick={() => setShut({ ...shut, [c.cat]: !shut[c.cat] })} aria-expanded={!shut[c.cat]}>
              <Icon name={CAT_ICON[c.cat] || 'gavel'} size={18} /><b>{c.name}</b>
              <span className="muted">{c.items.filter((d) => !d.block && !d.used).length} / {c.items.length}</span>
              <Icon name="chevron" size={14} />
            </button>
            {!shut[c.cat] ? <div className="dec-rows">{c.items.map((d) => <Row key={d.id} d={d} onHover={setHover} />)}</div> : null}
          </section>
        ))}
      </div>
      <Info d={hd} />
    </Screen>
  );
}
