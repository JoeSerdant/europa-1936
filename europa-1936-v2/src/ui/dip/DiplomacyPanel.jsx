import { useMemo, useState } from 'react';
import { useGameSlow } from '../store.js';
import { Flag } from '../common/Flag.jsx';
import { Icon } from '../common/Icon.jsx';
import { diplomacyOf, DIP, AUTONOMY_NAMES, getWorld, EQUIP, EQUIP_IDS } from '../../engine/index.js';
import { playerIdx, annexOwnPuppet, tightenPuppet, loosenPuppet, justifyOn, declareWarOn, makePeaceWith, lendTo, guaranteeFor, revokeGuaranteeFor, foundBloc, inviteBloc, leaveBloc, selectLabel } from '../actions.js';
import { fmtNum } from '../format.js';
import { Screen } from '../common/Screen.jsx';

/** Půjčka a pronájem: výběr druhu výzbroje a odeslání čtvrtiny skladu příteli. */
function Lend({ c, me }) {
  const stock = useGameSlow((s) => s.mil.stock[me], 900);
  const [eq, setEq] = useState('pusky');
  const n = Math.floor((stock?.[eq] || 0) * DIP.LEND_MAX);
  return (
    <div className="ind-btns dip-lend">
      <select value={eq} onChange={(e) => setEq(e.target.value)} aria-label="Druh výzbroje">
        {EQUIP_IDS.map((id) => <option key={id} value={id}>{EQUIP[id].n} ({stock?.[id] || 0})</option>)}
      </select>
      <button className="sbtn" disabled={n < 1} onClick={() => lendTo(c.tag, eq)} title={`Poslat ${Math.round(DIP.LEND_MAX * 100)} % skladu spojenci`}>Poslat {n}</button>
    </div>
  );
}

const relCls = (r) => (r >= 25 ? 'good' : r <= -25 ? 'bad' : 'mid');

function Row({ c, me }) {
  const [open, setOpen] = useState(false);
  const flags = [];
  if (c.war) flags.push(['war', 'válka']);
  if (c.garMine) flags.push(['ally', 'vaše záruka']);
  else if (c.garTheirs) flags.push(['ally', 'zaručuje vás']);
  if (c.ally) flags.push(['ally', 'spojenec']);
  if (c.mine) flags.push(['ally', 'vaše loutka']);
  else if (c.overlord) flags.push(['cap', 'loutka']);
  if (c.capitulated) flags.push(['cap', 'kapitulovala']);
  if (c.just && !c.just.done) flags.push(['just', `ospravedlnění ${c.just.left} d`]);
  if (c.just && c.just.done) flags.push(['just', 'ospravedlněno']);
  return (
    <li className={`dip-row ${c.war ? 'war' : ''}`}>
      <button className="dip-head" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`${c.name}: vztah ${c.rel}`}>
        <Flag tag={c.tag} width={22} />
        <span className="nm">{c.name}</span>
        <span className={`rel ${relCls(c.rel)}`}>{c.rel > 0 ? '+' : ''}{c.rel}</span>
        {flags.slice(0, 2).map(([k, t]) => <i key={k} className={`dip-flag ${k}`}>{t}</i>)}
      </button>
      {open && (
        <div className="dip-body">
          {c.faction ? <p className="muted">Blok: {c.faction.nm} ({c.faction.mem.length})</p> : <p className="muted">Bez bloku.</p>}
          <div className="ind-btns">
            {c.war ? (
              <button className="sbtn" disabled={!!c.peaceBlock} onClick={() => makePeaceWith(c.tag)} title={c.peaceBlock || 'Navrhnout bílý mír'}>Navrhnout mír</button>
            ) : c.canDeclare ? (
              <button className="sbtn danger" onClick={() => declareWarOn(c.tag)} title="Vyhlásit válku (zapojí se bloky)">Vyhlásit válku</button>
            ) : (
              <button className="sbtn" disabled={!c.canJustify} onClick={() => justifyOn(c.tag)} title={c.justifyBlock || `Ospravedlnit válku: ${DIP.JUST_PP} PM, ${DIP.JUST_DAYS} dní`}>Ospravedlnit válku</button>
            )}
            {c.mine && <span className="muted" title="Autonomie loutky">{AUTONOMY_NAMES[c.auLevel]} · autonomie {Math.round(c.au)} %</span>}
            {c.mine && <button className="sbtn" disabled={!!c.tightBlock} onClick={() => tightenPuppet(c.tag)} title={c.tightBlock || `Utáhnout kontrolu (${DIP.AU_TIGHT_PP} PM): autonomie −${DIP.AU_TIGHT}`}>Utáhnout kontrolu</button>}
            {c.mine && <button className="sbtn" disabled={!!c.looseBlock} onClick={() => loosenPuppet(c.tag)} title={c.looseBlock || `Uvolnit kontrolu: autonomie +${DIP.AU_LOOSE}, lepší vztah`}>Uvolnit kontrolu</button>}
            {c.mine && <button className="sbtn danger" disabled={!!c.annexBlock} onClick={() => annexOwnPuppet(c.tag)} title={c.annexBlock || 'Anektovat loutku (stojí politickou moc)'}>Anektovat loutku</button>}
            {c.garMine
              ? <button className="sbtn" onClick={() => revokeGuaranteeFor(c.tag)} title="Zrušit záruku nezávislosti">Zrušit záruku</button>
              : <button className="sbtn" disabled={!!c.garBlock} onClick={() => guaranteeFor(c.tag)} title={c.garBlock || `Zaručit nezávislost (${DIP.GAR_PP} PM): napadne-li ji někdo, přidáte se do války`}>Zaručit nezávislost</button>}
            <button className="sbtn" disabled={!!c.inviteBlock} onClick={() => inviteBloc(c.tag)} title={c.inviteBlock || 'Pozvat do bloku'}>Pozvat do bloku</button>
            <button className="sbtn" onClick={() => selectLabel(getWorld().owners[c.o].cap, true)} title="Ukázat hlavní město"><Icon name="target" size={14} />Ukázat</button>
          </div>
          {c.friend ? <Lend c={c} me={me} /> : null}
          {c.war ? <p className="muted">Válečné skóre: {c.score > 0 ? '+' : ''}{fmtNum(c.score * 100, 0)} %</p> : null}
          {!c.war && !c.canDeclare && c.justifyBlock ? <p className="pol-block">{c.justifyBlock}</p> : null}
        </div>
      )}
    </li>
  );
}

