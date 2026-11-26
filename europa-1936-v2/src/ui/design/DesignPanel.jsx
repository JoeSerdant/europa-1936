import { useMemo, useState, useEffect } from 'react';
import { useGameSlow } from '../store.js';
import { Screen } from '../common/Screen.jsx';
import {
  DESIGN_TYPES, DESIGN_TYPE_IDS, DESIGN_CATS, MODULES, MODULE_IDS, SLOT_NAMES, DESIGN_STATS, designMult, designOf, fits, designBlock, designCost,
  isUnlocked, TECHS, DOC, BUREAUS, BUREAU_IDS, BUREAU_CATS, BUREAU, bureausOf, bureauBlock,
} from '../../engine/index.js';
import { Icon } from '../common/Icon.jsx';
import { EquipIcon } from '../industry/EquipIcon.jsx';
import { playerIdx, applyDesign, hireOwnBureau } from '../actions.js';

const pct = (v) => `${v >= 1 ? '+' : '−'}${Math.round(Math.abs(v - 1) * 100)} %`;
const SHOWN = { tank: ['atk', 'def', 'armor', 'speed', 'cost'], ship: ['atk', 'hp', 'cost'], plane: ['atk', 'cas', 'bomb', 'cost'] };

/** S5a: konstrukční kanceláře – pro každý obor najatá kancelář s úrovní (tečky) a postupem, nabídka kanceláří jako dlaždice. */
function Bureaus({ state, me }) {
  const eff = (B, lv) => Object.entries(B.per).map(([k, v]) => `${DESIGN_STATS[k]} ${v * lv > 0 ? '+' : '−'}${Math.round(Math.abs(v * lv) * 100)} %`).join(', ');
  return (
    <section className="bu-grid" aria-label="Konstrukční kanceláře">
      {bureausOf(state, me).map((x) => {
        const C = BUREAU_CATS[x.cat], B = x.cur ? BUREAUS[x.cur.id] : null;
        return (
          <article key={x.cat} className="bu-card">
            <header><Icon name={C.icon} size={18} /><b>{C.n}</b></header>
            {B ? (
              <div className="bu-cur" title={`${B.info} Účinek teď: ${eff(B, x.cur.lv)}.`}>
                <b>{B.n}</b>
                <span className="st-pips">{Array.from({ length: BUREAU.MAX }, (_, i) => <i key={i} className={i < x.cur.lv ? 'on' : ''} />)}</span>
                {x.cur.lv < BUREAU.MAX ? <span className="deck-bar" title={`Zkušenosti z výroby: ${Math.floor(x.xp)} / ${x.need}`}><i style={{ width: `${Math.min(100, (100 * x.xp) / x.need)}%` }} /></span> : <span className="muted">nejvyšší úroveň</span>}
              </div>
            ) : <p className="muted">Žádná kancelář – výzbroj oboru bez bonusu.</p>}
            <div className="bu-opts">
              {BUREAU_IDS.filter((id) => BUREAUS[id].cat === x.cat && (!x.cur || x.cur.id !== id)).map((id) => {
                const why = bureauBlock(state, me, id);
                return (
                  <button key={id} className="bu-opt" disabled={!!why} onClick={() => hireOwnBureau(id)} title={why || `${BUREAUS[id].info} Na 1. úrovni: ${eff(BUREAUS[id], 1)}. Cena ${BUREAU.PP} PM${x.cur ? ' – současná kancelář i s úrovněmi skončí' : ''}.`}>
                    <b>{BUREAUS[id].n}</b><i>{BUREAU.PP} PM</i>
                  </button>
                );
              })}
            </div>
          </article>
        );
      })}
      <p className="muted bu-note">Kancelář sbírá zkušenosti z továren, které vyrábějí výzbroj jejího oboru, a s každou úrovní (až {BUREAU.MAX}) zesílí svůj účinek. U lodí se projeví až po přestavbě flotily.</p>
    </section>
  );
}

const SLOT_ICON = { zbran: 'attack', vyzbroj: 'attack', pancir: 'shield', ochrana: 'shield', motor: 'speed', pohon: 'speed', drak: 'plane', dopl: 'plus' };
const fxText = (mod) => Object.entries(mod.fx).map(([k, v]) => `${DESIGN_STATS[k]} ${v > 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)} %`).join(', ');

/** UI9: slot návrhu jako dlaždice (jako v návrháři HOI4) – ikona druhu slotu a zvolený modul; klik otevře moduly pod sloty. */
function Slot({ slot, value, open, onOpen }) {
  const mod = value ? MODULES[value] : null;
  return (
    <button className={`ds-slot ${open ? 'open' : ''} ${mod ? 'set' : ''}`} onClick={onOpen} aria-expanded={open} aria-label={`${SLOT_NAMES[slot]}: ${mod ? mod.n : 'standardní'}`} title={mod ? `${mod.n}: ${fxText(mod)}` : 'Standardní provedení'}>
      <span className="dsl-ic"><Icon name={SLOT_ICON[slot] || 'plus'} size={22} /></span>
      <i>{SLOT_NAMES[slot]}</i>
      <b>{mod ? mod.n : 'Standardní'}</b>
    </button>
  );
}

