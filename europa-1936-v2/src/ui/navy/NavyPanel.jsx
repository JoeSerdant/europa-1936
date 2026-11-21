import { useMemo, useState } from 'react';
import { useGameSlow, useUi } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { navyOf, SHIPS, SHIP_IDS, getWorld, industryOf, NAV_MISSIONS, NAV_MISSION_IDS } from '../../engine/index.js';
import { playerIdx, newFleet, selectFleet, fleetMission, stopSelectedFleet, disbandSelectedFleet, renameSelectedFleet, selectLabel } from '../actions.js';
import { fmtInt, fmtDays } from '../format.js';
import { EquipIcon } from '../industry/EquipIcon.jsx';

// UI (jako v HOI4): lodě jako siluety s počty, mise flotily jako ikony, sestavení flotily klikáním nebo přetažením lodí z rezervy.
const MISSION_ICON = { '': 'stop', patrol: 'eye', raid: 'target', escort: 'shield' };

/** Silueta lodi s počtem (dlaždice). */
function ShipTile({ k, n, size = 40, dim = false }) {
  return (
    <span className={`ship-tile ${dim ? 'dim' : ''}`} title={`${SHIPS[k].n}: ${n}`}>
      <span className="eq-tile" style={{ '--g': '#7fb5c9', width: size, height: size }} aria-hidden="true"><EquipIcon eq={k} size={Math.round(size * 0.82)} color="var(--paper)" /></span>
      <b>{fmtInt(n)}</b>
    </span>
  );
}

function Fleet({ f, sel, home }) {
  const [name, setName] = useState(null);
  const atHome = home && f.p === home.sea;
  return (
    <article className={`fleet-card ${sel ? 'on' : ''} ${f.blocked ? 'bad' : ''}`} aria-label={f.nm}>
      <header>
        {name === null ? <button className="fl-name" onClick={() => selectFleet(sel ? 0 : f.id)} onDoubleClick={() => setName(f.nm)} title="Klik vybere, dvojklik přejmenuje"><Icon name="ship" size={16} /><b>{f.nm}</b></button>
          : <input className="fl-input" autoFocus value={name} maxLength={40} aria-label="Název flotily" onChange={(e) => setName(e.target.value)}
              onBlur={() => { if (name.trim()) { selectFleet(f.id); renameSelectedFleet(name); } setName(null); }}
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setName(null); }} />}
        <span className="fl-state" title={f.moving ? `Plují do: ${f.dest}` : `Stojí: ${f.at}`}><Icon name={f.moving ? 'speed' : 'flag'} size={13} />{f.moving ? f.dest : f.at}{f.speed ? ` · ${f.speed} km/h` : ''}</span>
      </header>
      <div className="fl-ships" aria-label="Lodě">{SHIP_IDS.filter((k) => f.ships[k]).map((k) => <ShipTile key={k} k={k} n={f.ships[k]} size={34} />)}</div>
      {f.deck ? (
        <div className={`fl-deck ${f.planes < f.deck ? 'low' : ''}`} title="Palubní letouny: první úder v bitvě a podpora bojů na pobřeží. Doplňují se z rezervy letectva v domovském přístavu.">
          <Icon name="plane" size={14} /><span className="deck-bar"><i style={{ width: `${(100 * f.planes) / f.deck}%` }} /></span><b>{f.planes}/{f.deck}</b>
        </div>
      ) : null}
      {f.blocked ? <p className="pol-block">Protivník ovládá oblast.</p> : null}
      <div className="fl-foot">
        <div className="fl-missions" role="group" aria-label="Mise flotily">
          {['', ...NAV_MISSION_IDS].map((m) => (
            <button key={m || 'none'} className={`mis-btn ${(f.m || '') === m ? 'on' : ''}`} aria-pressed={(f.m || '') === m} aria-label={m ? NAV_MISSIONS[m].n : 'Žádná'}
              onClick={() => fleetMission(f.id, m)} title={m ? `${NAV_MISSIONS[m].n}: ${NAV_MISSIONS[m].info}` : 'Žádná mise: flotila jen drží oblast.'}><Icon name={MISSION_ICON[m]} size={16} /></button>
          ))}
        </div>
        <span className="fl-acts">
          <button className="icon-btn sm" onClick={() => { selectFleet(f.id); selectLabel(f.p, true); }} title="Ukázat na mapě" aria-label="Ukázat"><Icon name="target" size={15} /></button>
          {sel ? <button className="icon-btn sm" disabled={!f.moving} onClick={stopSelectedFleet} title="Zastavit" aria-label="Zastavit"><Icon name="stop" size={15} /></button> : null}
          {sel ? <button className="icon-btn sm" disabled={!atHome} onClick={disbandSelectedFleet} title={atHome ? 'Rozpustit – lodě se vrátí do rezervy' : 'Rozpustit jde jen v domovské oblasti'} aria-label="Rozpustit"><Icon name="trash" size={15} /></button> : null}
        </span>
      </div>
      {sel ? <p className="muted fl-hint">Pravým tlačítkem na mořskou oblast pošlete flotilu na cestu.</p> : null}
    </article>
  );
}

