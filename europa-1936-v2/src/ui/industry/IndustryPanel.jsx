import { useMemo, useRef, useState } from 'react';
import { EquipIcon } from './EquipIcon.jsx';
import { useGameSlow, useUi } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import {
  getWorld, industryOf, stateIndustry, projectEta, allCountries, countryName, slotsUsed, slotsOf, atWar,
  BUILDINGS, BUILDING_IDS, producibleEquip, EQUIP, EQUIP_PROD, RESOURCES, RES_IDS, IND, SHIPS, SHIP_IDS, PLANES, PLANE_IDS, isUnlocked, tradeStatus, convoysOf, tradeRoute,
} from '../../engine/index.js';
import {
  playerIdx, closeSide, setIndTab, buildIn, cancelProject, moveProject, newLine, setLineFac, setLineEq, newTrade, changeTrade, dropTrade, selectLabel,
} from '../actions.js';
import { fmtInt, fmtNum, fmtDays } from '../format.js';
import { EQUIP_GROUPS } from '../../data/industry/groups.js';
import { ResIcon } from '../common/ResIcon.jsx';
import { Flag } from '../common/Flag.jsx';

const TABS = [
  { id: 'build', name: 'Stavby' },
  { id: 'prod', name: 'Výroba' },
  { id: 'trade', name: 'Obchod' },
];
const pct = (v) => `${Math.round(Math.max(0, v) * 100)} %`;
const stateName = (s) => getWorld().states[s].n;

function Sum({ label, value, title, cls, icon }) {
  return <span className={`stat-cell ${cls || ''}`} title={title}><i>{icon && <Icon name={icon} size={13} />}{label}</i><b>{value}</b></span>;
}

function Header({ sum }) {
  return (
    <section className="ind-sum" aria-label="Souhrn průmyslu">
      <Sum icon="industry" label="Civilní" value={sum.civ} title="Civilní továrny celkem" />
      <Sum icon="army" label="Vojenské" value={sum.mil} title="Vojenské továrny celkem" />
      <Sum icon="box" label="Spotř. zboží" value={pct(sum.cons)} title={`Spotřební zboží ubírá ${fmtNum(sum.consFac, 1)} továren (nejdřív civilních)`} />
      <Sum icon="build" label="Body stavby" value={fmtNum(sum.points, 0)} title="Body stavby za den (civilní továrny po odečtení spotřebního zboží a dovozu)" />
      {sum.dok > 0 && <Sum icon="navy" label="Loděnice" value={sum.dok} title={`Námořní loděnice (volné: ${sum.dockFree})`} />}
      <Sum icon="plus" label="Volné" value={sum.milFree} title="Volné vojenské továrny: nejsou přiřazené žádné lince" cls={sum.milFree > 0 ? 'warn' : ''} />
    </section>
  );
}

// Stavby jsou od M103 úzký panel vlevo nad mapou (`BuildPanel.jsx`).

// ------------------------------------------------------------------ výroba
const nameOf = (e) => (EQUIP[e] || SHIPS[e] || PLANES[e]).n;
const abOf = (e) => (EQUIP[e] || SHIPS[e] || PLANES[e]).ab;
const groupOf = (e) => EQUIP_GROUPS.find((g) => g.items.includes(e)) || EQUIP_GROUPS[0];

/** Dlaždice výzbroje s kreslenou ikonou v barvě skupiny (M104). */
function EqTile({ eq, size = 54 }) {
  const g = groupOf(eq);
  return <span className="eq-tile" style={{ '--g': g.color, width: size, height: size }} aria-hidden="true"><EquipIcon eq={eq} size={size - 12} color="var(--paper)" /></span>;
}

// M104: továrny se přetahují ze zásobníku volných na linku (a velkým číslem linky zpět do zásobníku)
let facDrag = null;   // { from: id linky | 0 = zásobník }

/**
 * Řada továren linky (M104, jako v HOI4): plné čtverce = továrny na lince, prázdné = volné továrny, které lze přidat.
 * Klik nebo tažení po řadě nastaví počet (náhled během tažení, uloží se po puštění); nejméně 1 – linku ruší koš.
 */
