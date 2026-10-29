import { useMemo, useState } from 'react';
import { useGameSlow, useUi } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import {
  getWorld, industryOf, stateIndustry, projectEta, allCountries, countryName, slotsUsed, slotsOf, atWar,
  BUILDINGS, BUILDING_IDS, producibleEquip, EQUIP, EQUIP_PROD, RESOURCES, RES_IDS, IND, SHIPS, SHIP_IDS, PLANES, PLANE_IDS, isUnlocked,
} from '../../engine/index.js';
import {
  playerIdx, closeSide, setIndTab, buildIn, cancelProject, moveProject, newLine, setLineFac, setLineEq, newTrade, changeTrade, dropTrade, selectLabel,
} from '../actions.js';
import { fmtInt, fmtNum, fmtDays } from '../format.js';
import { EQUIP_GROUPS } from '../../data/industry/groups.js';

const TABS = [
  { id: 'build', name: 'Stavby' },
  { id: 'prod', name: 'Výroba' },
  { id: 'trade', name: 'Obchod' },
];
const pct = (v) => `${Math.round(Math.max(0, v) * 100)} %`;
const stateName = (s) => getWorld().states[s].n;

function Sum({ label, value, title, cls }) {
  return <span className={`stat-cell ${cls || ''}`} title={title}><i>{label}</i><b>{value}</b></span>;
}

function Header({ sum }) {
  return (
    <section className="ind-sum" aria-label="Souhrn průmyslu">
      <Sum label="Civilní" value={sum.civ} title="Civilní továrny celkem" />
      <Sum label="Vojenské" value={sum.mil} title="Vojenské továrny celkem" />
      <Sum label="Spotř. zboží" value={pct(sum.cons)} title={`Spotřební zboží ubírá ${fmtNum(sum.consFac, 1)} továren (nejdřív civilních)`} />
      <Sum label="Body stavby" value={fmtNum(sum.points, 0)} title="Body stavby za den (civilní továrny po odečtení spotřebního zboží a dovozu)" />
      {sum.dok > 0 && <Sum label="Loděnice" value={sum.dok} title={`Námořní loděnice (volné: ${sum.dockFree})`} />}
      <Sum label="Volné" value={sum.milFree} title="Volné vojenské továrny: nejsou přiřazené žádné lince" cls={sum.milFree > 0 ? 'warn' : ''} />
    </section>
  );
}

// ------------------------------------------------------------------ stavby
function StatesList({ state, states, sel, setPick }) {
  return (
    <div className="st-list" role="listbox" aria-label="Státy">
      <div className="st-row st-head"><span>Stát</span><span title="Obsazené sloty / všechny sloty">Sloty</span><span title="Civilní továrny">Civ.</span><span title="Vojenské továrny">Voj.</span><span title="Loděnice">Děl.</span><span title="Infrastruktura">Inf.</span></div>
      {states.map((s) => {
        const i = stateIndustry(state, s);
        return (
          <button key={s} role="option" aria-selected={s === sel} className={`st-row ${s === sel ? 'on' : ''} ${i.used >= i.slots ? 'full' : ''}`} onClick={() => setPick(s)}>
            <span className="nm">{stateName(s)}</span>
            <span className="sl"><span className="bar prog"><i style={{ width: `${i.slots ? Math.min(100, (i.used / i.slots) * 100) : 0}%` }} /></span>{i.used}/{i.slots}</span>
            <span>{i.civ}</span><span>{i.mil}</span><span>{i.port ? i.dok : '–'}</span><span>+{i.inf}</span>
          </button>
        );
      })}
    </div>
  );
}

function NewBuild({ state, sel, info }) {
  if (!sel) return null;
  return (
    <section className="ind-new" aria-label="Nová stavba">
      <div className="sec-head"><h3>{stateName(sel)}</h3><span className="muted">{info.cat.n}</span></div>
      <p className="muted">Sloty {info.used}/{info.slots} · továrny {info.civ} civ. + {info.mil} vojen. · infrastruktura +{info.inf}</p>
      <div className="ind-btns bld-btns">
        {BUILDING_IDS.filter((k) => k !== 'dok' || info.port).map((k) => (
          <button key={k} className="sbtn bld" onClick={() => buildIn(sel, k)} title={`${BUILDINGS[k].info} Cena ${BUILDINGS[k].cost} bodů, nejdřív za ${BUILDINGS[k].days} dní.`}>
            <Icon name="plus" size={14} />{BUILDINGS[k].n}<small>{BUILDINGS[k].cost} b.</small>
          </button>
        ))}
        <button className="sbtn" onClick={() => selectLabel(getWorld().states[sel].cap, true)} title="Ukázat stát na mapě"><Icon name="target" size={14} />Ukázat</button>
      </div>
    </section>
  );
}

