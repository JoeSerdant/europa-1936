import { useMemo, useState } from 'react';
import { useGameSlow, useUi } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { navyOf, SHIPS, SHIP_IDS, getWorld, industryOf } from '../../engine/index.js';
import { playerIdx, newFleet, selectFleet, stopSelectedFleet, disbandSelectedFleet, renameSelectedFleet, selectLabel } from '../actions.js';
import { fmtInt, fmtDays } from '../format.js';

const shipsText = (ships) => SHIP_IDS.filter((k) => ships[k]).map((k) => `${ships[k]}× ${SHIPS[k].ab}`).join(' ');

function Fleet({ f, sel, home }) {
  const [name, setName] = useState(null);
  const atHome = home && f.p === home.sea;
  return (
    <article className={`fleet-card ${sel ? 'on' : ''} ${f.blocked ? 'bad' : ''}`} aria-label={f.nm}>
      <header>
        {name === null ? <button className="fl-name" onClick={() => selectFleet(sel ? 0 : f.id)} onDoubleClick={() => setName(f.nm)} title="Klik vybere, dvojklik přejmenuje"><b>{f.nm}</b></button>
          : <input className="fl-input" autoFocus value={name} maxLength={40} aria-label="Název flotily" onChange={(e) => setName(e.target.value)}
              onBlur={() => { if (name.trim()) { selectFleet(f.id); renameSelectedFleet(name); } setName(null); }}
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setName(null); }} />}
        <span className="muted">{f.count} lodí</span>
      </header>
      <p className="fl-ships">{shipsText(f.ships)}</p>
      <p className="muted">{f.moving ? `Plují do: ${f.dest}` : `Stojí: ${f.at}`}{f.speed ? ` · ${f.speed} km/h` : ''}{f.blocked ? ' · protivník ovládá oblast' : ''}</p>
      <div className="ind-btns">
        <button className="sbtn" onClick={() => { selectFleet(f.id); selectLabel(f.p, true); }} title="Ukázat na mapě"><Icon name="target" size={14} />Ukázat</button>
        {sel ? <button className="sbtn" disabled={!f.moving} onClick={stopSelectedFleet}>Zastavit</button> : null}
        {sel ? <button className="sbtn" disabled={!atHome} onClick={disbandSelectedFleet} title={atHome ? 'Lodě se vrátí do rezervy' : 'Rozpustit jde jen v domovské oblasti'}>Rozpustit</button> : null}
      </div>
      {sel ? <p className="muted">Pravým tlačítkem na mořskou oblast pošlete flotilu na cestu.</p> : null}
    </article>
  );
}

function FormFleet({ pool }) {
  const [pick, setPick] = useState({});
  const total = SHIP_IDS.reduce((a, k) => a + (pick[k] || 0), 0);
  return (
    <section className="ind-new" aria-label="Nová flotila">
      <div className="fl-form">
        {SHIP_IDS.filter((k) => k !== 'tr').map((k) => (
          <label key={k} className="fl-pick" title={SHIPS[k].info}>
            <span>{SHIPS[k].n}</span>
            <input type="number" min="0" max={pool[k] || 0} value={pick[k] || 0} disabled={!pool[k]} aria-label={`Počet: ${SHIPS[k].n}`}
              onChange={(e) => setPick({ ...pick, [k]: Math.max(0, Math.min(pool[k] || 0, Number(e.target.value) || 0)) })} onKeyDown={(e) => e.stopPropagation()} />
            <i>z {pool[k] || 0}</i>
          </label>
        ))}
      </div>
      <button className="sbtn primary" disabled={total < 1} onClick={() => { if (newFleet(pick)) setPick({}); }}>Sestavit flotilu ({total})</button>
    </section>
  );
}

/** Záložka Námořnictvo: rezerva lodí, flotily (výběr, zastavení, rozpuštění, přejmenování), sestavení nové flotily a divize na moři. */
export function NavyPanel() {
  const state = useGameSlow((s) => s, 600);
  const sel = useUi((s) => s.fleetSel);
  const me = playerIdx(state);
  const nv = useMemo(() => (me ? navyOf(state, me) : null), [state.nav, state.tick, me]);
  const ind = useMemo(() => (me ? industryOf(state, me) : null), [state.ind, me]);
  if (!me) return <div className="recruit-panel"><p className="empty">Jako pozorovatel nevedete žádné námořnictvo.</p></div>;
  const mineBattle = nv.fleets.some((f) => f.blocked);
  return (
    <div className="recruit-panel navy-panel">
      <section className="rs-head" aria-label="Souhrn námořnictva">
        <div className="rs-sum">
          <span className="stat-cell" title="Transportní lodě: volné / celkem"><i>Transporty</i><b>{nv.transports.free}/{nv.transports.total}</b></span>
          <span className="stat-cell" title="Námořní loděnice"><i>Loděnice</i><b>{ind.dok}</b></span>
          <span className="stat-cell" title="Volné loděnice bez lodní linky"><i>Volné</i><b>{ind.dockFree}</b></span>
        </div>
        <ul className="eq">
          {SHIP_IDS.map((k) => <li key={k} title={`${SHIPS[k].n}: celkem ${nv.total[k]}, v rezervě ${nv.pool[k] || 0}`}><i>{SHIPS[k].ab}</i><b>{fmtInt(nv.total[k])}</b></li>)}
        </ul>
        <p className="muted pol-sum">{nv.home ? `Domovský přístav: ${getWorld().provName(nv.home.prov)} (${nv.home.name}).` : 'Žádný přístav – nelze sestavit flotilu.'}{mineBattle ? ' Pozor: některá flotila stojí v oblasti ovládané nepřítelem.' : ''}</p>
      </section>
      <div className="side-scroll">
        <div className="sec-head"><h3>Flotily{nv.fleets.length ? ` (${nv.fleets.length})` : ''}</h3></div>
        {!nv.fleets.length ? <p className="empty">Žádná flotila. Sestavte ji z lodí v rezervě.</p> : nv.fleets.map((f) => <Fleet key={f.id} f={f} sel={sel === f.id} home={nv.home} />)}
        {SHIP_IDS.some((k) => k !== 'tr' && nv.pool[k]) ? (<><div className="sec-head"><h3>Nová flotila</h3></div><FormFleet pool={nv.pool} /></>) : null}
        {nv.sail.length ? (
          <>
            <div className="sec-head"><h3>Divize na moři ({nv.sail.length})</h3></div>
            <ul className="queue">
              {nv.sail.map((s) => (
                <li key={s.id}><div className="q-top"><b>{s.div.nm || `Divize ${s.id}`}</b><span className="muted">{getWorld().provName(s.from)} → {getWorld().provName(s.to)} · za {fmtDays(Math.ceil(s.left / 24))}</span></div></li>
              ))}
            </ul>
          </>
        ) : null}
        <p className="muted nav-hint">Divize ve vlastním přístavu: vyberte je a pravým tlačítkem klikněte na pobřežní provincii za mořem. Každá zabere jednu transportní loď.</p>
      </div>
    </div>
  );
}
