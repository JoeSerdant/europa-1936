import { useMemo, useState, useEffect } from 'react';
import { useGameSlow } from '../store.js';
import { Screen } from '../common/Screen.jsx';
import {
  DESIGN_TYPES, DESIGN_TYPE_IDS, DESIGN_CATS, MODULES, MODULE_IDS, SLOT_NAMES, DESIGN_STATS, designMult, designOf, fits, designBlock, designCost,
  isUnlocked, TECHS, DOC,
} from '../../engine/index.js';
import { playerIdx, applyDesign } from '../actions.js';

const pct = (v) => `${v >= 1 ? '+' : '−'}${Math.round(Math.abs(v - 1) * 100)} %`;
const SHOWN = { tank: ['atk', 'def', 'armor', 'speed', 'cost'], ship: ['atk', 'hp', 'cost'], plane: ['atk', 'cas', 'bomb', 'cost'] };

/** Řádek slotu: výběr modulu (zamčené moduly jsou vidět s technologií, která je odemkne). */
function Slot({ state, me, type, slot, value, onPick }) {
  const opts = MODULE_IDS.filter((id) => fits(type, slot, id));
  return (
    <label className="ds-slot">
      <span className="muted">{SLOT_NAMES[slot]}</span>
      <select value={value || ''} onChange={(e) => onPick(e.target.value || null)}>
        <option value="">Standardní</option>
        {opts.map((id) => {
          const mod = MODULES[id], lock = mod.unlock && !isUnlocked(state, me, mod.unlock);
          const fx = Object.entries(mod.fx).map(([k, v]) => `${DESIGN_STATS[k]} ${v > 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)} %`).join(', ');
          return <option key={id} value={id} disabled={lock}>{mod.n}{lock ? ` (chybí ${TECHS[mod.unlock].n})` : ''} – {fx}</option>;
        })}
      </select>
    </label>
  );
}

/** Okno Konstrukční kancelář (klávesa B, M97): návrhy variant tanků, lodí a letadel z modulů. */
export function DesignPanel() {
  const state = useGameSlow((s) => s, 700);
  const me = playerIdx(state);
  const [cat, setCat] = useState('tank');
  const [type, setType] = useState('ltanky');
  const lv = me ? state.mil.lv[me] : null;
  const cur = designOf(lv, type);
  const [draft, setDraft] = useState(() => ({ ...(cur ? cur.mods : {}) }));
  const [nm, setNm] = useState('');
  useEffect(() => { setDraft({ ...(cur ? cur.mods : {}) }); setNm(''); }, [type, cur]);
  const types = DESIGN_TYPE_IDS.filter((t) => DESIGN_TYPES[t].cat === cat);
  const now = designMult(cur), next = useMemo(() => designMult({ mods: draft }), [draft]);
  if (!me) return <div className="prod-screen design-panel"><div className="prod-body"><p className="empty">Jako pozorovatel nenavrhujete výzbroj.</p></div></div>;
  const t = DESIGN_TYPES[type], branch = DESIGN_CATS[t.cat].xp;
  const xp = Math.floor(state.doc.own[me].xp[branch]);
  const why = designBlock(state, me, type, draft);
  const cost = designCost(state, me, type, draft);
  return (
    <Screen cls="design-panel" title="Konstrukční kancelář" icon="edit" head={(
      <div className="lg-use">{Object.entries(DESIGN_CATS).map(([k, c]) => <span key={k}><i>{c.n}</i><b>{Math.floor(state.doc.own[me].xp[c.xp])}</b></span>)}</div>
    )}>
      <div className="prod-body prod-cols">
        <aside className="ds-list">
          <nav className="ind-tabs" role="tablist" aria-label="Druh výzbroje">
            {Object.entries(DESIGN_CATS).map(([k, c]) => <button key={k} role="tab" aria-selected={cat === k} className={cat === k ? 'on' : ''} onClick={() => { setCat(k); setType(DESIGN_TYPE_IDS.find((x) => DESIGN_TYPES[x].cat === k)); }}>{c.n}</button>)}
          </nav>
          <ul>
            {types.map((x) => { const d = designOf(lv, x); return (
              <li key={x}><button className={`ds-type ${x === type ? 'on' : ''}`} onClick={() => setType(x)}><b>{DESIGN_TYPES[x].n}</b><span className="muted">{d ? d.nm : 'standardní provedení'}</span></button></li>
            ); })}
          </ul>
        </aside>
        <section className="ds-edit" aria-label={`Návrh: ${t.n}`}>
          <div className="sec-head"><h3>{t.n}</h3><span className="muted">současný návrh: {cur ? cur.nm : 'standardní'}</span></div>
          <div className="ds-slots">
            {t.slots.map((slot) => <Slot key={slot} state={state} me={me} type={type} slot={slot} value={draft[slot]} onPick={(id) => setDraft({ ...draft, [slot]: id })} />)}
          </div>
          <table className="ds-stats">
            <thead><tr><th>Vlastnost</th><th>Současný</th><th>Nový</th></tr></thead>
            <tbody>{SHOWN[t.cat].map((k) => (
              <tr key={k} className={next[k] > now[k] ? (k === 'cost' ? 'worse' : 'better') : next[k] < now[k] ? (k === 'cost' ? 'better' : 'worse') : ''}>
                <td>{DESIGN_STATS[k]}</td><td>{pct(now[k])}</td><td>{pct(next[k])}</td>
              </tr>
            ))}</tbody>
          </table>
          <label className="ds-name"><span className="muted">Název návrhu</span><input value={nm} maxLength={30} placeholder={`${t.n} vz. ${Math.floor(1936 + state.tick / 8766)}`} onChange={(e) => setNm(e.target.value)} /></label>
          <p className="muted">Zavedení stojí {cost} zkušeností ({xp} k dispozici, strop {DOC.XP_MAX}). Linky vyrábějící tento typ se přezbrojí a ztratí část efektivity.</p>
          <button className="btn primary" disabled={!!why} title={why || 'Zavést návrh'} onClick={() => applyDesign(type, draft, nm)}><b>Zavést návrh</b>{why ? <span>{why}</span> : null}</button>
        </section>
      </div>
    </Screen>
  );
}