function BuildTab({ state, me, sum }) {
  const list = sum.build;
  const [pick, setPick] = useState(0);
  const states = useMemo(() => {
    const w = getWorld(), out = [];
    for (let s = 1; s < w.states.length; s++) if (state.stateOwner[s] === me && state.ctrl[w.states[s].cap] === me) out.push(s);
    return out;
  }, [state.stateOwner, state.ctrl, me]);
  const sel = states.includes(pick) ? pick : (states.find((s) => slotsUsed(state.ind, s) < slotsOf(state.ind, s)) || states[0] || 0);
  const info = sel ? stateIndustry(state, sel) : null;
  return (
    <div className="prod-cols">
      <div className="prod-left">
        <div className="sec-head"><h3>Státy ({states.length})</h3><span className="muted">klikněte na stát a zadejte stavbu</span></div>
        <StatesList state={state} states={states} sel={sel} setPick={setPick} />
      </div>
      <aside className="prod-right">
        <NewBuild state={state} sel={sel} info={info} />
        <div className="sec-head"><h3>Fronta staveb{list.length ? ` (${list.length})` : ''}</h3><span className="muted">{fmtNum(sum.points, 0)} bodů za den</span></div>
        {!list.length ? <p className="empty">Nic se nestaví. Vyberte stát vlevo a zadejte stavbu.</p> : (
          <ul className="queue ind-queue">
            {list.map((b, i) => {
              const B = BUILDINGS[b.k];
              const eta = projectEta(state, me, b.id);
              return (
                <li key={b.id}>
                  <div className="q-top">
                    <b>{B.n}</b>
                    <span className="muted">{stateName(b.s)} · {eta < 0 ? 'bez bodů' : `za ${fmtDays(eta)}`}</span>
                    <button className="icon-btn sm" disabled={i === 0} onClick={() => moveProject(b.id, -Infinity)} aria-label="Na začátek fronty" title="Na začátek fronty"><Icon name="back" size={14} className="rot90" /></button>
                    <button className="icon-btn sm" onClick={() => cancelProject(b.id)} aria-label={`Zrušit stavbu ${B.n} ve státě ${stateName(b.s)}`} title="Zrušit (body se nevracejí)"><Icon name="close" size={14} /></button>
                  </div>
                  <span className="bar prog"><i style={{ width: `${((b.prog / B.cost) * 100).toFixed(1)}%` }} /></span>
                </li>
              );
            })}
          </ul>
        )}
      </aside>
    </div>
  );
}

// ------------------------------------------------------------------ výroba
const nameOf = (e) => (EQUIP[e] || SHIPS[e] || PLANES[e]).n;
const abOf = (e) => (EQUIP[e] || SHIPS[e] || PLANES[e]).ab;
const groupOf = (e) => EQUIP_GROUPS.find((g) => g.items.includes(e)) || EQUIP_GROUPS[0];

/** Dlaždice s zkratkou výzbroje v barvě skupiny. */
function EqTile({ eq, size = 54 }) {
  const g = groupOf(eq);
  return <span className="eq-tile" style={{ '--g': g.color, width: size, height: size }} aria-hidden="true"><b>{abOf(eq)}</b></span>;
}

/** Řada čtverečků = továrny na lince (plné = přidělené, prázdné = chybí do stropu). */
function FacRow({ n }) {
  const cells = [];
  for (let i = 0; i < Math.min(n, 20); i++) cells.push(<i key={i} />);
  return <span className="fac-row" aria-hidden="true">{cells}</span>;
}

