import { useMemo } from 'react';
import { useGameSlow } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { focusTree, natOf, fxLinesOf, modLines, FOCUS_BY_ID, CONT_FOCUSES, CONT_IDS, contBlock, NAT } from '../../engine/index.js';
import { playerIdx, pickFocus, abortFocus, pickContinuous } from '../actions.js';
import { fmtDays } from '../format.js';
import { Screen } from '../common/Screen.jsx';

const STATUS = { done: 'Hotovo', active: 'Plní se', available: 'K dispozici', locked: 'Zamčeno', excluded: 'Vyloučeno' };

// M94: strom cílů jako mřížka (sloupce = větve, řádky = hloubka) s pevnou velikostí karet a spojnicemi předpokladů
const CW = 214, RH = 138, CARD_H = 122;

function FocusCard({ f }) {
  const lines = fxLinesOf(f.fx).concat(modLines(f.mod));
  const need = f.status === 'locked' ? f.req.filter((r) => FOCUS_BY_ID[r]).map((r) => FOCUS_BY_ID[r].n) : [];
  const any = f.status === 'locked' && f.any.length ? f.any.map((r) => FOCUS_BY_ID[r].n) : [];
  const ex = f.excl.map((r) => FOCUS_BY_ID[r].n);
  const tip = [f.n, ...lines, f.info, ex.length ? `Vylučuje: ${ex.join(', ')}` : '', need.length ? `Chybí: ${need.join(', ')}` : '', any.length ? `Stačí jeden z: ${any.join(', ')}` : ''].filter(Boolean).join('\n');
  return (
    <article className={`focus-card ${f.status}`} aria-label={f.n} title={tip} style={{ left: f.x * CW, top: f.y * RH, width: CW - 14, height: CARD_H }}>
      <header><b>{f.n}</b><span className="muted">{fmtDays(f.days)}</span></header>
      {lines.length ? <ul className="tech-fx">{lines.map((x) => <li key={x}>{x}</li>)}</ul> : null}
      {ex.length ? <p className="muted fc-ex">Vylučuje: {ex.join(', ')}</p> : null}
      <footer>
        <span className={`tech-st ${f.status}`}>{STATUS[f.status]}{f.status === 'active' ? ` · ${fmtDays(f.left)}` : ''}</span>
        {f.status === 'available' ? <button className="sbtn primary" onClick={() => pickFocus(f.id)}>Zahájit</button> : null}
      </footer>
    </article>
  );
}

/** Spojnice předpokladů: od spodku předpokladu ke hornímu okraji cíle (lomená čára); `any` čárkovaně. */
function FocusLinks({ tree, w, h }) {
  const at = new Map(tree.map((f) => [f.id, f]));
  const paths = [];
  for (const f of tree) for (const r of [...f.req, ...f.any]) {
    const p = at.get(r);
    if (!p) continue;
    const x1 = p.x * CW + (CW - 14) / 2, y1 = p.y * RH + CARD_H, x2 = f.x * CW + (CW - 14) / 2, y2 = f.y * RH, my = y2 - (RH - CARD_H) / 2;
    paths.push(<path key={`${r}>${f.id}`} d={`M${x1} ${y1} V${my} H${x2} V${y2}`} className={`${p.status === 'done' ? 'done' : ''} ${f.any.includes(r) ? 'any' : ''}`} />);
  }
  return <svg className="focus-links" width={w} height={h} aria-hidden="true">{paths}</svg>;
}

function FocusTree({ tree }) {
  const w = (Math.max(0, ...tree.map((f) => f.x)) + 1) * CW, h = (Math.max(0, ...tree.map((f) => f.y)) + 1) * RH;
  return (
    <div className="focus-tree" style={{ width: w, height: h }}>
      <FocusLinks tree={tree} w={w} h={h} />
      {tree.map((f) => <FocusCard key={f.id} f={f} />)}
    </div>
  );
}

/** Záložka Cíle: národní strom cílů (mřížka podle polohy), aktuálně plněný cíl a jeho zrušení. */
export function NatPanel() {
  const state = useGameSlow((s) => s, 700);
  const me = playerIdx(state);
  const tree = useMemo(() => (me ? focusTree(state, me) : []), [state.nat, me]);
  if (!me) return <div className="prod-screen nat-panel"><div className="prod-body"><p className="empty">Jako pozorovatel nevedete žádné národní cíle.</p></div></div>;
  const n = natOf(state, me);
  const cur = tree.find((f) => f.status === 'active');
  const cont = state.nat.own[me].cont || '';
  return (
    <Screen cls="nat-panel" title="Národní cíle" icon="flag" head={<div className="rs-sum"><span className="stat-cell"><i>Hotovo</i><b>{n.done}/{n.total}</b></span></div>}>
      <section className="rs-head rs-slots" aria-label="Plněný cíl">
        {cur ? (
          <div className="rs-slot">
            <div className="q-top">
              <b>{cur.n}</b><span className="muted">zbývá {fmtDays(cur.left)}</span>
              <button className="icon-btn sm" onClick={abortFocus} aria-label={`Přerušit cíl ${cur.n}`} title="Přerušit (postup se ztratí)"><Icon name="close" size={14} /></button>
            </div>
            <span className="bar prog"><i style={{ width: `${((cur.p / cur.days) * 100).toFixed(1)}%` }} /></span>
          </div>
        ) : <div className="rs-slot empty"><span className="muted">Žádný cíl se neplní – vyberte níže.</span></div>}
      </section>
      <section className="cont-row" aria-label="Průběžné cíle">
        <span className="muted">Průběžný cíl <i>({NAT.CONT_PP} PM denně, jen když se neplní běžný cíl)</i></span>
        {CONT_IDS.map((id) => {
          const on = cont === id, why = on ? null : contBlock(state, me, id);
          return <button key={id} className={`sbtn ${on ? 'primary' : ''}`} aria-pressed={on} disabled={!on && !!why} title={`${CONT_FOCUSES[id].info} ${modLines(CONT_FOCUSES[id].mod).join(', ')}${why ? ` – ${why}` : ''}`} onClick={() => pickContinuous(on ? '' : id)}>{CONT_FOCUSES[id].n}</button>;
        })}
      </section>
      <div className="prod-body tech-body focus-scroll"><FocusTree tree={tree} /></div>
    </Screen>
  );
}
