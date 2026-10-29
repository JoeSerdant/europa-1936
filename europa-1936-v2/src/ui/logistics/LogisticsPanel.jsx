import { useMemo } from 'react';
import { useGameSlow } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { Screen } from '../common/Screen.jsx';
import { industryOf, EQUIP, EQUIP_IDS, RESOURCES, RES_IDS, SHIPS, SHIP_IDS, PLANES, PLANE_IDS, transportsOf, isUnlocked } from '../../engine/index.js';
import { playerIdx } from '../actions.js';
import { fmtInt, fmtNum } from '../format.js';
import { EQUIP_GROUPS } from '../../data/industry/groups.js';

const pct = (v) => `${Math.round(Math.max(0, v) * 100)} %`;
const groupColor = (e) => (EQUIP_GROUPS.find((g) => g.items.includes(e)) || EQUIP_GROUPS[0]).color;

function Tile({ ab, color }) {
  return <span className="eq-tile" style={{ '--g': color, width: 38, height: 38 }} aria-hidden="true"><b>{ab}</b></span>;
}

/** Okno Logistika (I): přehled výzbroje (výroba za den, efektivita, sklad), loděnic, transportů a bilance surovin. */
export function LogisticsPanel() {
  const state = useGameSlow((s) => s, 700);
  const me = playerIdx(state);
  const sum = useMemo(() => (me ? industryOf(state, me) : null), [state.ind, state.ctrl, state.stateOwner, me]);
  if (!me) return <div className="prod-screen logistics-panel"><div className="prod-body"><p className="empty">Jako pozorovatel nevedete žádnou logistiku.</p></div></div>;
  const stock = state.mil.stock[me] || {};
  const pool = (state.nav && state.nav.pool[me]) || {};
  const rows = [];
  for (const e of EQUIP_IDS) {
    const lines = sum.lines.filter((l) => l.eq === e);
    if (!lines.length && !(stock[e] > 0) && !isUnlocked(state, me, EQUIP[e].unlock)) continue;
    rows.push({ e, n: EQUIP[e].n, ab: EQUIP[e].ab, color: groupColor(e), lines: lines.length, fac: lines.reduce((a, l) => a + l.fac, 0), day: lines.reduce((a, l) => a + l.perDay, 0), eff: lines.length ? lines.reduce((a, l) => a + l.eff * l.fac, 0) / Math.max(1, lines.reduce((a, l) => a + l.fac, 0)) : 0, have: stock[e] || 0, lack: lines.some((l) => l.f < 0.999) });
  }
  for (const e of SHIP_IDS) {
    const lines = sum.lines.filter((l) => l.eq === e);
    if (!lines.length && !(pool[e] > 0)) continue;
    rows.push({ e, n: SHIPS[e].n, ab: SHIPS[e].ab, color: groupColor(e), lines: lines.length, fac: lines.reduce((a, l) => a + l.fac, 0), day: lines.reduce((a, l) => a + l.perDay, 0), eff: lines.length ? lines.reduce((a, l) => a + l.eff * l.fac, 0) / Math.max(1, lines.reduce((a, l) => a + l.fac, 0)) : 0, have: pool[e] || 0, lack: lines.some((l) => l.f < 0.999) });
  }
  const apool = state.air.pool[me] || {};
  const inWings = {};
  for (const wg of state.air.wings) if (wg && wg.o === me) inWings[wg.t] = (inWings[wg.t] || 0) + wg.n;
  for (const e of PLANE_IDS) {
    const lines = sum.lines.filter((l) => l.eq === e);
    const have = (apool[e] || 0) + (inWings[e] || 0);
    if (!lines.length && !have) continue;
    rows.push({ e, n: PLANES[e].n, ab: PLANES[e].ab, color: groupColor(e), lines: lines.length, fac: lines.reduce((a, l) => a + l.fac, 0), day: lines.reduce((a, l) => a + l.perDay, 0), eff: lines.length ? lines.reduce((a, l) => a + l.eff * l.fac, 0) / Math.max(1, lines.reduce((a, l) => a + l.fac, 0)) : 0, have, lack: lines.some((l) => l.f < 0.999) });
  }
  const tr = transportsOf(state, me);
  const milUse = sum.milAvail > 0 ? Math.min(1, sum.milUsed / sum.milAvail) : 0;
  const dockUse = sum.dok > 0 ? Math.min(1, sum.dockUsed / sum.dok) : 0;
  return (
    <Screen cls="logistics-panel" title="Logistika" icon="supply" head={(
      <div className="lg-use">
        <span title="Podíl využitých vojenských továren"><i>Vojenské továrny</i><span className="bar prog"><i style={{ width: `${milUse * 100}%` }} /></span><b>{pct(milUse)}</b></span>
        <span title="Podíl využitých loděnic"><i>Loděnice</i><span className="bar prog"><i style={{ width: `${dockUse * 100}%` }} /></span><b>{sum.dok ? pct(dockUse) : '–'}</b></span>
        <span title="Volné / všechny transportní lodě"><i>Transporty</i><b>{tr.free}/{tr.total}</b></span>
      </div>
    )}>
      <div className="prod-body">
        <div className="prod-cols">
          <div className="prod-left">
            <div className="sec-head"><h3>Výzbroj a lodě</h3><span className="muted">výroba za den, efektivita, sklad</span></div>
            <table className="lg-table" aria-label="Výzbroj">
              <thead><tr><th></th><th>Druh</th><th title="Linek / továren">Linky</th><th title="Průměrná efektivita linek">Efekt.</th><th title="Kusů za den">Za den</th><th>Sklad</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.e} className={r.lack ? 'bad' : ''}>
                    <td><Tile ab={r.ab} color={r.color} /></td>
                    <th scope="row">{r.n}</th>
                    <td>{r.lines ? `${r.lines} / ${r.fac}` : '–'}</td>
                    <td>{r.lines ? <span className="bar prog"><i style={{ width: `${Math.min(100, r.eff * 100)}%` }} /></span> : '–'}</td>
                    <td>{r.lines ? fmtNum(r.day, 1) : '–'}</td>
                    <td className="have">{fmtInt(r.have)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <aside className="prod-right">
            <div className="sec-head"><h3>Suroviny</h3><span className="muted">bilance za den</span></div>
            <ul className="lg-res">
              {RES_IDS.map((r) => {
                const x = sum.res[r] || { ext: 0, imp: 0, exp: 0, dem: 0 };
                const bal = x.ext + x.imp - x.exp - x.dem;
                return (
                  <li key={r} className={bal < -0.05 ? 'bad' : ''} title={`Těžba ${fmtNum(x.ext, 1)} + dovoz ${fmtNum(x.imp, 1)} − vývoz ${fmtNum(x.exp, 1)} − potřeba ${fmtNum(x.dem, 1)}`}>
                    <span className="ab">{RESOURCES[r].ab}</span><span className="nm">{RESOURCES[r].n}</span><b>{bal > 0 ? '+' : ''}{fmtNum(bal, 1)}</b>
                  </li>
                );
              })}
            </ul>
            <p className="muted">Zelená bilance znamená přebytek, červená nedostatek: linky pak vyrábějí pomaleji. Chybějící suroviny doplníte v okně Obchod (R).</p>
          </aside>
        </div>
      </div>
    </Screen>
  );
}
