import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useGameSlow } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { focusTree, natOf, fxLinesOf, modLines, FOCUS_BY_ID, CONT_FOCUSES, CONT_IDS, contBlock, NAT } from '../../engine/index.js';
import { playerIdx, pickFocus, abortFocus, pickContinuous } from '../actions.js';
import { fmtDays } from '../format.js';
import { Screen } from '../common/Screen.jsx';

const PATH = { hist: 'Historická cesta', alt: 'Alternativní cesta' };   // M100
const STATUS = { done: 'Hotovo', active: 'Plní se', available: 'K dispozici', locked: 'Zamčeno', excluded: 'Vyloučeno' };

// M94: strom cílů jako mřížka (sloupce = větve, řádky = hloubka) s pevnou velikostí karet a spojnicemi předpokladů
const CW = 214, RH = 138, CARD_H = 122;

function FocusCard({ f }) {
  const lines = fxLinesOf(f.fx).concat(modLines(f.mod));
  const need = f.status === 'locked' ? f.req.filter((r) => FOCUS_BY_ID[r]).map((r) => FOCUS_BY_ID[r].n) : [];
  const any = f.status === 'locked' && f.any.length ? f.any.map((r) => FOCUS_BY_ID[r].n) : [];
  const ex = f.excl.map((r) => FOCUS_BY_ID[r].n);
  const tip = [f.n, PATH[f.path] || '', ...lines, f.info, ex.length ? `Vylučuje: ${ex.join(', ')}` : '', need.length ? `Chybí: ${need.join(', ')}` : '', any.length ? `Stačí jeden z: ${any.join(', ')}` : ''].filter(Boolean).join('\n');
  return (
    <article className={`focus-card ${f.status}${f.path ? ` path-${f.path}` : ''}`} aria-label={f.n} title={tip} style={{ left: f.x * CW, top: f.y * RH, width: CW - 14, height: CARD_H }}>
      <header><b>{f.n}</b><span className="muted">{f.path ? <i className="fc-path" title={PATH[f.path]}>{f.path === 'alt' ? 'ALT' : 'HIST'}</i> : null}{fmtDays(f.days)}</span></header>
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

function FocusTree({ tree, z }) {
  const w = (Math.max(0, ...tree.map((f) => f.x)) + 1) * CW, h = (Math.max(0, ...tree.map((f) => f.y)) + 1) * RH;
  return (
    <div className="focus-zoom" style={{ width: w * z + 12, height: h * z + 16 }}>
      <div className={`focus-tree ${z < 0.6 ? 'far' : ''}`} style={{ width: w, height: h, transform: `scale(${z})` }}>
        <FocusLinks tree={tree} w={w} h={h} />
        {tree.map((f) => <FocusCard key={f.id} f={f} />)}
      </div>
    </div>
  );
}

// M103: přiblížení stromu (kolečko myši ke kurzoru, tažení posouvá, tlačítka); úroveň se pamatuje po dobu hry
const Z_MIN = 0.25, Z_MAX = 1.4;
let lastZoom = 1;
const clampZ = (z) => Math.max(Z_MIN, Math.min(Z_MAX, Math.round(z * 100) / 100));

function useTreeZoom(tree) {
  const ref = useRef(null), anchor = useRef(null), drag = useRef(null);
  const [z, setZ] = useState(lastZoom);
  lastZoom = z;
  const size = () => ({ w: (Math.max(0, ...tree.map((f) => f.x)) + 1) * CW, h: (Math.max(0, ...tree.map((f) => f.y)) + 1) * RH });
  const zoomAt = (nz, mx, my) => {
    const el = ref.current;
    nz = clampZ(nz);
    if (!el || nz === z) return;
    anchor.current = { cx: (el.scrollLeft + mx) / z, cy: (el.scrollTop + my) / z, mx, my };
    setZ(nz);
  };
  useLayoutEffect(() => {
    const el = ref.current, a = anchor.current;
    if (!el || !a) return;
    anchor.current = null;
    el.scrollLeft = a.cx * z - a.mx;
    el.scrollTop = a.cy * z - a.my;
  }, [z]);
  // kolečko myši přibližuje ke kurzoru (Shift + kolečko = vodorovný posun); posluchač není pasivní, aby se strom zároveň neposouval
  const wheel = useRef(null);
  wheel.current = (e) => {
    if (e.shiftKey) return;
    e.preventDefault();
    const r = ref.current.getBoundingClientRect();
    zoomAt(z * (e.deltaY < 0 ? 1.12 : 1 / 1.12), e.clientX - r.left, e.clientY - r.top);
  };
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fn = (e) => wheel.current(e);
    el.addEventListener('wheel', fn, { passive: false });
    return () => el.removeEventListener('wheel', fn);
  }, [ref.current]);
  const center = () => { const el = ref.current; return el ? [el.clientWidth / 2, el.clientHeight / 2] : [0, 0]; };
  const fit = () => { const el = ref.current; if (!el) return; const { w, h } = size(); anchor.current = { cx: 0, cy: 0, mx: 0, my: 0 }; setZ(clampZ(Math.min(1, el.clientWidth / (w + 12), el.clientHeight / (h + 16)))); };
  const toCurrent = () => {
    const el = ref.current;
    const f = tree.find((x) => x.status === 'active') || tree.find((x) => x.status === 'available');
    if (!el || !f) return;
    el.scrollTo({ left: Math.max(0, (f.x * CW + CW / 2) * z - el.clientWidth / 2), top: Math.max(0, (f.y * RH + RH / 2) * z - el.clientHeight / 2), behavior: 'smooth' });
  };
  const handlers = {
    onPointerDown: (e) => {
      if (e.button !== 0 || e.target.closest('button')) return;
      drag.current = { x: e.clientX, y: e.clientY, l: ref.current.scrollLeft, t: ref.current.scrollTop };
      ref.current.classList.add('dragging');
    },
    onPointerMove: (e) => { const d = drag.current; if (!d) return; ref.current.scrollLeft = d.l - (e.clientX - d.x); ref.current.scrollTop = d.t - (e.clientY - d.y); },
    onPointerUp: () => { drag.current = null; if (ref.current) ref.current.classList.remove('dragging'); },
    onPointerLeave: () => { drag.current = null; if (ref.current) ref.current.classList.remove('dragging'); },
  };
  return { ref, z, handlers, zoomIn: () => zoomAt(z * 1.25, ...center()), zoomOut: () => zoomAt(z / 1.25, ...center()), fit, toCurrent };
}

