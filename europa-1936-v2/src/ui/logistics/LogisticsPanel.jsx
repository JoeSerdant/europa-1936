import { useMemo } from 'react';
import { useGameSlow } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { Screen } from '../common/Screen.jsx';
import { industryOf, fuelOf, EQUIP, EQUIP_IDS, RESOURCES, RES_IDS, SHIPS, SHIP_IDS, PLANES, PLANE_IDS, transportsOf, isUnlocked, logNeed, logRatios } from '../../engine/index.js';
import { playerIdx } from '../actions.js';
import { fmtInt, fmtNum } from '../format.js';
import { EQUIP_GROUPS } from '../../data/industry/groups.js';
import { EquipIcon } from '../industry/EquipIcon.jsx';
import { ResIcon } from '../common/ResIcon.jsx';

const pct = (v) => `${Math.round(Math.max(0, v) * 100)} %`;
const groupColor = (e) => (EQUIP_GROUPS.find((g) => g.items.includes(e)) || EQUIP_GROUPS[0]).color;

function Tile({ eq, color }) {   // M104: kreslená ikona výzbroje
  return <span className="eq-tile" style={{ '--g': color, width: 48, height: 48 }} aria-hidden="true"><EquipIcon eq={eq} size={38} color="var(--paper)" /></span>;
}

/** Zásoba paliva (M73): výroba z přebytku ropy, spotřeba motorizovaných divizí, letectva a flotil. */
function FuelCard({ f }) {
  return (
    <div className={`lg-fuel${f.low ? ' bad' : ''}`} title="Palivo vzniká z přebytku ropy a z továren; spotřebují ho motorizované divize, letectvo na misích a flotily v pohybu. Bez něj zpomalují a slábnou.">
      <div className="sec-head"><h3><ResIcon r="ropa" size={20} /> Palivo</h3><b className="fuel-num">{fmtInt(f.stock)} / {fmtInt(f.cap)}</b></div>
      <span className="fuel-tank"><i style={{ width: `${Math.min(100, (f.stock / Math.max(1, f.cap)) * 100)}%` }} /><em className={f.gain >= f.use ? 'up' : 'down'}>{f.gain >= f.use ? '▲' : '▼'} {fmtNum(f.gain - f.use, 1)} / den</em></span>
      <p className="muted">Výroba {fmtNum(f.gain, 1)} − spotřeba {fmtNum(f.use, 1)} za den{f.days !== Infinity ? ` · vystačí na ${Math.max(0, Math.floor(f.days))} dní` : ''}{f.ratio < 1 ? ` · pokrytí ${pct(f.ratio)}` : ''}</p>
    </div>
  );
}

/** S6: výzbroj zásobování – lokomotivy vozí zásoby po železnici k uzlům, nákladní auta od uzlů k frontě. */
function SupplyCard({ need, have, ratio }) {
  const rows = [
    { e: 'vlaky', n: 'Lokomotivy', need: need.trains, have: have.vlaky || 0, r: ratio.tr, info: 'Vozí zásoby po železnici z hlavního města k uzlům. Bez nich dorazí k uzlům jen 60 % zásob.' },
    { e: 'auta', n: 'Nákladní auta', need: need.trucks, have: have.auta || 0, r: ratio.tk, info: 'Rozvážejí zásoby od uzlů a hlavního města k divizím. Bez nich zásoby se vzdáleností slábnou rychleji.' },
  ];
  return (
    <div className="lg-sup">
      <div className="sec-head"><h3><Icon name="supply" size={18} /> Zásobování</h3><span className="muted">sklad / potřeba</span></div>
      {rows.map((x) => (
        <div key={x.e} className={`lg-sup-row${x.r < 0.999 ? ' bad' : ''}`} title={`${x.info} Za války se denně část opotřebuje.`}>
          <Tile eq={x.e} color={groupColor(x.e)} />
          <span className="nm">{x.n}</span>
          <b>{fmtInt(x.have)} / {fmtInt(x.need)}</b>
          <span className="bar prog"><i style={{ width: `${Math.min(100, x.r * 100)}%` }} /></span>
        </div>
      ))}
    </div>
  );
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
        <span title="Volné / všechny transportní lodě; konvoje obchodu zabírají lodě"><i>Transporty</i><b>{tr.free}/{tr.total}</b><i>{tr.convoys} konvojů</i></span>
      </div>
    )}>
      <div className="prod-body">
        <div className="prod-cols">
          <div className="prod-left">
            <div className="sec-head"><h3>Výzbroj a lodě</h3><span className="muted">sklad · výroba za den · efektivita linek</span></div>
            {EQUIP_GROUPS.map((g) => {
              const items = rows.filter((r) => g.items.includes(r.e));
              if (!items.length) return null;
              const top = Math.max(1, ...items.map((r) => r.have));
              return (
                <section key={g.id} className="lg-group" style={{ '--g': g.color }} aria-label={g.n}>
                  <h4>{g.n}</h4>
                  <div className="lg-tiles">
                    {items.map((r) => (
                      <div key={r.e} className={`lg-tile ${r.lack ? 'bad' : ''} ${r.lines ? '' : 'idle'}`} role="group" aria-label={r.n}
                        title={`${r.n}: sklad ${fmtInt(r.have)}${r.lines ? `, ${fmtNum(r.day, 1)} za den na ${r.lines} ${r.lines === 1 ? 'lince' : 'linkách'} (${r.fac} továren), efektivita ${pct(r.eff)}` : ', nevyrábí se'}${r.lack ? ' – chybí suroviny' : ''}`}>
                        <Tile eq={r.e} color={r.color} />
                        <span className="lt-nm">{r.n}</span>
                        <b className="lt-have">{fmtInt(r.have)}</b>
                        <span className="lt-bar"><i style={{ width: `${(100 * r.have) / top}%` }} /></span>
                        <span className="lt-foot">
                          {r.lines ? <><i className="up">▲ {fmtNum(r.day, 1)}</i><i className="fac" title="Továrny na linkách"><Icon name="industry" size={12} />{r.fac}</i><span className="lt-eff" title={`Efektivita ${pct(r.eff)}`}><i style={{ width: `${Math.min(100, r.eff * 100)}%` }} /></span></> : <i className="muted">nevyrábí se</i>}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
          <aside className="prod-right">
            <div className="sec-head"><h3>Suroviny</h3><span className="muted">bilance za den</span></div>
            <div className="lg-res">
              {RES_IDS.map((r) => {
                const x = sum.res[r] || { ext: 0, imp: 0, exp: 0, dem: 0 };
                const bal = x.ext + x.imp - x.exp - x.dem;
                return (
                  <span key={r} className={`lg-res-tile ${bal < -0.05 ? 'bad' : ''}`} title={`${RESOURCES[r].n}: těžba ${fmtNum(x.ext, 1)} + dovoz ${fmtNum(x.imp, 1)} − vývoz ${fmtNum(x.exp, 1)} − potřeba ${fmtNum(x.dem, 1)}`}>
                    <ResIcon r={r} size={26} /><span className="nm">{RESOURCES[r].n}</span><b>{bal > 0 ? '+' : ''}{fmtNum(bal, 1)}</b>
                  </span>
                );
              })}
            </div>
            <FuelCard f={fuelOf(state, me)} />
            <SupplyCard need={logNeed(state.mil, me)} have={stock} ratio={logRatios(state, me)} />
            <p className="muted">Zelená bilance znamená přebytek, červená nedostatek: linky pak vyrábějí pomaleji. Chybějící suroviny doplníte v okně Obchod (R).</p>
          </aside>
        </div>
      </div>
    </Screen>
  );
}
