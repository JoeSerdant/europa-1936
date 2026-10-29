import { useMemo, useState } from 'react';
import { useGameSlow } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { Screen } from '../common/Screen.jsx';
import { Flag } from '../common/Flag.jsx';
import { agentsOf, opBlock, chanceOf, SPY, SPY_OPS, SPY_OP_IDS, getWorld, allCountries } from '../../engine/index.js';
import { playerIdx, hireSpy, beginOp, abortOp } from '../actions.js';

const pct = (v) => `${Math.round(v * 100)} %`;
const nameOf = (o) => getWorld().owners[o].name;

/** Okno Zpravodajská agentura (klávesa G): agenti, operace proti cizím zemím a přehled o zemích. */
export function SpyPanel() {
  const state = useGameSlow((s) => s, 700);
  const me = playerIdx(state);
  const [kind, setKind] = useState('recon');
  const [target, setTarget] = useState(0);
  const countries = useMemo(() => allCountries().filter((c) => c.idx !== me && !state.dip.cap[c.idx]).sort((a, b) => a.name.localeCompare(b.name, 'cs')), [state.dip.cap, me]);
  if (!me) return <div className="prod-screen spy-panel"><div className="prod-body"><p className="empty">Jako pozorovatel nevedete žádné zpravodajství.</p></div></div>;
  const e = state.spy.own[me], a = agentsOf(state, me);
  const t = target || (countries[0] && countries[0].idx);
  const block = t ? opBlock(state, me, kind, t) : 'Vyberte zemi.';
  const known = Object.entries(e.intel).sort((x, y) => y[1] - x[1]);
  return (
    <Screen cls="spy-panel" title="Zpravodajská agentura" icon="eye" head={(
      <div className="lg-use">
        <span title="Volní / všichni agenti"><i>Agenti</i><b>{a.free}/{a.total}</b></span>
        <span title="Nejvíc agentů"><i>Strop</i><b>{a.max}</b></span>
      </div>
    )}>
      <div className="prod-body">
        <div className="prod-cols">
          <div className="prod-left">
            <div className="sec-head"><h3>Probíhající operace ({e.ops.length})</h3>
              <button className="sbtn" disabled={a.total >= a.max || state.pol.own[me].pp < SPY.AGENT_PP} onClick={hireSpy} title={`Najmout agenta: ${SPY.AGENT_PP} PM`}><Icon name="plus" size={14} />Najmout agenta ({SPY.AGENT_PP} PM)</button></div>
            {!e.ops.length ? <p className="empty">Žádná operace. Zadejte ji vpravo.</p> : e.ops.map((o) => (
              <article key={o.id} className="spy-op" aria-label={SPY_OPS[o.k].n}>
                <Flag tag={getWorld().owners[o.t].tag} width={26} />
                <div><b>{SPY_OPS[o.k].n}</b><span className="muted"> · {nameOf(o.t)}</span><p className="muted">{SPY_OPS[o.k].info}</p></div>
                <div className="so-prog"><span className="bar prog"><i style={{ width: `${((SPY_OPS[o.k].days - o.left) / SPY_OPS[o.k].days) * 100}%` }} /></span><i>zbývá {o.left} dní · šance {pct(chanceOf(state, me, o.t))}</i></div>
                <button className="icon-btn sm" onClick={() => abortOp(o.id)} aria-label="Zrušit operaci" title="Zrušit (politická moc se nevrací)"><Icon name="close" size={14} /></button>
              </article>
            ))}
            <div className="sec-head"><h3>Přehled o zemích</h3><span className="muted">klesá s časem, zvyšuje ho průzkum</span></div>
            {!known.length ? <p className="empty">O žádné zemi zatím nic nevíte. Začněte průzkumem.</p> : (
              <ul className="spy-intel">
                {known.map(([o, v]) => <li key={o}><Flag tag={getWorld().owners[o].tag} width={20} /><span className="nm">{nameOf(Number(o))}</span><span className="bar prog"><i style={{ width: `${v * 100}%` }} /></span><b>{pct(v)}</b></li>)}
              </ul>
            )}
          </div>
          <aside className="prod-right">
            <section className="ind-new" aria-label="Nová operace">
              <div className="sec-head"><h3>Nová operace</h3></div>
              <div className="an-form">
                <label><span>Operace</span><select value={kind} onChange={(x) => setKind(x.target.value)} aria-label="Druh operace">{SPY_OP_IDS.map((k) => <option key={k} value={k}>{SPY_OPS[k].n} ({SPY_OPS[k].cost} PM, {SPY_OPS[k].days} dní)</option>)}</select></label>
                <p className="muted">{SPY_OPS[kind].info}</p>
                <label><span>Země</span><select value={t || ''} onChange={(x) => setTarget(Number(x.target.value))} aria-label="Cílová země">{countries.map((c) => <option key={c.idx} value={c.idx}>{c.name} · přehled {pct(e.intel[c.idx] || 0)}</option>)}</select></label>
                <p className="muted">{t ? `Šance na úspěch ${pct(chanceOf(state, me, t))}` : ''}</p>
                {block && <p className="pol-block">{block}</p>}
                <button className="sbtn primary" disabled={!!block} onClick={() => beginOp(kind, t)}>Zahájit operaci</button>
              </div>
            </section>
            <p className="muted">Neúspěšnou operaci může cíl odhalit: agent je ztracen a vztah se zhorší. Protišpionáž cíle (jeho agenti) šanci snižuje.</p>
          </aside>
        </div>
      </div>
    </Screen>
  );
}