function FacSlots({ line, free, naval }) {
  const max = Math.max(line.fac, Math.min(IND.LINE_MAX_FAC, line.fac + free));
  const [prev, setPrev] = useState(0);
  const painting = useRef(false);
  const commit = () => {
    if (!painting.current) return;
    painting.current = false;
    const n = prev;
    setPrev(0);
    if (n && n !== line.fac) setLineFac(line.id, n);
  };
  const show = prev || line.fac;
  const cells = [];
  for (let i = 0; i < max; i++) {
    const on = i < show, was = i < line.fac;
    cells.push(
      <i key={i} className={`${on ? 'on' : ''} ${prev && on !== was ? (on ? 'add' : 'del') : ''}`} role="button" aria-label={`Továren na lince: ${i + 1}`}
        onPointerDown={(e) => { e.preventDefault(); painting.current = true; setPrev(Math.max(1, i + 1)); }}
        onPointerEnter={() => { if (painting.current) setPrev(Math.max(1, i + 1)); }} />,
    );
  }
  return (
    <span className={`fac-slots ${naval ? 'naval' : ''}`} onPointerUp={commit} onPointerLeave={commit}
      title={`${naval ? 'Loděnice' : 'Vojenské továrny'}: klikněte nebo táhněte po řadě (plné = na lince, prázdné = volné)`}>
      {cells}
    </span>
  );
}

