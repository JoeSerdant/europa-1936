import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { uiScale } from '../scale.js';
import { useGameSlow } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { focusTree, natOf, fxLinesOf, modLines, FOCUS_BY_ID, CONT_FOCUSES, CONT_IDS, contBlock, NAT } from '../../engine/index.js';
import { playerIdx, pickFocus, abortFocus, pickContinuous } from '../actions.js';
import { fmtDays } from '../format.js';
import { Screen } from '../common/Screen.jsx';
import { focusLayout, exclusivePairs, focusCat, focusMatches, FOCUS_CATS, FOCUS_CAT_ICON } from './focusLayout.js';

const PATH = { hist: 'Historická cesta', alt: 'Alternativní cesta' };   // M100
const STATUS = { done: 'Hotovo', active: 'Plní se', available: 'K dispozici', locked: 'Zamčeno', excluded: 'Vyloučeno' };

// UI1: strom cílů jako v HOI4 – kruhová ikona s názvem, rodič uprostřed nad potomky (`focusLayout`), rovné lomené spojnice,
// značka „!“ mezi vzájemně se vylučujícími cíli; účinky jsou v informačním okně při najetí myší (ne na kartě).
const CW = 136, RH = 124, NODE_W = 124, ICON = 52, NODE_H = 110;   // NODE_H = ikona + jmenovka + dny
const cx = (p) => p.col * CW + CW / 2;
const top = (p) => p.row * RH + 6;

function FocusNode({ f, p, dim, cat, onHover }) {
  const avail = f.status === 'available';
  const prog = f.status === 'active' ? Math.min(1, f.p / f.days) : f.status === 'done' ? 1 : 0;
  const r = ICON / 2 - 3, len = 2 * Math.PI * r;
  const body = (
    <>
      <span className="fn-icon" style={{ width: ICON, height: ICON }}>
        <svg className="fn-svg" width={ICON} height={ICON} aria-hidden="true">
          <circle cx={ICON / 2} cy={ICON / 2} r={r} className="fn-ring" />
          {prog > 0 ? <circle cx={ICON / 2} cy={ICON / 2} r={r} className="fn-prog" strokeDasharray={`${len * prog} ${len}`} transform={`rotate(-90 ${ICON / 2} ${ICON / 2})`} /> : null}
        </svg>
        <Icon name={FOCUS_CAT_ICON[cat] || 'flag'} size={24} />
        {f.path ? <i className={`fn-path ${f.path}`} title={PATH[f.path]}>{f.path === 'alt' ? 'A' : 'H'}</i> : null}
      </span>
      <span className="fn-name">{f.n}</span>
      <span className="fn-days">{f.status === 'active' ? `${fmtDays(f.left)}` : f.status === 'done' ? '✓' : fmtDays(f.days)}</span>
    </>
  );
  const cls = `focus-card ${f.status}${dim ? ' dim' : ''}`;
  const style = { left: cx(p) - NODE_W / 2, top: top(p), width: NODE_W };
  const hov = { onPointerEnter: () => onHover(f.id), onPointerLeave: () => onHover(null) };
  return avail
    ? <button className={cls} style={style} aria-label={`Zahájit cíl ${f.n}`} onClick={() => pickFocus(f.id)} {...hov}>{body}</button>
    : <article className={cls} style={style} aria-label={f.n} {...hov}>{body}</article>;
}

/** Spojnice předpokladů jako v HOI4: svisle dolů pod rodiče, vodorovně nad cíl, svisle dolů; `any` čárkovaně; vylučující se cíle červeně s „!“. */
function FocusLinks({ tree, pos, main, pairs, w, h }) {
  const at = new Map(tree.map((f) => [f.id, f]));
  const paths = [];
  for (const f of tree) for (const r of [...f.req, ...f.any]) {
    const pa = at.get(r), pp = pos.get(r), pf = pos.get(f.id);
    if (!pa || !pp || !pf) continue;
    const x1 = cx(pp), y1 = top(pp) + NODE_H, x2 = cx(pf), y2 = top(pf) - 2, my = y2 - 14;
    paths.push(<path key={`${r}>${f.id}`} d={`M${x1} ${y1} V${my} H${x2} V${y2}`} className={`${pa.status === 'done' ? 'done' : ''} ${f.any.includes(r) ? 'any' : ''} ${main.get(f.id) === r ? '' : 'side'}`} />);
  }
  const marks = pairs.map(([a, b]) => {
    const pa = pos.get(a), pb = pos.get(b);
    const xa = cx(pa), xb = cx(pb), y = top(pa) + ICON / 2, x0 = Math.min(xa, xb) + ICON / 2 + 4, x1 = Math.max(xa, xb) - ICON / 2 - 4, mx = (xa + xb) / 2;
    return (
      <g key={`${a}!${b}`} className="fx-excl">
        {x1 > x0 ? <path d={`M${x0} ${y} H${x1}`} /> : null}
        <circle cx={mx} cy={y} r={8} /><text x={mx} y={y + 4} textAnchor="middle">!</text>
      </g>
    );
  });
  return <svg className="focus-links" width={w} height={h} aria-hidden="true">{paths}{marks}</svg>;
}

