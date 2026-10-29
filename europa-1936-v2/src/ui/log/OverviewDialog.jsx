import { useMemo } from 'react';
import { useUi, useGameSlow } from '../store.js';
import { Flag } from '../common/Flag.jsx';
import { Icon } from '../common/Icon.jsx';
import { countryTable, getWorld } from '../../engine/index.js';
import { closeOverview, selectCountryCapital } from '../actions.js';
import { fmtInt, fmtPop } from '../format.js';

/** Okno Přehled zemí: pořadí podle vítězných bodů, síly a stav všech zemí; klik ukáže hlavní město. */
export function OverviewDialog() {
  const open = useUi((s) => s.overview);
  const state = useGameSlow((s) => s, 900);
  const rows = useMemo(() => (open ? countryTable(state) : []), [open, state.tick, state.dip, state.mil.wars, state.stateOwner]);
  if (!open) return null;
  const w = getWorld();
  return (
    <div className="scrim" onClick={closeOverview}>
      <div className="panel dialog wide overview-dialog" role="dialog" aria-label="Přehled zemí" onClick={(e) => e.stopPropagation()}>
        <header className="sv-head"><h2>Přehled zemí</h2><button className="icon-btn" onClick={closeOverview} aria-label="Zavřít" title="Zavřít (Esc)"><Icon name="close" size={18} /></button></header>
        <div className="ov-scroll">
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
        </div>
      </div>
    </div>
  );
}
