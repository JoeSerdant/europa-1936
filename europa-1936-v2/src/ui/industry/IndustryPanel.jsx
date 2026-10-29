import { useMemo, useState } from 'react';
import { useGameSlow, useUi } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import {
  getWorld, industryOf, stateIndustry, projectEta, allCountries, countryName, slotsUsed, slotsOf, atWar,
  BUILDINGS, BUILDING_IDS, producibleEquip, EQUIP, EQUIP_PROD, RESOURCES, RES_IDS, IND,
} from '../../engine/index.js';
import {
  playerIdx, setIndTab, buildIn, cancelProject, moveProject, newLine, setLineFac, setLineEq, newTrade, changeTrade, dropTrade, selectLabel,
} from '../actions.js';
import { fmtInt, fmtNum, fmtDays } from '../format.js';

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
      <Sum label="Volné" value={sum.milFree} title="Volné vojenské továrny: nejsou přiřazené žádné lince" cls={sum.milFree > 0 ? 'warn' : ''} />
    </section>
  );
}

// ------------------------------------------------------------------ stavby
function NewBuild({ state, me }) {
  const states = useMemo(() => {
    const w = getWorld(), out = [];
    for (let s = 1; s < w.states.length; s++) if (state.stateOwner[s] === me && state.ctrl[w.states[s].cap] === me) out.push(s);
    return out;
  }, [state.stateOwner, state.ctrl, me]);
  const [pick, setPick] = useState(0);
  const sel = states.includes(pick) ? pick : (states.find((s) => slotsUsed(state.ind, s) < slotsOf(state.ind, s)) || states[0] || 0);
  if (!states.length) return null;
  const info = stateIndustry(state, sel);
  return (
    <section className="ind-new" aria-label="Nová stavba">
      <label className="ind-field"><span>Stát</span>
        <select value={sel} onChange={(e) => setPick(Number(e.target.value))} aria-label="Stát pro stavbu">
          {states.map((s) => {
            const i = stateIndustry(state, s);
            return <option key={s} value={s}>{stateName(s)} · {i.used}/{i.slots}</option>;
          })}
        </select>
      </label>
      <p className="muted">{info.cat.n} · sloty {info.used}/{info.slots} · továrny {info.civ} civ. + {info.mil} vojen. · infrastruktura +{info.inf}</p>
      <div className="ind-btns">
        {BUILDING_IDS.map((k) => (
          <button key={k} className="sbtn" onClick={() => buildIn(sel, k)} title={`${BUILDINGS[k].info} Cena ${BUILDINGS[k].cost} bodů, nejdřív za ${BUILDINGS[k].days} dní.`}>
            <Icon name="plus" size={14} />{BUILDINGS[k].n}
          </button>
        ))}
        <button className="sbtn" onClick={() => selectLabel(getWorld().states[sel].cap, true)} title="Ukázat stát na mapě"><Icon name="target" size={14} />Ukázat</button>
      </div>
    </section>
  );
}

