import { ACE_NAMES } from '../../engine/air/constants.js';
import { useMemo, useState } from 'react';
import { useGameSlow } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { Screen } from '../common/Screen.jsx';
import { airOf, targetsFor, missionBlock, getWorld, PLANES, PLANE_IDS, AIR, afbOf, planesAt } from '../../engine/index.js';
import { playerIdx, formAirWing, disbandAirWing, reinforceAirWing, setAirMission, selectLabel } from '../actions.js';
import { fmtInt } from '../format.js';

const MISSIONS = { air: 'Hlídky', cas: 'Podpora boje', bomb: 'Bombardování' };
const stateName = (s) => getWorld().states[s].n;
const COLOR = { sti: '#7fb5c9', bit: '#d6b55c', tac: '#d9533a', str: '#b86dd1' };

function Tile({ t, size = 52 }) {
  return <span className="eq-tile" style={{ '--g': COLOR[t], width: size, height: size }} aria-hidden="true"><b>{PLANES[t].ab}</b></span>;
}

function Wing({ wg, state }) {
  const P = PLANES[wg.t];
  const roles = P.roles;
  const m = wg.m || '';
  const targets = useMemo(() => (m ? targetsFor(state, wg.id, m) : []), [state.air, state.mil.wars, state.stateOwner, wg.id, m]);
  const choose = (mission) => {
    if (!mission) { setAirMission(wg.id, null, 0); return; }
    const list = targetsFor(state, wg.id, mission);
    const pick = mission === 'air' ? (list.find((x) => x.s === wg.s) || list[0]) : list.find((x) => state.stateOwner[x.s] !== state.stateOwner[wg.s]) || list[0];
    if (pick) setAirMission(wg.id, mission, pick.s);
  };
  const free = Math.min(state.air.pool[wg.o][wg.t] || 0, Math.max(0, afbOf(state.ind, wg.s) * AIR.PER_LEVEL - planesAt(state, wg.o).get(wg.s)));
  return (
    <article className="air-wing" aria-label={`Křídlo ${P.n}`}>
      <Tile t={wg.t} />
      <div className="aw-main">
        <b>{P.n}</b>{wg.a > 0 ? <i className="aw-ace" title="Bonus síly hlídek">{ACE_NAMES[wg.a]}</i> : null}
        <span className="muted">základna {stateName(wg.s)} · dolet {P.range} km</span>
      </div>
      <div className="aw-n" title="Počet letadel"><b>{fmtInt(wg.n)}</b><i>letadel</i></div>
      <div className="aw-mission">
        <select value={m} onChange={(e) => choose(e.target.value)} aria-label="Mise">
          <option value="">Klid na základně</option>
          {roles.map((r) => <option key={r} value={r}>{MISSIONS[r]}</option>)}
        </select>
        {m ? (
          <select value={wg.to} onChange={(e) => setAirMission(wg.id, m, Number(e.target.value))} aria-label="Cílový stát">
            {targets.map((x) => <option key={x.s} value={x.s}>{stateName(x.s)} · {x.km} km</option>)}
            {!targets.some((x) => x.s === wg.to) && <option value={wg.to}>{stateName(wg.to)}</option>}
          </select>
        ) : <span className="muted">Vyberte misi.</span>}
      </div>
      <div className="aw-btns">
        <button className="sbtn" disabled={free < 1} onClick={() => reinforceAirWing(wg.id, Math.min(10, free))} title="Doplnit z rezervy (až 10)"><Icon name="plus" size={14} />10</button>
        <button className="icon-btn sm" onClick={() => selectLabel(getWorld().states[wg.s].cap, true)} aria-label="Ukázat základnu" title="Ukázat základnu"><Icon name="target" size={14} /></button>
        <button className="icon-btn sm" onClick={() => disbandAirWing(wg.id)} aria-label={`Rozpustit křídlo ${P.n}`} title="Rozpustit (letadla se vrátí do rezervy)"><Icon name="trash" size={14} /></button>
      </div>
      {wg.m && missionBlock(state, wg.id, wg.m, wg.to) ? <p className="pol-block">{missionBlock(state, wg.id, wg.m, wg.to)}</p> : null}
    </article>
  );
}