function ZoomBar({ zm }) {
  return (
    <div className="focus-zbar" role="toolbar" aria-label="Přiblížení stromu">
      <button className="icon-btn sm" onClick={zm.zoomOut} aria-label="Oddálit" title="Oddálit (kolečko myši)"><Icon name="minus" size={14} /></button>
      <span className="fz-v" title="Přiblížení">{Math.round(zm.z * 100)} %</span>
      <button className="icon-btn sm" onClick={zm.zoomIn} aria-label="Přiblížit" title="Přiblížit (kolečko myši)"><Icon name="plus" size={14} /></button>
      <button className="icon-btn sm" onClick={zm.fit} aria-label="Celý strom" title="Celý strom"><Icon name="regions" size={14} /></button>
      <button className="icon-btn sm" onClick={zm.toCurrent} aria-label="K plněnému cíli" title="K plněnému nebo dostupnému cíli"><Icon name="target" size={14} /></button>
    </div>
  );
}

/** Záložka Cíle: národní strom cílů (mřížka podle polohy), aktuálně plněný cíl a jeho zrušení. */
export function NatPanel() {
  const state = useGameSlow((s) => s, 700);
  const me = playerIdx(state);
  const tree = useMemo(() => (me ? focusTree(state, me) : []), [state.nat, me]);
  const zm = useTreeZoom(tree);
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
      <div className="focus-wrap">
        <div className="prod-body tech-body focus-scroll" ref={zm.ref} {...zm.handlers}><FocusTree tree={tree} z={zm.z} /></div>
        <ZoomBar zm={zm} />
      </div>
    </Screen>
  );
}