/** Informační okno o cíli pod kurzorem (místo bubliny – účinky, vyloučení, chybějící předpoklady). */
function FocusInfo({ f, cat }) {
  if (!f) return null;
  const lines = fxLinesOf(f.fx).concat(modLines(f.mod));
  const need = f.status === 'locked' ? f.req.filter((r) => FOCUS_BY_ID[r]).map((r) => FOCUS_BY_ID[r].n) : [];
  const any = f.status === 'locked' && f.any.length ? f.any.map((r) => FOCUS_BY_ID[r].n) : [];
  const ex = f.excl.map((r) => FOCUS_BY_ID[r].n);
  return (
    <aside className="focus-info" aria-label={`Cíl ${f.n}`}>
      <header><Icon name={FOCUS_CAT_ICON[cat] || 'flag'} size={18} /><b>{f.n}</b><span className="muted">{fmtDays(f.days)}</span></header>
      <span className={`tech-st ${f.status}`}>{STATUS[f.status]}{f.status === 'active' ? ` · zbývá ${fmtDays(f.left)}` : ''}{f.path ? ` · ${PATH[f.path]}` : ''}</span>
      {lines.length ? <ul className="tech-fx">{lines.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="muted">Bez přímého účinku.</p>}
      {f.info ? <p className="muted">{f.info}</p> : null}
      {ex.length ? <p className="fi-ex">Vylučuje: {ex.join(', ')}</p> : null}
      {need.length ? <p className="fi-need">Chybí: {need.join(', ')}</p> : null}
      {any.length ? <p className="fi-need">Stačí jeden z: {any.join(', ')}</p> : null}
      {f.status === 'available' ? <p className="fi-go">Klikněte pro zahájení</p> : null}
    </aside>
  );
}

function FocusTree({ tree, lay, z, q, cat, cats, onHover }) {
  const w = lay.cols * CW, h = lay.rows * RH + 10;
  const pairs = useMemo(() => exclusivePairs(tree, lay.pos), [tree, lay]);
  return (
    <div className="focus-zoom" style={{ width: w * z + 12, height: h * z + 16 }}>
      <div className={`focus-tree ${z < 0.6 ? 'far' : ''}`} style={{ width: w, height: h, transform: `scale(${z})` }}>
        <FocusLinks tree={tree} pos={lay.pos} main={lay.main} pairs={pairs} w={w} h={h} />
        {tree.map((f) => <FocusNode key={f.id} f={f} p={lay.pos.get(f.id)} cat={cats.get(f.id)} dim={(cat && cats.get(f.id) !== cat) || !focusMatches(f, q)} onHover={onHover} />)}
      </div>
    </div>
  );
}

// M103: přiblížení stromu (kolečko myši ke kurzoru, tažení posouvá, tlačítka); úroveň se pamatuje po dobu hry
const Z_MIN = 0.15, Z_MAX = 1.4;   // UI1: celý strom se vejde na obrazovku
let lastZoom = 1;
const clampZ = (z) => Math.max(Z_MIN, Math.min(Z_MAX, Math.round(z * 100) / 100));

function useTreeZoom(tree, lay) {
  const ref = useRef(null), anchor = useRef(null), drag = useRef(null);
  const [z, setZ] = useState(lastZoom);
  lastZoom = z;
  const size = () => ({ w: lay.cols * CW, h: lay.rows * RH + 10 });
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
    const k = uiScale();   // UI: souřadnice myši v px okna → px zvětšeného rozhraní
    zoomAt(z * (e.deltaY < 0 ? 1.12 : 1 / 1.12), (e.clientX - r.left) / k, (e.clientY - r.top) / k);
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
    scrollToFocus(el, lay.pos.get(f.id), z);
  };
  const handlers = {
    onPointerDown: (e) => {
      if (e.button !== 0 || e.target.closest('button')) return;
      drag.current = { x: e.clientX, y: e.clientY, l: ref.current.scrollLeft, t: ref.current.scrollTop };
      ref.current.classList.add('dragging');
    },
    onPointerMove: (e) => { const d = drag.current; if (!d) return; const k = uiScale(); ref.current.scrollLeft = d.l - (e.clientX - d.x) / k; ref.current.scrollTop = d.t - (e.clientY - d.y) / k; },
    onPointerUp: () => { drag.current = null; if (ref.current) ref.current.classList.remove('dragging'); },
    onPointerLeave: () => { drag.current = null; if (ref.current) ref.current.classList.remove('dragging'); },
  };
  return { ref, z, handlers, goTo: (id) => { const el = ref.current, p = lay.pos.get(id); if (el && p) scrollToFocus(el, p, z); }, zoomIn: () => zoomAt(z * 1.25, ...center()), zoomOut: () => zoomAt(z / 1.25, ...center()), fit, toCurrent };
}