function LineCard({ line, state, eqs, planes }) {
  const warn = line.f < 0.999;
  const need = Object.entries(line.need);
  const short = need.filter(([r]) => (state.res[r]?.f ?? 0) < 0.999).map(([r]) => RESOURCES[r].n);
  const stock = state.stock ? (state.stock[line.eq] || 0) : 0;
  return (
    <article className={`ind-line prod-line ${warn ? 'lack' : ''}`} aria-label={`Linka ${nameOf(line.eq)}`}>
      <EqTile eq={line.eq} />
      <div className="pl-main">
        <select value={line.eq} onChange={(e) => setLineEq(line.id, e.target.value)} aria-label={line.naval ? 'Druh lodi na lince' : 'Druh výzbroje na lince'} title="Změna druhu vynuluje efektivitu">
          {(line.naval ? SHIP_IDS : line.air ? planes : eqs).map((e) => <option key={e} value={e}>{nameOf(e)}</option>)}
        </select>
        <div className="tpl-cost">
          <span className="cost" title="Výrobní body na kus (vyšší úroveň výzbroje je dražší)">{fmtNum(line.cost, 1)} IC</span>
          {need.map(([r, n]) => <span key={r} className={`cost ${(state.res[r]?.f ?? 0) < 0.999 ? 'lack' : ''}`} title={`${RESOURCES[r].n} na kus`}>{RESOURCES[r].ab} {fmtNum(n, 1)}</span>)}
        </div>
      </div>
      <div className="ind-fac pl-fac">
        <button className="icon-btn sm" onClick={() => setLineFac(line.id, line.fac - 1)} aria-label="Ubrat továrnu" title={line.fac === 1 ? 'Zrušit linku' : 'Ubrat továrnu'}><Icon name={line.fac === 1 ? 'trash' : 'minus'} size={14} /></button>
        <b title={line.naval ? 'Loděnice na lince' : 'Vojenské továrny na lince'}>{line.fac}</b>
        <button className="icon-btn sm" disabled={line.fac >= IND.LINE_MAX_FAC || (line.naval ? state.dockFree : state.milFree) < 1} onClick={() => setLineFac(line.id, line.fac + 1)} aria-label="Přidat továrnu nebo loděnici" title="Přidat (zředí efektivitu)"><Icon name="plus" size={14} /></button>
        <FacRow n={line.fac} />
      </div>
      <div className="pl-eff" title={`Efektivita roste ke stropu ${pct(state.effCap)}`}>
        <span className="bar prog"><i style={{ width: `${Math.min(100, line.eff * 100).toFixed(1)}%` }} /><u style={{ left: `${Math.min(100, state.effCap * 100)}%` }} /></span>
        <i>Efektivita</i><b>{pct(line.eff)}</b>
      </div>
      <div className="tpl-stats ind-stats">
        <Sum label="Kusů/den" value={fmtNum(line.perDay, 1)} title="Očekávaná výroba za den včetně nedostatku surovin" cls={warn ? 'warn' : ''} />
        <Sum label="Dnes" value={fmtInt(line.out)} title="Kusů dodaných do skladu při posledním denním výpočtu" />
        <Sum label="Ve skladu" value={line.naval || line.air ? fmtInt(state.pool ? (state.pool[line.eq] || 0) : 0) : fmtInt(stock)} title="Kusů nahromaděných ve skladu" />
        <Sum label="Surovin" value={pct(line.f)} title={warn ? `Nedostatek: ${short.join(', ')}` : 'Suroviny stačí'} cls={warn ? 'warn' : ''} />
      </div>
    </article>
  );
}

