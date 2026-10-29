import { useMemo } from 'react';
import { useGameSlow, useUi } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { researchOf, techList, CATS, CAT_IDS, TECHS, EQUIP, fxLines, BATTALIONS, SUPPORT } from '../../engine/index.js';
import { playerIdx, closeSide, researchTech, stopResearch, setTechCat } from '../actions.js';
import { fmtDays, fmtNum } from '../format.js';

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
        <span className="muted">{s.eta < 0 ? '–' : `za ${fmtDays(s.eta)}`}{s.ahead > 0 ? ` · předstih ${fmtNum(s.ahead, 1)} r.` : ''}</span>
        <button className="icon-btn sm" onClick={() => stopResearch(s.slot)} aria-label={`Přerušit výzkum ${s.tech.n}`} title="Přerušit (postup se zachová)"><Icon name="close" size={14} /></button>
      </div>
      <span className="bar prog"><i style={{ width: `${(s.p * 100).toFixed(1)}%` }} /></span>
    </div>
  );
}

function TechCard({ t }) {
  const fx = fxLines(t.id).concat(unlocks(t.id).map((n) => `Odemyká: ${n}`));
  const can = t.status === 'available';
  return (
    <article className={`tech-card ${t.status}`} aria-label={t.n}>
      <header>
        <b>{t.n}</b>
        <span className="muted">{t.year} · {fmtDays(t.days)}</span>
      </header>
      {fx.length > 0 ? <ul className="tech-fx">{fx.map((x) => <li key={x}>{x}</li>)}</ul> : null}
      <p className="muted">{t.info}</p>
      <footer>
        <span className={`tech-st ${t.status}`}>{STATUS[t.status]}{t.status === 'active' ? ` ${pct(t.p)}` : ''}</span>
        {t.status === 'locked' ? <span className="muted">Chybí: {t.missing.map((r) => TECHS[r].n).join(', ')}</span> : null}
        {can ? (
          <>
            <span className="muted">{t.p > 0 ? `rozpracováno ${pct(t.p)} · ` : ''}{t.ahead > 0 ? `předstih ${fmtNum(t.ahead, 1)} r. · ` : ''}asi {fmtDays(t.eta)}</span>
            <button className="sbtn primary" onClick={() => researchTech(t.id)}>Zkoumat</button>
          </>
        ) : null}
      </footer>
    </article>
  );
}

const LV_NAMES = { pusky: 'Pušky', dela: 'Děla', pdela: 'PT děla', auta: 'Auta', vozy: 'Vozidla', ltanky: 'Lehké tanky', mtanky: 'Střední tanky', htanky: 'Těžké tanky', podpora: 'Podpora' };

/** Hloubka technologie ve stromu = nejdelší řetěz předpokladů (sloupec zleva doprava). */
function depthOf(id, memo = {}) {
  if (memo[id] !== undefined) return memo[id];
  const req = TECHS[id].req;
  return (memo[id] = req.length ? 1 + Math.max(...req.map((r) => depthOf(r, memo))) : 0);
}

/** Jeden obor jako strom: sloupce podle hloubky, ve sloupci technologie řazené podle roku. */
function Tree({ cat, items }) {
  const memo = {};
  const cols = [];
  for (const t of items) { const d = depthOf(t.id, memo); (cols[d] = cols[d] || []).push(t); }
  return (
    <section className="tech-tree" aria-label={CATS[cat].n}>
      <h3>{CATS[cat].n}</h3>
      <div className="tt-cols">
        {cols.map((c, i) => c && (
          <div className="tt-col" key={i}>
            {c.sort((a, b) => a.year - b.year || a.days - b.days).map((t) => <TechCard key={t.id} t={t} />)}
          </div>
        ))}
      </div>
    </section>
  );
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
        {cats.map((c) => <Tree key={c} cat={c} items={list.filter((t) => t.cat === c)} />)}
      </div>
    </div>
  );
}
