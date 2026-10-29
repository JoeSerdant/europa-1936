import { useMemo, useState } from 'react';
import { useUi, useGameSlow } from '../store.js';
import { Flag } from '../common/Flag.jsx';
import { Icon } from '../common/Icon.jsx';
import { countryTable, getWorld, STAT_METRICS, seriesOf, topBy } from '../../engine/index.js';
import { closeOverview, selectCountryCapital } from '../actions.js';
import { fmtInt, fmtPop } from '../format.js';

/** Okno Přehled zemí: pořadí podle vítězných bodů, síly a stav všech zemí; klik ukáže hlavní město. */
export function OverviewDialog() {
  const open = useUi((s) => s.overview);
  const state = useGameSlow((s) => s, 900);
  const rows = useMemo(() => (open ? countryTable(state) : []), [open, state.tick, state.dip, state.mil.wars, state.stateOwner]);
  const [tab, setTab] = useState('rank');
  if (!open) return null;
  const w = getWorld();
  return (
    <div className="scrim" onClick={closeOverview}>
      <div className="panel dialog wide overview-dialog" role="dialog" aria-label="Přehled zemí" onClick={(e) => e.stopPropagation()}>
        <header className="sv-head"><h2>Přehled zemí</h2><button className="icon-btn" onClick={closeOverview} aria-label="Zavřít" title="Zavřít (Esc)"><Icon name="close" size={18} /></button></header>
        <nav className="ov-tabs" role="tablist" aria-label="Přehled">
          <button role="tab" aria-selected={tab === 'rank'} className={`tab ${tab === 'rank' ? 'on' : ''}`} onClick={() => setTab('rank')}>Pořadí</button>
          <button role="tab" aria-selected={tab === 'graf'} className={`tab ${tab === 'graf' ? 'on' : ''}`} onClick={() => setTab('graf')}>Grafy</button>
        </nav>
        {tab === 'graf' ? <Charts state={state} /> : <div className="ov-scroll">
          <table className="ov-table">
            <thead><tr><th>#</th><th>Země</th><th title="Vítězné body">VB</th><th title="Obyvatelé">Obyv.</th><th title="Divize">Div.</th><th title="Továrny civilní + vojenské">Tov.</th><th title="Stabilita">Stab.</th><th>Stav</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.o} className={`${r.player ? 'me' : ''} ${r.war ? 'war' : ''}`} onClick={() => selectCountryCapital(r.o)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') selectCountryCapital(r.o); }}>
                  <td>{i + 1}</td>
                  <td className="nm"><Flag tag={r.tag} width={20} />{w.owners[r.o].name}{r.faction ? <i title={r.faction}>{r.faction}</i> : null}</td>
                  <td>{fmtInt(r.vp)}</td><td>{fmtPop(r.pop)}</td><td>{fmtInt(r.divs)}</td><td>{r.civ}+{r.mil}</td><td>{Math.round(r.stab * 100)} %</td>
                  <td>{r.cap ? 'kapitulovala' : r.war ? 'válka' : 'mír'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </div>
    </div>
  );
}

const COLORS = ['#e6b422', '#d9534f', '#4aa3df', '#5cb85c', '#b07cd8', '#e8833a', '#8fd3c7', '#c0c0c0'];

/** Čárový graf měsíčních snímků: vybraná metrika, nejlepších 6 zemí a země hráče. */
function Charts({ state }) {
  const [metric, setMetric] = useState('vp');
  const w = getWorld();
  const me = state.player ? w.ownerIdx[state.player] : 0;
  const owners = useMemo(() => { const t = topBy(state, metric, 6); return me && !t.includes(me) ? [...t, me] : t; }, [state.stat, metric, me]);
  const lines = owners.map((o) => seriesOf(state, metric, o));
  const t0 = state.stat.t[0] ?? 0, t1 = Math.max(state.stat.t[state.stat.t.length - 1] ?? 1, t0 + 1);
  const vmax = Math.max(1, ...lines.flat().map((p) => p.v));
  const W = 640, H = 260, X0 = 46, Y0 = 12;
  const x = (t) => X0 + ((t - t0) / (t1 - t0)) * (W - X0 - 10);
  const y = (v) => H - 24 - (v / vmax) * (H - 24 - Y0);
  const yr = (t) => 1936 + Math.floor(t / (24 * 365));
  return (
    <div className="ov-charts">
      <div className="ov-metrics" role="group" aria-label="Ukazatel">
        {STAT_METRICS.map((m) => <button key={m.id} className={`tab ${metric === m.id ? 'on' : ''}`} aria-pressed={metric === m.id} onClick={() => setMetric(m.id)}>{m.name}</button>)}
      </div>
      {state.stat.t.length < 2 ? <p className="muted">Zatím je jen jeden snímek – další přibývá každých 30 herních dní.</p> : (
        <svg viewBox={`0 0 ${W} ${H}`} className="ov-svg" role="img" aria-label="Vývoj ukazatele v čase">
          {[0, 0.5, 1].map((f) => <g key={f}><line x1={X0} x2={W - 10} y1={y(vmax * f)} y2={y(vmax * f)} stroke="currentColor" opacity="0.15" /><text x={X0 - 6} y={y(vmax * f) + 4} textAnchor="end" fontSize="11" fill="currentColor">{fmtInt(Math.round(vmax * f))}</text></g>)}
          {Array.from({ length: yr(t1) - yr(t0) + 1 }, (_, i) => yr(t0) + i).map((yy) => { const t = (yy - 1936) * 24 * 365; return t >= t0 && t <= t1 ? <text key={yy} x={x(t)} y={H - 6} fontSize="11" textAnchor="middle" fill="currentColor">{yy}</text> : null; })}
          {lines.map((l, i) => <polyline key={owners[i]} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth={owners[i] === me ? 3 : 1.8} points={l.map((p) => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')} />)}
        </svg>
      )}
      <ul className="ov-legend">
        {owners.map((o, i) => <li key={o}><i style={{ background: COLORS[i % COLORS.length] }} />{w.owners[o].name}{o === me ? ' (vy)' : ''}</li>)}
      </ul>
    </div>
  );
}
