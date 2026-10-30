import { useMemo } from 'react';
import { useGameSlow, useUi } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { researchOf, techList, CATS, CAT_IDS, TECHS, EQUIP, fxLines, BATTALIONS, SUPPORT } from '../../engine/index.js';
import { playerIdx, closeSide, researchTech, stopResearch, setTechCat } from '../actions.js';
import { fmtDays, fmtNum } from '../format.js';
import { layoutOf, COLW, NODEW, NODEH, ROWH, Y0 } from './layout.js';

const pct = (v) => `${Math.round(Math.max(0, Math.min(1, v)) * 100)} %`;
const STATUS = { done: 'Hotovo', active: 'Zkoumá se', available: 'K dispozici', locked: 'Zamčeno' };

/** Co technologie odemyká (prapor, rota, výzbroj) – texty z dat jednotek. */
function unlocks(id) {
  const out = [];
  for (const d of [...Object.values(BATTALIONS), ...Object.values(SUPPORT), ...Object.values(EQUIP)]) if (d.unlock === id) out.push(d.n);
  return out;
}

function Slot({ s }) {
  if (!s.id) return <div className="rs-slot empty"><span className="muted">Volný slot – vyberte technologii níže.</span></div>;
  return (
    <div className="rs-slot" aria-label={`Slot ${s.slot + 1}: ${s.tech.n}`}>
      <div className="q-top">
        <b>{s.tech.n}</b>
        <span className="muted">{s.eta < 0 ? '–' : `za ${fmtDays(s.eta)}`}{s.ahead > 0 ? ` · předstih ${fmtNum(s.ahead, 1)} r.` : ''}{s.share > 0 ? ` · sdílení bloku +${Math.round(s.share * 100)} %` : ''}</span>
        <button className="icon-btn sm" onClick={() => stopResearch(s.slot)} aria-label={`Přerušit výzkum ${s.tech.n}`} title="Přerušit (postup se zachová)"><Icon name="close" size={14} /></button>
      </div>
      <span className="bar prog"><i style={{ width: `${(s.p * 100).toFixed(1)}%` }} /></span>
    </div>
  );
}

const LV_NAMES = { pusky: 'Pušky', dela: 'Děla', pdela: 'PT děla', auta: 'Auta', vozy: 'Vozidla', ltanky: 'Lehké tanky', mtanky: 'Střední tanky', htanky: 'Těžké tanky', podpora: 'Podpora' };

const maxYear = Math.max(...Object.values(TECHS).map((t) => t.year));

function Node({ t, x, y }) {
  const fx = fxLines(t.id).concat(unlocks(t.id).map((n) => `Odemyká: ${n}`));
  const can = t.status === 'available';
  return (
    <article className={`tech-card tn ${t.status}`} style={{ left: x, top: y, width: NODEW, height: NODEH }} aria-label={`${t.n} – ${STATUS[t.status]}`} tabIndex={0}>
      <b title={t.n}>{t.n}</b>
      <span className="tn-line">
        <span className={`tech-st ${t.status}`}>{STATUS[t.status]}{t.status === 'active' ? ` ${pct(t.p)}` : t.p > 0 && can ? ` · ${pct(t.p)}` : ''}</span>
        {can ? <button className="sbtn primary" onClick={() => researchTech(t.id)} aria-label={`Zkoumat ${t.n}`}>Zkoumat</button> : null}
      </span>
      {t.status === 'active' || (can && t.p > 0) ? <span className="bar prog"><i style={{ width: `${(t.p * 100).toFixed(1)}%` }} /></span> : null}
      <div className="tn-pop" role="tooltip">
        <header><b>{t.n}</b><span className="muted">{t.year} · {fmtDays(t.days)}</span></header>
        {fx.length > 0 ? <ul className="tech-fx">{fx.map((q) => <li key={q}>{q}</li>)}</ul> : null}
        <p className="muted">{t.info}</p>
        {t.status === 'locked' ? <p className="muted">Chybí: {t.missing.map((r) => TECHS[r].n).join(', ')}</p> : null}
        {can ? <p className="muted">{t.ahead > 0 ? `předstih ${fmtNum(t.ahead, 1)} r. · ` : ''}{t.share > 0 ? `sdílení +${Math.round(t.share * 100)} % · ` : ''}asi {fmtDays(t.eta)}</p> : null}
      </div>
    </article>
  );
}