function scrollToFocus(el, p, z) {
  el.scrollTo({ left: Math.max(0, cx(p) * z - el.clientWidth / 2), top: Math.max(0, (top(p) + RH / 2) * z - el.clientHeight / 2), behavior: 'smooth' });
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

/** Záložka Cíle: národní strom cílů jako v HOI4 (UI1), hledání a zvýraznění druhu, plněný cíl a průběžné cíle. */
export function NatPanel() {
  const state = useGameSlow((s) => s, 700);
  const me = playerIdx(state);
  const tree = useMemo(() => (me ? focusTree(state, me) : []), [state.nat, me]);
  const lay = useMemo(() => focusLayout(tree), [me, tree.length]);
  const cats = useMemo(() => new Map(tree.map((f) => [f.id, focusCat(f)])), [me, tree.length]);
  const zm = useTreeZoom(tree, lay);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [hover, setHover] = useState(null);
  if (!me) return <div className="prod-screen nat-panel"><div className="prod-body"><p className="empty">Jako pozorovatel nevedete žádné národní cíle.</p></div></div>;
  const n = natOf(state, me);
  const cur = tree.find((f) => f.status === 'active');
  const cont = state.nat.own[me].cont || '';
  const hf = hover ? tree.find((f) => f.id === hover) : null;
  const find = (text) => { setQ(text); const m = text.trim() ? tree.find((f) => focusMatches(f, text)) : null; if (m) zm.goTo(m.id); };
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
      <section className="focus-tools" aria-label="Filtr a hledání">
        <div className="ft-cats" role="toolbar" aria-label="Druh cíle">
          {FOCUS_CATS.map((c) => <button key={c.id} className={`icon-btn ${cat === c.id ? 'on' : ''}`} aria-pressed={cat === c.id} aria-label={c.n} title={`Zvýraznit: ${c.n}`} onClick={() => setCat(cat === c.id ? '' : c.id)}><Icon name={c.icon} size={16} /></button>)}
        </div>
        <label className="ft-search"><Icon name="eye" size={14} /><input type="search" value={q} placeholder="Hledat cíl…" aria-label="Hledat cíl" onChange={(e) => find(e.target.value)} /></label>
        <span className="ft-cont">
          <span className="muted" title={`${NAT.CONT_PP} PM denně, jen když se neplní běžný cíl`}>Průběžný cíl</span>
          {CONT_IDS.map((id) => {
            const on = cont === id, why = on ? null : contBlock(state, me, id);
            return <button key={id} className={`sbtn ${on ? 'primary' : ''}`} aria-pressed={on} disabled={!on && !!why} title={`${CONT_FOCUSES[id].info} ${modLines(CONT_FOCUSES[id].mod).join(', ')}${why ? ` – ${why}` : ''}`} onClick={() => pickContinuous(on ? '' : id)}>{CONT_FOCUSES[id].n}</button>;
          })}
        </span>
      </section>
      <div className="focus-wrap">
        <div className="prod-body tech-body focus-scroll" ref={zm.ref} {...zm.handlers}><FocusTree tree={tree} lay={lay} z={zm.z} q={q} cat={cat} cats={cats} onHover={setHover} /></div>
        <ZoomBar zm={zm} />
        <FocusInfo f={hf} cat={hf ? cats.get(hf.id) : ''} />
      </div>
    </Screen>
  );
}
