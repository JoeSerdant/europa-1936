import { useGameSlow } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { politicsOf } from '../../engine/index.js';
import { playerIdx, changeLaw, hireAdv, dismissAdv } from '../actions.js';
import { fmtNum } from '../format.js';
import { Screen } from '../common/Screen.jsx';

const pct = (v) => `${Math.round(v * 100)} %`;
const MODS = { stab: 'stabilita', ws: 'podpora války', cons: 'spotřební zboží', build: 'stavby', prod: 'výroba', extract: 'těžba', imp: 'cena dovozu', man: 'lidská síla', research: 'výzkum' };
const modText = (mod) => Object.entries(mod).map(([k, v]) => `${MODS[k]} ${v > 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)} %`).join(', ');

function Meter({ label, value, target, hint, cls }) {
  return (
    <div className="pol-meter" title={hint}>
      <span><i>{label}</i><b>{pct(value)}</b><em>{target > value + 0.004 ? '▲' : target < value - 0.004 ? '▼' : ''} cíl {pct(target)}</em></span>
      <span className={`bar ${cls}`}><i style={{ width: `${(value * 100).toFixed(1)}%` }} /></span>
    </div>
  );
}

function Law({ cat }) {
  return (
    <section className="pol-law" aria-label={cat.n}>
      <h3>{cat.n}</h3>
      <ul>
        {cat.options.map((o) => (
          <li key={o.id} className={o.active ? 'on' : ''}>
            <button className="pol-opt" disabled={o.active || !!o.block} onClick={() => changeLaw(cat.cat, o.id)} title={o.block || o.info} aria-pressed={o.active}>
              <b>{o.n}</b>
              <span className="muted">{Object.keys(o.mod).length ? modText(o.mod) : 'bez příplatků'}</span>
              <i>{o.active ? 'platí' : o.pp ? `${o.pp} PM` : 'zdarma'}</i>
            </button>
            {!o.active && o.block ? <span className="pol-block">{o.block}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Advisor({ a }) {
  return (
    <section className="pol-adv" aria-label={a.n}>
      <div className="q-top">
        <h3>{a.n}</h3>
        {a.current ? <button className="icon-btn sm" onClick={() => dismissAdv(a.slot)} aria-label={`Propustit: ${a.current.n}`} title="Propustit (cena se nevrací)"><Icon name="close" size={14} /></button> : null}
      </div>
      <ul>
        {a.options.map((o) => (
          <li key={o.id} className={o.active ? 'on' : ''}>
            <button className="pol-opt" disabled={o.active || !!o.block} onClick={() => hireAdv(a.slot, o.id)} title={o.block || o.info} aria-pressed={o.active}>
              <b>{o.n}</b>
              <span className="muted">{modText(o.mod)}</span>
              <i>{o.active ? 've službě' : `${o.pp} PM`}</i>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Záložka Politika: stabilita, podpora války, politická moc (PM), zákony a poradci. */
export function PoliticsPanel() {
  const state = useGameSlow((s) => s, 600);
  const me = playerIdx(state);
  if (!me) return <div className="prod-screen politics-panel"><div className="prod-body"><p className="empty">Jako pozorovatel nevedete žádnou politiku.</p></div></div>;
  const p = politicsOf(state, me);
  return (
    <Screen cls="politics-panel" title="Politika" icon="politics" head={(
      <section className="pol-head" aria-label="Souhrn politiky">
        <Meter label="Stabilita" value={p.stab} target={p.target.stab} cls="hp" hint={`Výstup továren a staveb ×${fmtNum(p.stabMult, 2)}`} />
        <Meter label="Podpora války" value={p.ws} target={p.target.ws} cls="org" hint="Odemyká přísnější zákony a ovlivňuje příliv lidské síly" />
        <div className="pol-pp" title="Politická moc: platí se jí zákony a poradci"><Icon name="general" size={18} /><b>{Math.floor(p.pp)}</b><span className="muted">PM · +{p.income} za den</span></div>
        <p className="muted pol-sum">Výroba ×{fmtNum(p.out, 2)} · lidská síla ×{fmtNum(p.man, 2)} · spotřební zboží {pct(p.cons)}</p>
      </section>
    )}>
      <div className="prod-body">
        <div className="prod-cols">
          <div className="prod-left">
            <div className="sec-head"><h3>Zákony</h3></div>
            <div className="law-grid">{p.laws.map((c) => <Law key={c.cat} cat={c} />)}</div>
          </div>
          <aside className="prod-right">
            <div className="sec-head"><h3>Poradci</h3></div>
            {p.advisors.map((a) => <Advisor key={a.slot} a={a} />)}
          </aside>
        </div>
      </div>
    </Screen>
  );
}