/** Jeden obor jako časová osa: sloupce = roky, dráhy = větve, čáry vedou od předpokladu k technologii (podobně jako v HOI4). */
function Tree({ cat, items }) {
  const { pos, lanes } = useMemo(() => layoutOf(items), [items]);
  const cols = maxYear - Y0 + 1;
  const W = cols * COLW, H = Math.max(1, lanes) * ROWH;
  const at = (id) => ({ x: pos[id].col * COLW, y: pos[id].lane * ROWH });
  const byId = Object.fromEntries(items.map((t) => [t.id, t]));
  const links = [];
  for (const t of items) for (const r of t.req) if (byId[r]) {
    const a = at(r), b = at(t.id);
    const x1 = a.x + NODEW, y1 = a.y + NODEH / 2, x2 = b.x, y2 = b.y + NODEH / 2, mx = x2 - (COLW - NODEW) / 2;
    links.push({ k: `${r}>${t.id}`, d: `M${x1},${y1} H${mx} V${y2} H${x2}`, done: byId[r].status === 'done', on: byId[t.id].status === 'active' || byId[t.id].status === 'available' });
  }
  return (
    <section className="tech-tree" aria-label={CATS[cat].n}>
      <h3>{CATS[cat].n}</h3>
      <div className="tl-canvas" style={{ width: W, height: H }}>
        <div className="tl-years" aria-hidden="true" style={{ height: H }}>{Array.from({ length: cols }, (_, i) => <i key={i} style={{ left: i * COLW, width: COLW }} />)}</div>
        <svg className="tl-links" width={W} height={H} aria-hidden="true">
          {links.map((l) => <path key={l.k} d={l.d} className={`${l.done ? 'done' : ''} ${l.on ? 'on' : ''}`} />)}
        </svg>
        {items.map((t) => { const q = at(t.id); return <Node key={t.id} t={t} x={q.x} y={q.y} />; })}
      </div>
    </section>
  );
}

/** Pásek s roky nad stromy (stejná šířka sloupců jako ve stromech). */
function YearBar() {
  const cols = maxYear - Y0 + 1;
  return <div className="tl-yearbar" style={{ width: cols * COLW }} aria-hidden="true">{Array.from({ length: cols }, (_, i) => <span key={i} style={{ width: COLW }}>{Y0 + i}</span>)}</div>;
}

/** Celoobrazovkové okno Výzkum (klávesa R): sloty nahoře, stromy oborů po sloupcích podle návaznosti. */
export function ResearchPanel() {
  const state = useGameSlow((s) => s, 600);
  const cat = useUi((s) => s.techCat);
  const me = playerIdx(state);
  const r = useMemo(() => (me ? researchOf(state, me) : null), [state.tech, state.tick, me]);
  const list = useMemo(() => (me ? techList(state, me) : []), [state.tech, state.tick, me]);
  if (!me) return <div className="prod-screen research-panel"><div className="prod-body"><p className="empty">Jako pozorovatel nevedete žádný výzkum.</p></div></div>;
  const lv = Object.entries(r.levels);
  const cats = cat === 'all' ? CAT_IDS : [cat];
  return (
    <div className="prod-screen research-panel" role="dialog" aria-label="Výzkum">
      <header className="prod-head">
        <h2><Icon name="research" size={22} />Výzkum</h2>
        <nav className="ind-tabs tech-cats" role="tablist" aria-label="Obory">
          <button role="tab" aria-selected={cat === 'all'} className={cat === 'all' ? 'on' : ''} onClick={() => setTechCat('all')}>Vše</button>
          {CAT_IDS.map((c) => <button key={c} role="tab" aria-selected={cat === c} className={cat === c ? 'on' : ''} onClick={() => setTechCat(c)}>{CATS[c].n}</button>)}
        </nav>
        <div className="rs-sum">
          <span className="stat-cell" title="Dny výzkumu za den (bez předstihu)"><i>Rychlost</i><b>{fmtNum(r.speed, 2)}×</b></span>
          <span className="stat-cell"><i>Hotovo</i><b>{r.done}/{r.total}</b></span>
          <span className="stat-cell" title="Úrovně výzbroje nad první"><i>Výzbroj</i><b>{lv.length ? lv.map(([e, n]) => `${LV_NAMES[e]} ${n}`).join(' · ') : 'základní'}</b></span>
        </div>
        <button className="icon-btn close" onClick={closeSide} aria-label="Zavřít okno" title="Zavřít (Esc)"><Icon name="close" size={20} /></button>
      </header>
      <section className="rs-head rs-slots" aria-label="Sloty výzkumu">
        {r.slots.map((s) => <Slot key={s.slot} s={s} />)}
      </section>
      <div className="prod-body tech-body">
        <YearBar />
        {cats.map((c) => <Tree key={c} cat={c} items={list.filter((t) => t.cat === c)} />)}
      </div>
    </div>
  );
}