/** Sestavení flotily: lodě z rezervy se klikem (Shift = všechny) nebo přetažením přesouvají do nové flotily; klik v nové flotile loď vrátí. */
function FormFleet({ pool }) {
  const [pick, setPick] = useState({});
  const total = SHIP_IDS.reduce((a, k) => a + (pick[k] || 0), 0);
  const add = (k, all) => setPick((p) => ({ ...p, [k]: Math.min(pool[k] || 0, all ? pool[k] || 0 : (p[k] || 0) + 1) }));
  const sub = (k) => setPick((p) => ({ ...p, [k]: Math.max(0, (p[k] || 0) - 1) }));
  const kinds = SHIP_IDS.filter((k) => k !== 'tr' && pool[k]);
  return (
    <section className="fl-form" aria-label="Nová flotila">
      <div className="fl-pool" aria-label="Rezerva lodí">
        {kinds.map((k) => {
          const left = (pool[k] || 0) - (pick[k] || 0);
          return (
            <button key={k} className="fl-pick" disabled={left < 1} draggable={left > 0} onDragStart={(e) => { e.dataTransfer.setData('text/plain', k); e.dataTransfer.effectAllowed = 'move'; }}
              onClick={(e) => add(k, e.shiftKey)} aria-label={`Přidat: ${SHIPS[k].n}`} title={`${SHIPS[k].n} – klik přidá jednu, Shift všechny, nebo přetáhněte do nové flotily. ${SHIPS[k].info || ''}`}>
              <ShipTile k={k} n={left} dim={left < 1} />
              <i>{SHIPS[k].n}</i>
            </button>
          );
        })}
      </div>
      <div className={`fl-tray ${total ? '' : 'empty'}`} aria-label="Nová flotila" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const k = e.dataTransfer.getData('text/plain'); if (SHIPS[k]) add(k, e.shiftKey); }}>
        {total ? SHIP_IDS.filter((k) => pick[k]).map((k) => (
          <button key={k} className="fl-picked" onClick={() => sub(k)} aria-label={`Ubrat: ${SHIPS[k].n}`} title="Klik vrátí loď do rezervy"><ShipTile k={k} n={pick[k]} size={34} /></button>
        )) : <span className="muted">Sem přetáhněte lodě z rezervy (nebo na ně klikněte).</span>}
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
          {nv.carrier.deck ? <span className="stat-cell" title={`Palubní letouny: ${nv.carrier.aboard} na palubách z ${nv.carrier.deck} míst, ${nv.carrier.spare} v rezervě (vyrábějte je v okně Výroba; doplňují se v domovském přístavu)`}><i>Paluby</i><b>{nv.carrier.aboard}/{nv.carrier.deck} +{fmtInt(nv.carrier.spare)}</b></span> : null}
        </div>
        <div className="fl-total" aria-label="Lodě celkem">
          {SHIP_IDS.filter((k) => nv.total[k]).map((k) => <span key={k} title={`${SHIPS[k].n}: celkem ${nv.total[k]}, v rezervě ${nv.pool[k] || 0}`}><ShipTile k={k} n={nv.total[k]} size={30} /></span>)}
        </div>
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