function BuildTab({ state, me, sum }) {
  const list = sum.build;
  return (
    <>
      <NewBuild state={state} me={me} />
      <div className="sec-head"><h3>Fronta staveb{list.length ? ` (${list.length})` : ''}</h3><span className="muted">{fmtNum(sum.points, 0)} bodů za den</span></div>
      {!list.length ? <p className="empty">Nic se nestaví. Zadejte stavbu výše nebo na kartě státu (označte vlastní provincii).</p> : (
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
    </>
  );
}

// ------------------------------------------------------------------ výroba
function LineCard({ line, state, eqs }) {
  const warn = line.f < 0.999;
  const need = Object.entries(line.need);
  const short = need.filter(([r]) => (state.res[r]?.f ?? 0) < 0.999).map(([r]) => RESOURCES[r].n);
  return (
    <article className="tpl-card ind-line" aria-label={`Linka ${EQUIP[line.eq].n}`}>
      <header>
        <select value={line.eq} onChange={(e) => setLineEq(line.id, e.target.value)} aria-label="Druh výzbroje na lince" title="Změna druhu výzbroje vynuluje efektivitu">
          {eqs.map((e) => <option key={e} value={e}>{EQUIP[e].n}</option>)}
        </select>
        <div className="ind-fac">
          <button className="icon-btn sm" onClick={() => setLineFac(line.id, line.fac - 1)} aria-label="Ubrat továrnu" title={line.fac === 1 ? 'Zrušit linku' : 'Ubrat továrnu'}><Icon name={line.fac === 1 ? 'trash' : 'minus'} size={14} /></button>
          <b title="Vojenské továrny na lince">{line.fac}</b>
          <button className="icon-btn sm" disabled={line.fac >= IND.LINE_MAX_FAC || state.milFree < 1} onClick={() => setLineFac(line.id, line.fac + 1)} aria-label="Přidat továrnu" title="Přidat továrnu (zředí efektivitu)"><Icon name="plus" size={14} /></button>
        </div>
      </header>
      <div className="tpl-stats ind-stats">
        <Sum label="Efektivita" value={pct(line.eff)} title={`Roste ke stropu ${pct(state.effCap)}`} />
        <Sum label="Kusů/den" value={fmtNum(line.perDay, 1)} title="Očekávaná výroba za den včetně nedostatku surovin" cls={warn ? 'warn' : ''} />
        <Sum label="Dnes" value={fmtInt(line.out)} title="Kusů dodaných do skladu při posledním denním výpočtu" />
        <Sum label="Surovin" value={pct(line.f)} title={warn ? `Nedostatek: ${short.join(', ')}` : 'Suroviny stačí'} cls={warn ? 'warn' : ''} />
      </div>
      <div className="tpl-cost">
        <span className="cost" title="Výrobní body na kus (vyšší úroveň výzbroje je dražší)">{fmtNum(line.cost, 1)} IC</span>
        {need.map(([r, n]) => <span key={r} className={`cost ${(state.res[r]?.f ?? 0) < 0.999 ? 'lack' : ''}`} title={`${RESOURCES[r].n} na kus`}>{RESOURCES[r].ab} {fmtNum(n, 1)}</span>)}
      </div>
    </article>
  );
}

function ProdTab({ state, me, sum }) {
  const stock = state.mil.stock[me] || {};
  const eqs = producibleEquip(state, me);
  return (
    <>
      <section className="stock ind-stock">
        <ul className="eq">
          {eqs.map((e) => <li key={e} title={`${EQUIP[e].n} ve skladu`}><i>{EQUIP[e].ab}</i><b>{fmtInt(stock[e] || 0)}</b></li>)}
        </ul>
      </section>
      <div className="sec-head"><h3>Výrobní linky{sum.lines.length ? ` (${sum.lines.length})` : ''}</h3>
        <span className="ind-add">
          <select value="" onChange={(e) => { if (e.target.value) newLine(e.target.value, 1); }} aria-label="Nová linka" disabled={sum.milFree < 1 || sum.lines.length >= IND.LINES_MAX}>
            <option value="">+ Nová linka…</option>
            {eqs.map((e) => <option key={e} value={e}>{EQUIP[e].n}</option>)}
          </select>
        </span>
      </div>
      {!sum.lines.length ? <p className="empty">Žádná výroba. Postavte vojenské továrny a založte linku.</p> : sum.lines.map((l) => <LineCard key={l.id} line={l} state={sum} eqs={eqs} />)}
      {sum.milFree > 0 && <p className="muted ind-note">{sum.milFree} {sum.milFree === 1 ? 'volná továrna čeká' : 'volné továrny čekají'} na přiřazení k lince.</p>}
    </>
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
    <>
      <ResTable sum={sum} />
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
    </>
  );
}

/** Záložka Průmysl: stavby (fronta, nové projekty), výroba (linky výzbroje, sklad) a obchod se surovinami. */
export function IndustryPanel() {
  const state = useGameSlow((s) => s, 500);
  const tab = useUi((s) => s.indTab);
  const me = playerIdx(state);
  const sum = useMemo(() => (me ? industryOf(state, me) : null), [state.ind, state.ctrl, state.stateOwner, me]);
  if (!me) return <div className="recruit-panel"><p className="empty">Jako pozorovatel nevedete žádný průmysl.</p></div>;
  return (
    <div className="recruit-panel industry-panel">
      <Header sum={sum} />
      <nav className="ind-tabs" role="tablist" aria-label="Průmysl">
        {TABS.map((t) => <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setIndTab(t.id)}>{t.name}</button>)}
      </nav>
      <div className="side-scroll">
        {tab === 'prod' ? <ProdTab state={state} me={me} sum={sum} /> : tab === 'trade' ? <TradeTab state={state} me={me} sum={sum} /> : <BuildTab state={state} me={me} sum={sum} />}
      </div>
    </div>
  );
}