function LineCard({ line, state, eqs, planes }) {
  const warn = line.f < 0.999;
  const need = Object.entries(line.need);
  const short = need.filter(([r]) => (state.res[r]?.f ?? 0) < 0.999).map(([r]) => RESOURCES[r].n);
  const stock = state.stock ? (state.stock[line.eq] || 0) : 0;
  const free = line.naval ? state.dockFree : state.milFree;
  const [over, setOver] = useState(false);
  const [open, setOpen] = useState(false);
  const opts = line.naval ? SHIP_IDS : line.air ? planes : eqs;
  const accepts = () => facDrag && facDrag.from === 0 && free > 0;
  return (
    <article className={`ind-line prod-line ${warn ? 'lack' : ''} ${over ? 'drop' : ''}`} aria-label={`Linka ${nameOf(line.eq)}`}
      onDragOver={(e) => { if (accepts()) { e.preventDefault(); setOver(true); } }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (accepts()) setLineFac(line.id, line.fac + 1); facDrag = null; }}>
      <EqTile eq={line.eq} size={64} />
      <div className="pl-main">
        <button className={`pl-pick ${open ? 'open' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open} aria-label={line.naval ? 'Druh lodi na lince' : 'Druh výzbroje na lince'} title="Klikněte pro změnu druhu (vynuluje efektivitu)">
          <span>{nameOf(line.eq)}</span><Icon name="chevron" size={14} />
        </button>
        <div className="pl-need">
          <span title="Výrobní body na kus (vyšší úroveň výzbroje je dražší)"><Icon name="industry" size={14} />{fmtNum(line.cost, 1)}</span>
          {need.map(([r, n]) => <span key={r} className={(state.res[r]?.f ?? 0) < 0.999 ? 'lack' : ''} title={`${RESOURCES[r].n} na kus${(state.res[r]?.f ?? 0) < 0.999 ? ' – nedostatek' : ''}`}><ResIcon r={r} size={15} />{fmtNum(n, 1)}</span>)}
        </div>
      </div>
      <div className="ind-fac pl-fac">
        <button className="icon-btn sm" onClick={() => setLineFac(line.id, 0)} aria-label="Zrušit linku" title="Zrušit linku (továrny se uvolní)"><Icon name="trash" size={14} /></button>
        <b draggable onDragStart={(e) => { facDrag = { from: line.id }; e.dataTransfer.setData('text/plain', 'fac'); e.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => { facDrag = null; }}
          title={`${line.naval ? 'Loděnice' : 'Vojenské továrny'} na lince – přetažením do zásobníku jednu uvolníte`}>{line.fac}</b>
        <FacSlots line={line} free={free} naval={line.naval} />
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
      {open && (
        <div className="pl-opts" role="radiogroup" aria-label="Druh na lince">
          {opts.map((e) => (
            <button key={e} role="radio" aria-checked={e === line.eq} className={`pn-tile ${e === line.eq ? 'on' : ''}`} style={{ '--g': groupOf(e).color }}
              onClick={() => { if (e !== line.eq) setLineEq(line.id, e); setOpen(false); }} title={e === line.eq ? 'Současný druh' : `Vyrábět ${nameOf(e)} (efektivita klesne)`}>
              <EquipIcon eq={e} size={40} color={groupOf(e).color} /><span>{nameOf(e)}</span>
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

/** Zásobník volných továren a loděnic (M104): odsud se táhnou na linky, sem se z linek vracejí. */
function FacPool({ sum }) {
  const [over, setOver] = useState(false);
  const icons = (n, cls) => Array.from({ length: Math.min(n, 30) }, (_, i) => <i key={i} className={cls} />);
  return (
    <div className={`fac-pool ${over ? 'drop' : ''}`} aria-label="Volné továrny"
      onDragOver={(e) => { if (facDrag && facDrag.from) { e.preventDefault(); setOver(true); } }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const d = facDrag; facDrag = null; if (d && d.from) { const l = sum.lines.find((x) => x.id === d.from); if (l) setLineFac(l.id, l.fac - 1); } }}>
      <span className="fp-lbl"><Icon name="industry" size={16} />Volné</span>
      <span className="fp-drag" draggable={sum.milFree > 0} onDragStart={(e) => { facDrag = { from: 0 }; e.dataTransfer.setData('text/plain', 'fac'); e.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => { facDrag = null; }}
        title={sum.milFree > 0 ? 'Přetáhněte továrnu na linku' : 'Žádná volná vojenská továrna – přetáhněte sem číslo linky, ze které jednu uvolníte'}>
        {sum.milFree > 0 ? icons(sum.milFree, 'mil') : <em>žádné</em>}
        <b>{sum.milFree}</b>
      </span>
      {sum.dok > 0 && <span className="fp-dock" title="Volné loděnice"><Icon name="navy" size={15} /><b>{sum.dockFree}</b></span>}
      <span className="fp-sum muted">{sum.mil - sum.milFree} z {sum.mil} továren pracuje</span>
    </div>
  );
}

function NewLinePicker({ sum, eqs, planes }) {
  return (
    <section className="prod-new" aria-label="Nová linka">
      <div className="sec-head"><h3>Nová linka</h3><span className="muted">volné: {sum.milFree} továren{sum.dockFree > 0 ? `, ${sum.dockFree} loděnic` : ''}</span></div>
      {EQUIP_GROUPS.map((g) => {
        const items = g.items.filter((e) => (g.naval ? SHIPS[e] : g.air ? planes.includes(e) : eqs.includes(e)));
        if (!items.length) return null;
        const free = g.naval ? sum.dockFree : sum.milFree;
        return (
          <div key={g.id} className="pn-group" style={{ '--g': g.color }}>
            <h4>{g.n}</h4>
            <div className="pn-grid">
              {items.map((e) => (
                <button key={e} className="pn-tile" disabled={free < 1 || sum.lines.length >= IND.LINES_MAX} onClick={() => newLine(e, 1)}
                  title={free < 1 ? (g.naval ? 'Není volná loděnice' : 'Není volná vojenská továrna') : `Založit linku: ${nameOf(e)}`} aria-label={`Nová linka: ${nameOf(e)}`}>
                  <EquipIcon eq={e} size={52} color={g.color} /><span>{nameOf(e)}</span>
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
        <div className="sec-head"><h3>Výrobní linky{sum.lines.length ? ` (${sum.lines.length})` : ''}</h3></div>
        <FacPool sum={sum} />
        {!sum.lines.length ? <p className="empty">Žádná výroba. Vyberte vpravo druh výzbroje a založte linku.</p> : sum.lines.map((l) => <LineCard key={l.id} line={l} state={view} eqs={eqs} planes={planes} />)}
        {sum.dockFree > 0 && <p className="muted ind-note">{sum.dockFree} {sum.dockFree === 1 ? 'volná loděnice čeká' : 'volné loděnice čekají'} na lodní linku.</p>}
        {sum.milFree > 0 && <p className="muted ind-note">{sum.milFree} {sum.milFree === 1 ? 'volná továrna čeká' : 'volné továrny čekají'} na přiřazení k lince.</p>}
      </div>
      <aside className="prod-right">
        <NewLinePicker sum={sum} eqs={eqs} planes={planes} />
        <section className="stock ind-stock prod-stock" aria-label="Sklad">
          <div className="sec-head"><h3>Sklad výzbroje</h3></div>
          <div className="stk-grid">
            {eqs.map((e) => {
              const n = stock[e] || 0;
              return <span key={e} className={`stk-tile ${n ? '' : 'zero'}`} title={`${EQUIP[e].n} ve skladu`}><EquipIcon eq={e} size={34} color={groupOf(e).color} /><b>{fmtInt(n)}</b></span>;
            })}
          </div>
        </section>
      </aside>
    </div>
  );
}

// ------------------------------------------------------------------ obchod
// UI (jako v HOI4): suroviny jako karty s ikonou a ukazatelem pokrytí, trh vybrané suroviny jako karty dodavatelů (smlouva jedním kliknutím),
// smlouvy jako karty s průběhem dodávek – místo tabulky a formuláře s rozbalovacími seznamy.

/** Karta suroviny: ikona, bilance za den, pruh zdrojů (těžba, dovoz) proti potřebě a krytí. */
function ResCard({ r, x, on, onPick }) {
  const have = x.ext + x.imp, need = x.dem + x.exp, max = Math.max(have, need, 0.1);
  const bal = have - need, lack = x.dem > 0 && x.f < 0.999;
  return (
    <button className={`res-card ${on ? 'on' : ''} ${lack ? 'lack' : ''}`} onClick={onPick} aria-pressed={on} aria-label={`${RESOURCES[r].n}: bilance ${fmtNum(bal, 1)}`}
      title={`${RESOURCES[r].n} za den – těžba ${fmtNum(x.ext, 1)}, dovoz ${fmtNum(x.imp, 1)}, vývoz ${fmtNum(x.exp, 1)}, potřeba linek ${fmtNum(x.dem, 1)}`}>
      <span className="rc-top"><ResIcon r={r} size={30} /><b>{RESOURCES[r].n}</b><em className={bal < -1e-9 ? 'bad' : 'good'}>{bal > 0 ? '+' : ''}{fmtNum(bal, 1)}</em></span>
      <span className="rc-bar" aria-hidden="true">
        <i className="ext" style={{ width: `${(100 * x.ext) / max}%` }} />
        <i className="imp" style={{ width: `${(100 * x.imp) / max}%` }} />
        {need > 0 && <s style={{ left: `${Math.min(100, (100 * need) / max)}%` }} />}
      </span>
      <span className="rc-foot"><i><Icon name="build" size={12} />{fmtNum(x.ext, 1)}</i><i><Icon name="trade" size={12} />{x.imp ? fmtNum(x.imp, 1) : '–'}</i><i className={lack ? 'bad' : ''}>{x.dem ? pct(x.f) : '–'}</i></span>
    </button>
  );
}

/** Trh se surovinou `res`: země s přebytkem (dovoz) nebo s nedostatkem (vývoz) jako karty; klik na +1 / +3 uzavře smlouvu. */
function Market({ state, me, res, out }) {
  const day = Math.floor(state.tick / 24);
  const rows = useMemo(() => {
    const w = getWorld(), list = [];
    for (const c of allCountries()) {
      if (c.idx === me) continue;
      const x = industryOf(state, c.idx).res[res];
      if (!x) continue;
      const v = out ? x.dem - x.ext - x.imp : x.ext - x.dem - x.exp;
      if (v < 0.25) continue;
      const route = tradeRoute(state, out ? me : c.idx, out ? c.idx : me);
      list.push({ o: c.idx, tag: w.owners[c.idx].tag, name: c.name, v, sea: !!(route && route.sea), war: atWar(state, me, c.idx) });
    }
    return list.sort((a, b) => b.v - a.v).slice(0, 18);
  }, [day, res, out, me]);   // eslint-disable-line react-hooks/exhaustive-deps
  const top = Math.max(1, ...rows.map((x) => x.v));
  if (!rows.length) return <p className="empty">{out ? 'Nikdo tuto surovinu nepotřebuje.' : 'Žádná země nemá přebytek této suroviny.'}</p>;
  return (
    <div className="market" role="list" aria-label="Trh">
      {rows.map((x) => (
        <div key={x.o} className={`mk-card ${x.war ? 'war' : ''}`} role="listitem">
          <Flag tag={x.tag} width={30} />
          <span className="mk-nm"><b>{x.name}</b><span className="mk-bar"><i style={{ width: `${(100 * x.v) / top}%` }} /></span></span>
          <span className="mk-v" title={out ? 'Nedostatek země za den' : 'Přebytek země za den'}>{fmtNum(x.v, 1)}</span>
          <span className="mk-route" title={x.sea ? 'Po moři – potřebuje konvoje' : 'Po souši'}><Icon name={x.sea ? 'ship' : 'road'} size={15} /></span>
          {[1, 3].map((n) => <button key={n} className="mk-buy" disabled={x.war || n > x.v + 0.5} onClick={() => newTrade(x.o, res, n, out)} title={`${out ? 'Vyvážet' : 'Dovážet'} ${n} za den`}>+{n}</button>)}
        </div>
      ))}
    </div>
  );
}

function TradeTab({ state, me, sum }) {
  const ts = useMemo(() => new Map(tradeStatus(state, me).map((x) => [x.d.id, x])), [state.ind.trade, state.nav, state.ctrl, state.mil.wars, me]);
  const cv = convoysOf(state, me);
  const [res, setRes] = useState(() => RES_IDS.find((r) => sum.res[r] && sum.res[r].f < 0.999) || 'ropa');
  const [out, setOut] = useState(false);
  return (
    <div className="prod-cols trade-cols">
      <div className="prod-left">
        <div className="sec-head"><h3>Suroviny</h3><span className="muted">za den · klikněte na surovinu pro trh</span></div>
        <div className="res-grid" aria-label="Suroviny">
          {RES_IDS.map((r) => <ResCard key={r} r={r} x={sum.res[r] || { ext: 0, imp: 0, exp: 0, dem: 0, f: 1 }} on={res === r} onPick={() => setRes(r)} />)}
        </div>
        <div className="sec-head"><h3><ResIcon r={res} size={20} /> Trh: {RESOURCES[res].n}</h3>
          <div className="seg" role="group" aria-label="Směr obchodu">
            <button className={`sbtn ${!out ? 'primary' : ''}`} aria-pressed={!out} onClick={() => setOut(false)}>Dovoz</button>
            <button className={`sbtn ${out ? 'primary' : ''}`} aria-pressed={out} onClick={() => setOut(true)}>Vývoz</button>
          </div>
        </div>
        <Market state={state} me={me} res={res} out={out} />
        <p className="muted">Dovoz stojí {fmtNum(IND.TRADE_CIV * 100, 0)} % civilní továrny na jednotku za den.</p>
      </div>
      <aside className="prod-right">
        <section className="convoy-meter" aria-label="Konvoje" title="Smlouvy přes moře potřebují konvoje (transportní lodě dovozce). Nepřátelské lodě na trase konvoje ničí, vlastní válečné lodě je kryjí.">
          <Icon name="ship" size={22} />
          <span><b>Konvoje</b><span className="cv-bar"><i className={cv.need > cv.avail ? 'bad' : ''} style={{ width: `${Math.min(100, (100 * cv.need) / Math.max(1, cv.avail))}%` }} /></span></span>
          <b className={cv.need > cv.avail ? 'bad' : ''}>{cv.need} / {cv.avail}</b>
        </section>
        <div className="sec-head"><h3>Smlouvy{sum.trade.length ? ` (${sum.trade.length})` : ''}</h3></div>
        {!sum.trade.length ? <p className="empty">Žádné smlouvy. Vyberte surovinu a na trhu klikněte na +1 u země s přebytkem.</p> : (
          <ul className="ind-trades deal-list">
            {sum.trade.map((d) => {
              const o2 = d.from === me;
              const partner = o2 ? d.to : d.from;
              const war = atWar(state, d.from, d.to);
              const st = ts.get(d.id);
              const share = d.amt ? Math.min(1, d.got / d.amt) : 0;
              return (
                <li key={d.id} className={`deal ${war ? 'war' : share < 0.999 ? 'cut' : ''}`}>
                  <ResIcon r={d.res} size={28} />
                  <Flag tag={getWorld().owners[partner].tag} width={30} />
                  <span className="deal-mid">
                    <b>{RESOURCES[d.res].n}</b>
                    <span className="muted">{o2 ? 'vývoz do' : 'dovoz od'} {countryName(getWorld().owners[partner].tag)} <Icon name={st && st.route.sea ? 'ship' : 'road'} size={12} />{st && st.risk > 0.005 ? ` riziko ${Math.round(st.risk * 100)} %` : ''}</span>
                    <span className="deal-bar" title={war ? 'Přerušeno válkou' : `Dodáno ${fmtNum(d.got, 1)} z ${fmtNum(d.amt, 1)}`}><i style={{ width: `${war ? 0 : share * 100}%` }} /></span>
                  </span>
                  <span className="deal-amt">
                    <button className="icon-btn sm" onClick={() => changeTrade(d.id, d.amt - 1)} disabled={d.amt <= 1} aria-label="Ubrat množství" title="−1"><Icon name="minus" size={14} /></button>
                    <b className="ind-amt" title="Sjednané množství za den">{fmtNum(d.amt, 1)}</b>
                    <button className="icon-btn sm" onClick={() => changeTrade(d.id, d.amt + 1)} disabled={d.amt + 1 > IND.TRADE_AMT_MAX} aria-label="Přidat množství" title="+1"><Icon name="plus" size={14} /></button>
                  </span>
                  <button className="icon-btn sm" onClick={() => dropTrade(d.id)} aria-label="Zrušit smlouvu" title="Zrušit smlouvu"><Icon name="trash" size={15} /></button>
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
        {tab === 'prod' ? <ProdTab state={state} me={me} sum={sum} /> : tab === 'trade' ? <TradeTab state={state} me={me} sum={sum} /> : null}
      </div>
    </div>
  );
}
