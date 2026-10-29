import { useGameSlow } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { politicsOf, focusTree } from '../../engine/index.js';
import { COUNTRIES, IDEOLOGIES } from '../../data/countries.js';
import { IDEO_ORDER, ideologySupport } from '../../data/politics/ideology.js';
import { Flag } from '../common/Flag.jsx';
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


/** Karta státu vlevo: portrét vůdce (vlastní silueta), vláda, podpora ideologií a „národní duchové“ (platné zákony, poradci, splněné cíle). */
function LeaderCard({ tag, p, spirits }) {
  const info = COUNTRIES[tag];
  const sup = ideologySupport(info.ideology, p.stab);
  return (
    <aside className="leader-card" aria-label="Vůdce a vláda">
      <div className="lc-portrait" aria-hidden="true">
        <svg viewBox="0 0 120 140" width="100%" height="100%" role="img">
          <defs><linearGradient id="lcg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2b4258" /><stop offset="1" stopColor="#0f1821" /></linearGradient></defs>
          <rect width="120" height="140" fill="url(#lcg)" />
          <circle cx="60" cy="52" r="23" fill="#0b121a" opacity="0.85" />
          <path d="M14 140c2-34 20-50 46-50s44 16 46 50z" fill="#0b121a" opacity="0.85" />
        </svg>
        <span className="lc-flag"><Flag tag={tag} width={34} /></span>
      </div>
      <h3>{info.leader}</h3>
      <p className="muted">{info.government}</p>
      <ul className="lc-ideo" aria-label="Podpora ideologií (odhad)">
        {IDEO_ORDER.map((k) => (
          <li key={k} className={k === info.ideology ? 'main' : ''} title={`${IDEOLOGIES[k].name}: ${pct(sup[k])}`}>
            <i style={{ background: IDEOLOGIES[k].color }} /><span>{IDEOLOGIES[k].name}</span><b>{pct(sup[k])}</b>
            <span className="bar"><i style={{ width: `${sup[k] * 100}%`, background: IDEOLOGIES[k].color }} /></span>
          </li>
        ))}
      </ul>
      <h4>Národní duch</h4>
      <ul className="lc-spirits">
        {spirits.map((x) => <li key={x.k} className={x.kind} title={x.hint}>{x.n}</li>)}
        {!spirits.length && <li className="muted">Zatím žádný</li>}
      </ul>
    </aside>
  );
}

/** Záložka Politika: stabilita, podpora války, politická moc (PM), zákony a poradci. */
export function PoliticsPanel() {
  const state = useGameSlow((s) => s, 600);
  const me = playerIdx(state);
  if (!me) return <div className="prod-screen politics-panel"><div className="prod-body"><p className="empty">Jako pozorovatel nevedete žádnou politiku.</p></div></div>;
  const p = politicsOf(state, me);
  const spirits = [
    ...p.laws.map((c) => { const o = c.options.find((x) => x.active); return { k: `l${c.cat}`, n: o.n, kind: 'law', hint: `${c.n}: ${o.info}` }; }),
    ...p.advisors.filter((a) => a.current).map((a) => ({ k: `a${a.slot}`, n: a.current.n, kind: 'adv', hint: `${a.n}: ${a.current.info}` })),
    ...focusTree(state, me).filter((f) => f.status === 'done').map((f) => ({ k: `f${f.id}`, n: f.n, kind: 'focus', hint: f.info || 'Splněný národní cíl' })),
  ];
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
        <div className="prod-cols pol-cols">
          <LeaderCard tag={state.player} p={p} spirits={spirits} />
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