/** Moduly pro otevřený slot jako dlaždice (zamčené ukazují technologii, která je odemkne). */
function ModulePicker({ state, me, type, slot, value, onPick }) {
  const opts = MODULE_IDS.filter((id) => fits(type, slot, id));
  return (
    <div className="ds-mods" role="radiogroup" aria-label={`Moduly: ${SLOT_NAMES[slot]}`}>
      <button role="radio" aria-checked={!value} className={`ds-mod ${!value ? 'on' : ''}`} onClick={() => onPick(null)}><b>Standardní</b><span>bez změn</span></button>
      {opts.map((id) => {
        const mod = MODULES[id], lock = mod.unlock && !isUnlocked(state, me, mod.unlock);
        return (
          <button key={id} role="radio" aria-checked={value === id} data-id={id} className={`ds-mod ${value === id ? 'on' : ''}`} disabled={lock} onClick={() => onPick(id)} title={lock ? `Chybí technologie ${TECHS[mod.unlock].n}` : fxText(mod)}>
            <b>{mod.n}</b><span>{fxText(mod)}</span>{lock ? <em>chybí {TECHS[mod.unlock].n}</em> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Srovnání vlastností jako dvojice pruhů (současný / nový), lepší zeleně, horší červeně. */
function StatBars({ keys, now, next }) {
  const max = Math.max(1.5, ...keys.map((k) => Math.max(now[k], next[k])));
  return (
    <div className="ds-bars">
      {keys.map((k) => {
        const better = k === 'cost' ? next[k] < now[k] : next[k] > now[k], worse = k === 'cost' ? next[k] > now[k] : next[k] < now[k];
        return (
          <div key={k} className={`dsb ${better ? 'better' : worse ? 'worse' : ''}`}>
            <span className="dsb-n">{DESIGN_STATS[k]}</span>
            <span className="dsb-bars"><i className="now" style={{ width: `${(now[k] / max) * 100}%` }} /><i className="next" style={{ width: `${(next[k] / max) * 100}%` }} /></span>
            <span className="dsb-v">{pct(now[k])} → <b>{pct(next[k])}</b></span>
          </div>
        );
      })}
    </div>
  );
}

/** Okno Konstrukční kancelář (klávesa B, M97; UI9 jako návrhář HOI4): silueta, sloty modulů jako dlaždice, moduly jako dlaždice, srovnání pruhy. */
export function DesignPanel() {
  const state = useGameSlow((s) => s, 700);
  const me = playerIdx(state);
  const [cat, setCat] = useState('tank');
  const [type, setType] = useState('ltanky');
  const lv = me ? state.mil.lv[me] : null;
  const cur = designOf(lv, type);
  const [draft, setDraft] = useState(() => ({ ...(cur ? cur.mods : {}) }));
  const [nm, setNm] = useState('');
  const [slotOpen, setSlotOpen] = useState('');
  useEffect(() => { setDraft({ ...(cur ? cur.mods : {}) }); setNm(''); setSlotOpen(''); }, [type, cur]);
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
            <button role="tab" aria-selected={cat === 'bu'} className={cat === 'bu' ? 'on' : ''} onClick={() => setCat('bu')}>Kanceláře</button>
          </nav>
          <ul>
            {types.map((x) => { const d = designOf(lv, x); return (
              <li key={x}><button className={`ds-type ${x === type ? 'on' : ''}`} onClick={() => setType(x)}><b>{DESIGN_TYPES[x].n}</b><span className="muted">{d ? d.nm : 'standardní provedení'}</span></button></li>
            ); })}
          </ul>
        </aside>
        {cat === 'bu' ? <Bureaus state={state} me={me} /> : (
        <section className="ds-edit" aria-label={`Návrh: ${t.n}`}>
          <div className="sec-head"><h3>{t.n}</h3><span className="muted">současný návrh: {cur ? cur.nm : 'standardní'}</span></div>
          <div className="ds-stage">
            <span className="ds-pic" aria-hidden="true"><EquipIcon eq={type} size={190} /></span>
            <div className="ds-slots">
              {t.slots.map((slot) => <Slot key={slot} slot={slot} value={draft[slot]} open={slotOpen === slot} onOpen={() => setSlotOpen(slotOpen === slot ? '' : slot)} />)}
            </div>
          </div>
          {slotOpen ? <ModulePicker state={state} me={me} type={type} slot={slotOpen} value={draft[slotOpen]} onPick={(id) => setDraft({ ...draft, [slotOpen]: id })} /> : <p className="muted">Klikněte na slot a vyberte modul.</p>}
          <StatBars keys={SHOWN[t.cat]} now={now} next={next} />
          <label className="ds-name"><span className="muted">Název návrhu</span><input value={nm} maxLength={30} placeholder={`${t.n} vz. ${Math.floor(1936 + state.tick / 8766)}`} onChange={(e) => setNm(e.target.value)} /></label>
          <p className="muted">Zavedení stojí {cost} zkušeností ({xp} k dispozici, strop {DOC.XP_MAX}). Linky vyrábějící tento typ se přezbrojí a ztratí část efektivity.</p>
          <button className="btn primary" disabled={!!why} title={why || 'Zavést návrh'} onClick={() => applyDesign(type, draft, nm)}><b>Zavést návrh</b>{why ? <span>{why}</span> : null}</button>
        </section>)}
      </div>
    </Screen>
  );
}