function NewWing({ a }) {
  const types = a.types.filter((t) => (a.pool[t] || 0) > 0);
  const [t, setT] = useState('');
  const [n, setN] = useState(20);
  const [base, setBase] = useState(0);
  const type = types.includes(t) ? t : types[0];
  const bases = a.bases.filter((b) => b.free > 0);
  const b = bases.find((x) => x.s === base) || bases.sort((x, y) => y.free - x.free)[0];
  const max = type && b ? Math.min(a.pool[type], b.free, AIR.FORM_MAX) : 0;
  const cnt = Math.max(1, Math.min(n, max || 1));
  return (
    <section className="air-new" aria-label="Nové křídlo">
      <div className="sec-head"><h3>Nové křídlo</h3><span className="muted">z rezervy</span></div>
      {!types.length ? <p className="muted">V rezervě nejsou letadla. Vyrobíte je na linkách v okně Výroba (Y).</p> : !bases.length ? <p className="muted">Žádné letiště s volným místem. Postavte letiště v okně Stavby (T).</p> : (
        <div className="an-form">
          <label><span>Typ</span><select value={type} onChange={(e) => setT(e.target.value)} aria-label="Typ letadel">{types.map((x) => <option key={x} value={x}>{PLANES[x].n} ({fmtInt(a.pool[x])})</option>)}</select></label>
          <label><span>Základna</span><select value={b.s} onChange={(e) => setBase(Number(e.target.value))} aria-label="Letiště">{bases.map((x) => <option key={x.s} value={x.s}>{stateName(x.s)} · volno {x.free}</option>)}</select></label>
          <label><span>Počet</span><input type="number" min="1" max={max} value={cnt} onChange={(e) => setN(Number(e.target.value))} aria-label="Počet letadel" /></label>
          <button className="sbtn primary" disabled={!max} onClick={() => formAirWing(type, cnt, b.s)}>Sestavit křídlo ({cnt})</button>
        </div>
      )}
    </section>
  );
}

/** Okno Letectvo (klávesa A): křídla s misemi, rezerva, letiště. */
export function AirPanel() {
  const state = useGameSlow((s) => s, 600);
  const me = playerIdx(state);
  const a = useMemo(() => (me ? airOf(state, me) : null), [state.air, state.stateOwner, state.ctrl, state.ind, state.tech, me]);
  if (!me) return <div className="prod-screen air-panel"><div className="prod-body"><p className="empty">Jako pozorovatel nevedete žádné letectvo.</p></div></div>;
  return (
    <Screen cls="air-panel" title="Letectvo" icon="air" head={(
      <div className="lg-use">
        <span title="Všechna letadla"><i>Letadel</i><b>{fmtInt(a.total)}</b></span>
        <span title="Letadla v křídlech / kapacita letišť"><i>Letiště</i><b>{fmtInt(a.used)} / {fmtInt(a.cap)}</b></span>
        <span title="Letadla v rezervě (nezařazená)"><i>Rezerva</i><b>{fmtInt(a.total - a.used)}</b></span>
      </div>
    )}>
      <div className="prod-body">
        <div className="prod-cols">
          <div className="prod-left">
            <div className="sec-head"><h3>Letecká křídla ({a.wings.length})</h3><span className="muted">mise se vyhodnocují o půlnoci</span></div>
            {!a.wings.length ? <p className="empty">Žádná křídla. Sestavte je vpravo z rezervy letadel.</p> : a.wings.map((wg) => <Wing key={wg.id} wg={wg} state={state} />)}
          </div>
          <aside className="prod-right">
            <NewWing a={a} />
            <div className="sec-head"><h3>Rezerva</h3></div>
            <ul className="eq">{PLANE_IDS.filter((t) => a.types.includes(t) || a.pool[t]).map((t) => <li key={t} title={PLANES[t].n}><i>{PLANES[t].ab}</i><b>{fmtInt(a.pool[t] || 0)}</b></li>)}</ul>
            <div className="sec-head"><h3>Letiště ({a.bases.length})</h3><span className="muted">{AIR.PER_LEVEL} letadel na úroveň</span></div>
            <ul className="air-bases">
              {a.bases.map((x) => (
                <li key={x.s}><button className="ab-row" onClick={() => selectLabel(getWorld().states[x.s].cap, true)} title="Ukázat na mapě">
                  <span className="nm">{stateName(x.s)}</span><i>úroveň {x.lvl}</i><span className="bar prog"><i style={{ width: `${(x.used / x.cap) * 100}%` }} /></span><b>{x.used}/{x.cap}</b>
                </button></li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </Screen>
  );
}