/** Záložka Diplomacie: blok hráče a seznam zemí se vztahem, ospravedlněním, vyhlášením války, mírem a pozváním do bloku. */
export function DiplomacyPanel() {
  const state = useGameSlow((s) => s, 700);
  const me = playerIdx(state);
  const [name, setName] = useState('');
  const d = useMemo(() => (me ? diplomacyOf(state, me) : null), [state.dip, state.mil.wars, state.pol, state.ctrl, state.stateOwner, state.tick, me]);
  if (!me) return <div className="prod-screen dip-panel"><div className="prod-body"><p className="empty">Jako pozorovatel nevedete žádnou diplomacii.</p></div></div>;
  const list = [...d.list].sort((a, b) => (b.war - a.war) || (b.ally - a.ally) || (b.rel - a.rel));
  const f = d.faction;
  return (
    <Screen cls="dip-panel" title="Diplomacie" icon="dip" head={<p className="muted pol-sum dip-held">Území držené nepřáteli: {fmtNum(d.held.share * 100, 0)} % bodů (kapitulace od {Math.round(DIP.CAP_SHARE * 100)} %).</p>}>
      <div className="prod-body">
        <div className="prod-cols">
          <div className="prod-left">
            <div className="sec-head"><h3>Země ({list.length})</h3><span className="muted">klikněte na zemi pro akce</span></div>
            <ul className="dip-list">{list.map((c) => <Row key={c.o} c={c} me={me} />)}</ul>
          </div>
          <aside className="prod-right">
            <div className="sec-head"><h3>Váš blok</h3></div>
            <section aria-label="Blok" className="dip-bloc">
              {f ? (
                <>
                  <div className="q-top"><b>{f.nm}</b><span className="muted">{f.mem.length} {f.mem.length === 1 ? 'člen' : f.mem.length < 5 ? 'členové' : 'členů'}</span>
                    <button className="sbtn" onClick={leaveBloc} title="Opustit blok">Opustit</button></div>
                  <div className="chips">{f.mem.map((o) => <span key={o} className="chip chip-flag"><Flag tag={getWorld().owners[o].tag} width={16} />{getWorld().owners[o].name}{o === f.ldr ? <i>vedoucí</i> : null}</span>)}</div>
                </>
              ) : d.capitulated ? <p className="muted">Země kapitulovala.</p> : (
                <div className="dip-found">
                  <input type="text" value={name} maxLength={30} placeholder="Název bloku" aria-label="Název bloku" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
                  <button className="sbtn primary" disabled={!d.canFound} onClick={() => foundBloc(name)} title={`Založit blok: ${DIP.FAC_PP} PM`}>Založit blok</button>
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </Screen>
  );
}