function NewLinePicker({ sum, eqs, planes }) {
  return (
    <section className="prod-new" aria-label="Nová linka">
      <div className="sec-head"><h3>Nová linka</h3><span className="muted">volné: {sum.milFree} továren{sum.dockFree > 0 ? `, ${sum.dockFree} loděnic` : ''}</span></div>
      {EQUIP_GROUPS.map((g) => {
        const items = g.items.filter((e) => (g.naval ? true : g.air ? planes.includes(e) : eqs.includes(e)));
        if (!items.length) return null;
        const free = g.naval ? sum.dockFree : sum.milFree;
        return (
          <div key={g.id} className="pn-group" style={{ '--g': g.color }}>
            <h4>{g.n}</h4>
            <div className="pn-grid">
              {items.map((e) => (
                <button key={e} className="pn-tile" disabled={free < 1 || sum.lines.length >= IND.LINES_MAX} onClick={() => newLine(e, 1)}
                  title={free < 1 ? (g.naval ? 'Není volná loděnice' : 'Není volná vojenská továrna') : `Založit linku: ${nameOf(e)}`} aria-label={`Nová linka: ${nameOf(e)}`}>
                  <EqTile eq={e} size={46} /><span>{nameOf(e)}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function ProdTab({ state, me, sum }) {
  const stock = state.mil.stock[me] || {};
  const eqs = producibleEquip(state, me);
  const planes = PLANE_IDS.filter((p) => isUnlocked(state, me, PLANES[p].unlock));
  const view = { ...sum, stock, pool: { ...(state.nav && state.nav.pool ? state.nav.pool[me] || {} : {}), ...(state.air.pool[me] || {}) } };
  return (
    <div className="prod-cols">
      <div className="prod-left">
        <div className="sec-head"><h3>Výrobní linky{sum.lines.length ? ` (${sum.lines.length})` : ''}</h3><span className="muted">{sum.mil - sum.milFree} z {sum.mil} vojenských továren pracuje</span></div>
        {!sum.lines.length ? <p className="empty">Žádná výroba. Vyberte vpravo druh výzbroje a založte linku.</p> : sum.lines.map((l) => <LineCard key={l.id} line={l} state={view} eqs={eqs} planes={planes} />)}
        {sum.dockFree > 0 && <p className="muted ind-note">{sum.dockFree} {sum.dockFree === 1 ? 'volná loděnice čeká' : 'volné loděnice čekají'} na lodní linku.</p>}
        {sum.milFree > 0 && <p className="muted ind-note">{sum.milFree} {sum.milFree === 1 ? 'volná továrna čeká' : 'volné továrny čekají'} na přiřazení k lince.</p>}
      </div>
      <aside className="prod-right">
        <NewLinePicker sum={sum} eqs={eqs} planes={planes} />
        <section className="stock ind-stock prod-stock" aria-label="Sklad">
          <div className="sec-head"><h3>Sklad výzbroje</h3></div>
          <ul className="eq">
            {eqs.map((e) => <li key={e} title={`${EQUIP[e].n} ve skladu`}><i>{EQUIP[e].ab}</i><b>{fmtInt(stock[e] || 0)}</b></li>)}
          </ul>
        </section>
      </aside>
    </div>
  );
}

// ------------------------------------------------------------------ obchod
function ResTable({ sum }) {
  const rows = RES_IDS.map((r) => ({ r, ...(sum.res[r] || { ext: 0, imp: 0, exp: 0, dem: 0, f: 1 }) }));
  return (
    <table className="ind-res" aria-label="Suroviny">
      <thead><tr><th>Surovina</th><th title="Těžba za den">Těžba</th><th title="Dovoz za den">Dovoz</th><th title="Vývoz za den">Vývoz</th><th title="Poptávka linek za den">Potřeba</th><th title="Jak velká část potřeby je kryta">Krytí</th></tr></thead>
      <tbody>
        {rows.map((x) => (
          <tr key={x.r} className={x.f < 0.999 ? 'bad' : ''}>
            <th scope="row">{RESOURCES[x.r].n}</th>
            <td>{fmtNum(x.ext, 1)}</td><td>{x.imp ? fmtNum(x.imp, 1) : '–'}</td><td>{x.exp ? fmtNum(x.exp, 1) : '–'}</td><td>{x.dem ? fmtNum(x.dem, 1) : '–'}</td>
            <td>{x.dem ? pct(x.f) : '–'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TradeForm({ state, me }) {
  const partners = useMemo(() => allCountries().filter((c) => c.idx !== me).sort((a, b) => a.name.localeCompare(b.name, 'cs')), [me]);
  const [f, setF] = useState({ partner: 0, res: 'ropa', amt: 3, out: false });
  const partner = f.partner || partners[0].idx;
  const sur = industryOf(state, partner).res[f.res];
  const surplus = sur ? Math.max(0, sur.ext - sur.dem - sur.exp) : 0;
  return (
    <section className="ind-new" aria-label="Nová smlouva">
      <div className="ind-trade-form">
        <select value={f.out ? 'out' : 'in'} onChange={(e) => setF({ ...f, out: e.target.value === 'out' })} aria-label="Směr obchodu">
          <option value="in">Dovážet od</option><option value="out">Vyvážet do</option>
        </select>
        <select value={partner} onChange={(e) => setF({ ...f, partner: Number(e.target.value) })} aria-label="Partner">
          {partners.map((c) => <option key={c.idx} value={c.idx}>{c.name}</option>)}
        </select>
        <select value={f.res} onChange={(e) => setF({ ...f, res: e.target.value })} aria-label="Surovina">
          {RES_IDS.map((r) => <option key={r} value={r}>{RESOURCES[r].n}</option>)}
        </select>
        <input type="number" min="0.5" max={IND.TRADE_AMT_MAX} step="0.5" value={f.amt} onChange={(e) => setF({ ...f, amt: Number(e.target.value) })} aria-label="Množství za den" />
        <button className="sbtn primary" onClick={() => newTrade(partner, f.res, f.amt, f.out)}>Uzavřít</button>
      </div>
      <p className="muted">{f.out ? 'Vývoz je omezen vaším přebytkem.' : `Přebytek partnera: ${fmtNum(surplus, 1)} za den.`} Dovoz stojí {fmtNum(IND.TRADE_CIV * 100, 0)} % civilní továrny na jednotku.</p>
    </section>
  );
}

function TradeTab({ state, me, sum }) {
  return (
    <div className="prod-cols">
      <div className="prod-left">
        <div className="sec-head"><h3>Suroviny</h3><span className="muted">za den</span></div>
        <ResTable sum={sum} />
      </div>
      <aside className="prod-right">
      <TradeForm state={state} me={me} />
      <div className="sec-head"><h3>Smlouvy{sum.trade.length ? ` (${sum.trade.length})` : ''}</h3></div>
      {!sum.trade.length ? <p className="empty">Žádné smlouvy. Chybějící suroviny koupíte od zemí s přebytkem.</p> : (
        <ul className="queue ind-trades">
          {sum.trade.map((d) => {
            const out = d.from === me;
            const partner = out ? d.to : d.from;
            const cut = d.got < d.amt - 1e-9;
            const war = atWar(state, d.from, d.to);
            return (
              <li key={d.id}>
                <div className="q-top">
                  <b>{RESOURCES[d.res].n}</b>
                  <span className="muted">{out ? 'vývoz do' : 'dovoz od'} {countryName(getWorld().owners[partner].tag)}</span>
                  <button className="icon-btn sm" onClick={() => changeTrade(d.id, d.amt - 1)} disabled={d.amt <= 1} aria-label="Ubrat množství" title="−1"><Icon name="minus" size={14} /></button>
                  <b className="ind-amt" title="Sjednané množství za den">{fmtNum(d.amt, 1)}</b>
                  <button className="icon-btn sm" onClick={() => changeTrade(d.id, d.amt + 1)} disabled={d.amt + 1 > IND.TRADE_AMT_MAX} aria-label="Přidat množství" title="+1"><Icon name="plus" size={14} /></button>
                  <button className="icon-btn sm" onClick={() => dropTrade(d.id)} aria-label="Zrušit smlouvu" title="Zrušit smlouvu"><Icon name="close" size={14} /></button>
                </div>
                <span className={`muted ind-got ${cut ? 'lack' : ''}`}>{war ? 'přerušeno válkou' : `dodáno ${fmtNum(d.got, 1)} z ${fmtNum(d.amt, 1)}`}</span>
              </li>
            );
          })}
        </ul>
      )}
      </aside>
    </div>
  );
}

/** Celoobrazovkové okno Průmysl (klávesa I): výroba (linky a dlaždice výzbroje), stavby (státy a fronta), obchod se surovinami. */
export function IndustryPanel() {
  const state = useGameSlow((s) => s, 500);
  const tab = useUi((s) => s.indTab);
  const me = playerIdx(state);
  const sum = useMemo(() => (me ? industryOf(state, me) : null), [state.ind, state.ctrl, state.stateOwner, me]);
  if (!me) return <div className="prod-screen industry-panel"><div className="prod-body"><p className="empty">Jako pozorovatel nevedete žádný průmysl.</p></div></div>;
  return (
    <div className="prod-screen industry-panel" role="dialog" aria-label="Průmysl">
      <header className="prod-head">
        <h2><Icon name="industry" size={22} />Průmysl</h2>
        <nav className="ind-tabs" role="tablist" aria-label="Průmysl">
          {TABS.map((t) => <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setIndTab(t.id)}>{t.name}</button>)}
        </nav>
        <Header sum={sum} />
        <button className="icon-btn close" onClick={closeSide} aria-label="Zavřít okno" title="Zavřít (Esc)"><Icon name="close" size={20} /></button>
      </header>
      <div className="prod-body">
        {tab === 'prod' ? <ProdTab state={state} me={me} sum={sum} /> : tab === 'trade' ? <TradeTab state={state} me={me} sum={sum} /> : <BuildTab state={state} me={me} sum={sum} />}
      </div>
    </div>
  );
}
